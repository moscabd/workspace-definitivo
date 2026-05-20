// ══════════════════════════════════════════
//  SUPABASE CONFIG — preencha após criar o projeto
// ══════════════════════════════════════════
const SUPABASE_URL = 'https://dpuqurchrhmibkzmskdr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdXF1cmNocmhtaWJrem1za2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTM4NTcsImV4cCI6MjA5MTIyOTg1N30.we9ui-K1_cXXD5UYYjtrc-Hrr1U2qKQwaO1qgUF-WX4'
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)
let currentUser = null
const cache = {}
const APP_VERSION = '1.4.9'

const syncInProgress = {}
let realtimeChannel = null

const tableMappers = {
  habitos: r=>({id:r.id,user_id:currentUser.id,nome:r.nome,tipo:r.tipo,duracao:r.duracao,hora:r.hora,dias:r.dias||[0,1,2,3,4,5,6],done:r.done||[],created_at:r.createdAt}),
  tarefas: r=>({id:r.id,user_id:currentUser.id,nome:r.nome,prio:r.prio,prazo:r.prazo||null,done:r.done||false,is_daily:r.is_daily||false,seq:r.seq||0,created_at:r.createdAt}),
  compras: r=>({id:r.id,user_id:currentUser.id,nome:r.nome,cat:r.cat,bought:r.bought||false}),
  financas: r=>({id:r.id,user_id:currentUser.id,descricao:r.desc,val:r.val,tipo:r.tipo,cat:r.cat,date:r.date,status:r.status||'pago'}),
  projetos: r=>({
    id:r.id,
    user_id:currentUser.id,
    nome:r.nome,
    descricao:r.desc||'',
    cat:r.cat,
    pct:r.pct||0,
    notas:r.notas||'',
    rascunhos:r.rascunhos||'',
    plano:r.plano||'',
    todo:r.todo||[],
    created_at:r.createdAt
  }),
  brain: r=>({id:r.id,user_id:currentUser.id,texto:r.texto,tag:r.tag,date:r.date}),
}

async function syncTable(key,data){
  if(!currentUser||!tableMappers[key])return
  syncInProgress[key]=true
  try{
    const { data: existing, error: fetchError } = await db.from(key).select('id').eq('user_id',currentUser.id)
    if(fetchError){ console.error('Sync fetch['+key+']',fetchError); syncInProgress[key]=false; return }

    const existingIds = new Set((existing||[]).map(r=>r.id))
    const cacheIds = new Set(data.map(r=>r.id))

    if(existingIds.size>0 && cacheIds.size===0){
      console.warn('Sync safety['+key+']: cache is empty but server has '+existingIds.size+' items. Skipping deletion.')
      syncInProgress[key]=false
      return
    }

    const toDelete = [...existingIds].filter(id=>!cacheIds.has(id))
    if(toDelete.length>0){
      const {error:delErr}=await db.from(key).delete().in('id',toDelete).eq('user_id',currentUser.id)
      if(delErr) console.error('Sync del['+key+']',delErr)
    }

    if(data.length>0){
      const {error}=await db.from(key).upsert(data.map(tableMappers[key]))
      if(error) console.error('Sync upsert['+key+']',error)
    }
  }catch(e){
    console.error('Sync error',e);
    showToast('Erro ao sincronizar '+key+': '+e.message,'error')
  } finally {
    syncInProgress[key]=false
  }
}

// ══════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ══════════════════════════════════════════
function showToast(msg, type='success', duration=3500){
  let container = document.getElementById('toast-container')
  if(!container){
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  const icons = {success:'✓',error:'<i data-lucide="x" style="width:14px;height:14px"></i>',info:'ℹ'}
  toast.innerHTML = `<span class="toast-icon">${icons[type]||icons.info}</span><span class="toast-msg">${msg}</span>`
  container.appendChild(toast)
  requestAnimationFrame(()=>toast.classList.add('visible'))
  setTimeout(()=>{
    toast.classList.remove('visible')
    setTimeout(()=>toast.remove(), 400)
  }, duration)
}

function showConfirm(msg){
  return new Promise(resolve=>{
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay open'
    overlay.innerHTML = `<div class="modal" style="max-width:420px;text-align:center">
      <div style="font-size:32px;margin-bottom:12px">⚠️</div>
      <div style="font-size:16px;color:var(--text2);line-height:1.6;margin-bottom:20px">${msg}</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="wd-btn btn-ghost" id="conf-no">Cancelar</button>
        <button class="wd-btn btn-primary" id="conf-yes">Confirmar</button>
      </div>
    </div>`
    document.body.appendChild(overlay)
    overlay.querySelector('#conf-yes').onclick = ()=>{ overlay.remove(); resolve(true) }
    overlay.querySelector('#conf-no').onclick  = ()=>{ overlay.remove(); resolve(false) }
    overlay.onclick = e=>{ if(e.target===overlay){ overlay.remove(); resolve(false) } }
  })
}

// ══════════════════════════════════════════
//  STORAGE (cache + Supabase)
// ══════════════════════════════════════════
const S = {
  get(k){return cache[k]||[]},
  async set(k,v){
    cache[k]=v;
    if(k==='vault_conf' || k==='senhas_enc'){
      localStorage.setItem('wd_local_'+k, JSON.stringify(v));
      return;
    }
    await syncTable(k,v);
  },
  getSingle(k,d){
    if(k==='vault_conf' || k==='senhas_enc'){
      try{ return JSON.parse(localStorage.getItem('wd_local_'+k))||d; }catch{ return d; }
    }
    return cache[k]!==undefined?cache[k]:d;
  }
}

// ══════════════════════════════════════════
//  USER
// ══════════════════════════════════════════
function showUserInfo(){
  const meta=currentUser.user_metadata||{}
  const name=(meta.full_name||meta.name||currentUser.email||'').split(' ')[0]
  const avatar=meta.avatar_url||meta.picture||''
  const nameEl=document.getElementById('userName')
  const avatarEl=document.getElementById('userAvatar')
  if(nameEl)nameEl.textContent=name
  if(avatarEl&&avatar){avatarEl.src=avatar;avatarEl.style.display='block'}
}

async function logout(){
  await db.auth.signOut()
  window.location.href='/'
}

// ══════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════
const pageNames = {
  dashboard:'Painel Geral',habitos:'Hábitos',tarefas:'Tarefas',
  compras:'Lista de Compras',financas:'Finanças',projetos:'Projetos',
  cerebro:'Segundo Cérebro',senhas:'Cofre de Senhas',agenda:'Google Agenda',
  historico:'Histórico & Evolução'
}
function nav(page, el, mode){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'))
  document.getElementById('page-'+page).classList.add('active')
  document.getElementById('pageTitle').textContent = pageNames[page]||page

  if(mode==='mob'){
    document.querySelectorAll('.mob-nav-item').forEach(i=>i.classList.remove('active'))
  } else {
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'))
  }
  if(el) el.classList.add('active')

  renderPage(page)
}

function renderPage(p){
  if(p==='dashboard') renderDashboard()
  else if(p==='habitos') renderHabitos()
  else if(p==='tarefas') renderTarefas()
  else if(p==='compras') renderCompras()
  else if(p==='financas') renderFinancas()
  else if(p==='projetos') renderProjetos()
  else if(p==='cerebro') renderCerebro()
  else if(p==='senhas') renderSenhas()
  else if(p==='historico') renderHistorico()
}

// ══════════════════════════════════════════
//  BACKUP TOTAL
// ══════════════════════════════════════════
function exportAllData() {
  const data = {
    habitos: S.get('habitos'),
    tarefas: S.get('tarefas'),
    compras: S.get('compras'),
    financas: S.get('financas'),
    projetos: S.get('projetos'),
    brain: S.get('brain'),
    vault_conf: S.getSingle('vault_conf', null),
    senhas_enc: S.getSingle('senhas_enc', null),
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `workspace_backup_${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup gerado! Guarde o arquivo em local seguro.','success')
}

function importAllData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      // Validação básica
      const requiredKeys = ['habitos', 'tarefas', 'projetos'];
      const hasKeys = requiredKeys.every(k => k in data);
      
      if (!hasKeys) {
        showToast('Arquivo inválido! Não parece ser um backup do Workspace.','error')
        return;
      }

      const confirmImport = await showConfirm('⚠️ ATENÇÃO: Importar este backup irá SOBRESCREVER todos os seus dados atuais. Deseja continuar?')
      
      if (confirmImport) {
        // Itera sobre as chaves e restaura
        for (const key in data) {
          if (['exportedAt'].includes(key)) continue;
          
          if (data[key] !== undefined) {
             console.log(`Restaurando módulo: ${key}...`);
             await S.set(key, data[key]);
          }
        }
        
        showToast('🎉 Backup restaurado! O sistema será recarregado.','success',2000)
        setTimeout(()=>window.location.reload(), 2000)
      }
    } catch (err) {
      console.error('Erro na importação:', err);
      showToast('Erro ao processar o backup. Verifique o console.','error')
    } finally {
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

// ══════════════════════════════════════════
//  DATE
// ══════════════════════════════════════════
function initDate(){
  const d = new Date()
  const ds = d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'short',year:'numeric'})
  document.getElementById('topDate').textContent = ds
}
function today(){return new Date().toISOString().split('T')[0]}

// ══════════════════════════════════════════
//  HÁBITOS
// ══════════════════════════════════════════
function openHabitModal(id = null){
  const nomeEl = document.getElementById('bh-nome')
  const durEl = document.getElementById('bh-duracao')
  const horaEl = document.getElementById('bh-hora')
  const tipoEl = document.getElementById('bh-tipo')
  const idEl = document.getElementById('bh-id')
  const btnEl = document.getElementById('mh-btn')
  const titleEl = document.getElementById('mh-title')
  
  document.querySelectorAll('.wp-day').forEach(d=>d.classList.remove('active'))
  
  if(id){
    const h = S.get('habitos').find(x=>x.id==id)
    if(h){
      titleEl.textContent = 'Editar Hábito'
      btnEl.textContent = 'Salvar Alterações'
      idEl.value = h.id
      nomeEl.value = h.nome || ''
      durEl.value = h.duracao || ''
      horaEl.value = h.hora || ''
      tipoEl.value = h.tipo || 'rec'
      
      const dias = h.dias || [0,1,2,3,4,5,6]
      document.querySelectorAll('.wp-day').forEach(d=>{
        if(dias.includes(parseInt(d.dataset.val))) d.classList.add('active')
      })
    }
  } else {
    titleEl.textContent = 'Novo Hábito'
    btnEl.textContent = 'Criar Hábito'
    idEl.value = ''
    nomeEl.value = ''
    durEl.value = ''
    horaEl.value = ''
    tipoEl.value = 'rec'
    document.querySelectorAll('.wp-day').forEach(d=>d.classList.add('active'))
  }
  
  document.getElementById('bh-dias-wrap').style.display = tipoEl.value==='rec'?'block':'none'
  openModal('modal-habito')
}

function saveHabito(){
  const idVal = document.getElementById('bh-id').value
  const nome = cleanInput(document.getElementById('bh-nome').value, 100)
  const duracao = cleanInput(document.getElementById('bh-duracao').value, 50)
  const hora = document.getElementById('bh-hora').value
  const tipo = document.getElementById('bh-tipo').value
  const dias = []
  if(tipo==='rec'){
    document.querySelectorAll('.wp-day.active').forEach(el=>dias.push(parseInt(el.dataset.val)))
  }
  
  if(!nome) return
  const list = S.get('habitos')
  
  if(idVal){
    // Update
    const h = list.find(x=>x.id == idVal)
    if(h){
      h.nome = nome
      h.duracao = duracao
      h.hora = hora
      h.tipo = tipo
      h.dias = dias
    }
  } else {
    // Add
    list.push({id:Date.now(),nome,tipo,duracao,hora,dias,done:[],createdAt:today()})
  }
  
  S.set('habitos',list)
  closeModal('modal-habito')
  
  renderHabitos()
  updateStats()
}

function toggleHabito(id){
  const list = S.get('habitos')
  const h = list.find(x=>x.id==id)
  if(!h) return
  const t = today()
  if(h.done.includes(t)) h.done = h.done.filter(d=>d!==t)
  else h.done.push(t)
  S.set('habitos',list)
  renderHabitos()
  renderDashboard()
  updateStats()
}

function deleteHabito(id){
  S.set('habitos',S.get('habitos').filter(h=>h.id!=id))
  renderHabitos()
  updateStats()
}

function renderHabitos(){
  const list = S.get('habitos')
  const t = today()
  const rec = list.filter(h=>h.tipo==='rec')
  const occ = list.filter(h=>h.tipo==='occ')

  function getMiniStreakHTML(h){
    if(h.tipo==='occ') return ''
    const diasSet = new Set(h.dias||[0,1,2,3,4,5,6])
    const today_d = new Date()
    let h_html = '<div class="hb-mini-streak">'
    let expected = 0; let done = 0;
    for(let i=6;i>=0;i--){
      const dd = new Date(today_d); dd.setDate(dd.getDate()-i)
      const ds = dd.toISOString().split('T')[0]
      const dNum = dd.getDay()
      if(!diasSet.has(dNum)) {
        h_html+=`<div class="hmini-dot skip" title="${ds}">·</div>`
      } else {
        expected++
        const d_done = h.done.includes(ds)
        if(d_done) done++
        h_html+=`<div class="hmini-dot ${d_done?'ok':'miss'}" title="${ds}"></div>`
      }
    }
    h_html+='</div>'
    h_html+=`<div style="font-size:12px;color:var(--text3);margin-left:6px">${done}/${expected} essa semana</div>`
    return `<div class="hb-stats">${h_html}</div>`
  }

  function calcStreak(h){
    if(h.tipo==='occ') return 0
    const diasSet = new Set(h.dias||[0,1,2,3,4,5,6])
    let streak = 0
    const now = new Date()
    for(let i=0;i<365;i++){
      const dd = new Date(now); dd.setDate(dd.getDate()-i)
      if(!diasSet.has(dd.getDay())) continue
      const ds = dd.toISOString().split('T')[0]
      if(h.done.includes(ds)) streak++
      else break
    }
    return streak
  }

  function makeItem(h){
    const done = h.done.includes(t)
    const streak = calcStreak(h)
    return `<div class="card" style="margin-bottom:14px;display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="hcheck ${done?'done':''}" onclick="toggleHabito(${h.id})"></div>
          <div>
            <div class="habit-name ${done?'done':''}" style="font-size:16px">${h.nome}</div>
            ${h.hora?`<div style="font-size:13px;color:var(--text3);margin-top:2px">⏰ ${h.hora}</div>`:''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${streak>1?`<span class="streak-badge"><i data-lucide="flame" style="width:14px;height:14px;color:var(--warning)"></i> ${streak}</span>`:''}
          ${h.duracao?`<span class="hb-dur">${h.duracao}</span>`:''}
          <button class="wd-btn btn-ghost btn-sm" onclick="openHabitModal(${h.id})">Editar</button>
          <button class="wd-btn btn-danger btn-sm" onclick="deleteHabito(${h.id})"><i data-lucide="x" style="width:14px;height:14px"></i></button>
        </div>
      </div>
      ${h.tipo==='rec'?getMiniStreakHTML(h):''}
    </div>`
  }

  const recEl = document.getElementById('hb-rec-list')
  const occEl = document.getElementById('hb-occ-list')
  if(recEl) recEl.innerHTML = rec.length ? rec.map(makeItem).join('') : '<div class="empty">Nenhum hábito recorrente ainda</div>'
  if(occEl) occEl.innerHTML = occ.length ? occ.map(makeItem).join('') : '<div class="empty">Nenhum hábito ocasional ainda</div>'

  // streak
  const days = ['D','S','T','Q','Q','S','S']
  const today_d = new Date()
  let streak = ''
  for(let i=6;i>=0;i--){
    const dd = new Date(today_d); dd.setDate(dd.getDate()-i)
    const ds = dd.toISOString().split('T')[0]
    const dayName = days[dd.getDay()]
    const isToday = i===0
    
    let expectedH = 0
    let doneH = 0
    list.forEach(h=>{
      if(h.tipo==='rec'){
        if((h.dias||[0,1,2,3,4,5,6]).includes(dd.getDay())){ expectedH++; if(h.done.includes(ds)) doneH++ }
      }
    })
    
    let isOk = false
    if(expectedH>0 && doneH===expectedH) isOk = true
    if(expectedH===0 && list.some(h=>h.tipo==='occ' && h.done.includes(ds))) isOk = true

    const cls = isToday?'sd-today':isOk?'sd-ok':'sd-no'
    streak+=`<div class="sday ${cls}" title="${ds}">${dayName}</div>`
  }
  const sEl = document.getElementById('streak-full')
  if(sEl) sEl.innerHTML = streak
}

function markAllHabitos(){
  const list = S.get('habitos')
  const t = today()
  const dHoje = new Date().getDay()
  let count = 0
  list.forEach(h=>{
    if(h.tipo==='rec' && (h.dias||[0,1,2,3,4,5,6]).includes(dHoje) && !h.done.includes(t)){
      h.done.push(t)
      count++
    }
  })
  if(count===0){ showToast('Todos os hábitos de hoje já foram marcados!','info'); return }
  S.set('habitos',list)
  renderHabitos()
  renderDashboard()
  updateStats()
  showToast(`✅ ${count} hábito${count>1?'s':''} marcado${count>1?'s':''}!`,'success')
}

// ══════════════════════════════════════════
//  TAREFAS
// ══════════════════════════════════════════
const prioColors = {alta:'var(--accent4)',media:'var(--accent3)',baixa:'var(--accent2)'}

function addTarefa(){
  const nome = document.getElementById('tk-input').value.trim()
  const prio = document.getElementById('tk-prio').value
  const prazo = document.getElementById('tk-prazo').value
  const is_daily = document.getElementById('tk-is-daily').checked
  if(!nome) return
  const list = S.get('tarefas')
  
  let seq = 0
  if(is_daily){
    const daily = list.filter(t => t.is_daily && !t.done)
    seq = daily.length ? Math.max(...daily.map(t => t.seq || 0)) + 1 : 1
  }

  list.push({id:Date.now(),nome,prio,prazo,done:false,is_daily,seq,createdAt:today()})
  S.set('tarefas',list)
  
  document.getElementById('tk-input').value=''
  document.getElementById('tk-prazo').value=''
  document.getElementById('tk-is-daily').checked = false
  
  renderTarefas()
  updateStats()
}

function toggleTarefa(id){
  const list = S.get('tarefas')
  const t = list.find(x=>x.id==id)
  if(t) t.done = !t.done
  S.set('tarefas',list)
  renderTarefas()
  renderDashboard()
  updateStats()
}

function deleteTarefa(id){
  S.set('tarefas',S.get('tarefas').filter(t=>t.id!=id))
  renderTarefas()
  updateStats()
}

function toggleDailyTask(id){
  let list = S.get('tarefas')
  const t = list.find(x=>x.id==id)
  if(!t) return
  
  t.is_daily = !t.is_daily
  
  if(t.is_daily){
    const daily = list.filter(x => x.is_daily && !x.done)
    t.seq = daily.length ? Math.max(...daily.map(x => x.seq || 0)) + 1 : 1
  } else {
    t.seq = 0
  }
  
  S.set('tarefas', list)
  renderTarefas()
}

function reorderTarefa(id, direction){
  let list = S.get('tarefas')
  const daily = list.filter(t => t.is_daily && !t.done).sort((a,b) => a.seq - b.seq)
  const idx = daily.findIndex(t => t.id == id)
  if(idx === -1) return
  
  if(direction === 'up' && idx > 0){
    const current = daily[idx]
    const prev = daily[idx-1]
    const temp = current.seq
    current.seq = prev.seq
    prev.seq = temp
  } else if(direction === 'down' && idx < daily.length - 1){
    const current = daily[idx]
    const next = daily[idx+1]
    const temp = current.seq
    current.seq = next.seq
    next.seq = temp
  }
  
  S.set('tarefas', list)
  renderTarefas()
}

function renderTarefas(){
  const list = S.get('tarefas')
  
  const dailyPend = list.filter(t => !t.done && t.is_daily).sort((a,b) => a.seq - b.seq)
  const laterPend = list.filter(t => !t.done && !t.is_daily).sort((a,b) => (a.prazo||'9999') > (b.prazo||'9999') ? 1 : -1)
  const done = list.filter(t=>t.done)

  function makeItem(t, isDaily = false){
    const prazoStr = t.prazo ? formatDate(t.prazo, true) : ''
    const prazoClass = t.prazo && !t.done ? getPrazoClass(t.prazo) : ''
    return `<div class="task-item">
      <div class="task-check ${t.done?'done':''}" onclick="toggleTarefa(${t.id})"></div>
      <div class="task-prio" style="background:${prioColors[t.prio]}"></div>
      <div class="task-body">
        <div class="task-name ${t.done?'done':''}" onclick="startInlineEdit(${t.id}, this)" title="Clique para editar">${t.nome}</div>
        <div class="task-meta">${t.prio}${prazoStr ? ' · <span class="'+prazoClass+'">'+prazoStr+'</span>' : ''}</div>
      </div>
      <div style="display:flex; gap:4px">
        ${!t.done ? `
          <button class="wd-btn btn-ghost btn-sm" onclick="toggleDailyTask(${t.id})" title="${t.is_daily?'Mover para Depois':'Mover para Hoje'}">
            ${t.is_daily?'📦':'⭐'}
          </button>
        ` : ''}
        ${isDaily && !t.done ? `
          <div class="tk-order-btns">
            <button class="btn-order" onclick="reorderTarefa(${t.id}, 'up')">▲</button>
            <button class="btn-order" onclick="reorderTarefa(${t.id}, 'down')">▼</button>
          </div>
        ` : ''}
        <button class="wd-btn btn-danger btn-sm" onclick="deleteTarefa(${t.id})"><i data-lucide="x" style="width:14px;height:14px"></i></button>
      </div>
    </div>`
  }

  const dailyEl = document.getElementById('tk-daily-list')
  const laterEl = document.getElementById('tk-list')
  const doneEl = document.getElementById('tk-done-list')
  
  if(dailyEl) dailyEl.innerHTML = dailyPend.length ? dailyPend.map(t => makeItem(t, true)).join('') : '<div class="empty">Nenhum foco definido para hoje 🎯</div>'
  if(laterEl) laterEl.innerHTML = laterPend.length ? laterPend.map(t => makeItem(t, false)).join('') : '<div class="empty">Nenhuma tarefa para depois</div>'
  if(doneEl) doneEl.innerHTML = done.length ? done.map(t => makeItem(t, false)).join('') : '<div class="empty">Nenhuma concluída ainda</div>'
  
  // Esconde/mostra cards se vazios (opcional)
  const dailyCard = document.getElementById('tk-daily-card')
  if(dailyCard) dailyCard.style.display = dailyPend.length ? 'block' : 'none'
}

function formatDate(d, relative=false){
  if(!d) return ''
  if(relative){
    const today = new Date(); today.setHours(0,0,0,0)
    const [y,m,dd] = d.split('-').map(Number)
    const target = new Date(y, m-1, dd)
    const diff = Math.round((target - today) / 86400000)
    if(diff === 0) return '<i data-lucide="flame" style="width:14px;height:14px;color:var(--warning)"></i> Hoje'
    if(diff === 1) return '⚡ Amanhã'
    if(diff === -1) return '⚠️ Ontem'
    if(diff < -1) return `🔴 Atrasada ${Math.abs(diff)}d`
    if(diff <= 7) return `📅 ${diff} dias`
  }
  const [y,m,dd] = d.split('-')
  return `${dd}/${m}/${y}`
}

function getPrazoClass(prazo){
  const today = new Date(); today.setHours(0,0,0,0)
  const [y,m,d] = prazo.split('-').map(Number)
  const target = new Date(y, m-1, d)
  const diff = Math.round((target - today) / 86400000)
  if(diff < 0) return 'prazo-late'
  if(diff === 0) return 'prazo-today'
  if(diff <= 2) return 'prazo-soon'
  return ''
}

function startInlineEdit(id, el){
  if(el.querySelector('input')) return
  const currentText = el.textContent.trim()
  const safe = currentText.replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  el.innerHTML = `<input class="inline-edit-input" value="${safe}" onblur="saveInlineEdit(${id}, this)" onkeydown="if(event.key==='Enter')this.blur();if(event.key==='Escape'){renderTarefas()}">`
  el.querySelector('input').focus()
  el.querySelector('input').select()
}

function saveInlineEdit(id, input){
  const newName = input.value.trim()
  if(!newName){ renderTarefas(); return }
  const list = S.get('tarefas')
  const t = list.find(x=>x.id==id)
  if(t && newName !== t.nome){
    t.nome = newName
    S.set('tarefas', list)
    showToast('Tarefa atualizada ✓','success',2000)
  }
  renderTarefas()
}

// ══════════════════════════════════════════
//  COMPRAS
// ══════════════════════════════════════════
const cpColors = {trabalho:'var(--accent)',pessoal:'var(--accent2)',casa:'var(--accent3)',roupa:'#e879f9',mercado:'var(--accent5)',outro:'var(--text2)'}

function addCompra(){
  const nome = document.getElementById('cp-input').value.trim()
  const cat = document.getElementById('cp-cat').value
  if(!nome) return
  const list = S.get('compras')
  list.push({id:Date.now(),nome,cat,bought:false})
  S.set('compras',list)
  document.getElementById('cp-input').value=''
  renderCompras()
}

function toggleCompra(id){
  const list = S.get('compras')
  const c = list.find(x=>x.id==id)
  if(c) c.bought = !c.bought
  S.set('compras',list)
  renderCompras()
}

function deleteCompra(id){
  S.set('compras',S.get('compras').filter(c=>c.id!=id))
  renderCompras()
}

function renderCompras(){
  const list = S.get('compras')
  const trab = list.filter(c=>c.cat==='trabalho')
  const outros = list.filter(c=>c.cat!=='trabalho')
  function makeTag(c){
    return `<div class="shop-tag ${c.bought?'bought':''}" onclick="toggleCompra(${c.id})">
      <div class="shop-dot" style="background:${cpColors[c.cat]||'var(--text2)'}"></div>
      <div style="flex:1">${c.nome}</div>
      <div onclick="event.stopPropagation();deleteCompra(${c.id})" style="padding:4px 8px;color:var(--text3);font-size:16px;cursor:pointer"><i data-lucide="x" style="width:14px;height:14px"></i></div>
    </div>`
  }

  const tEl = document.getElementById('cp-trabalho')
  const pEl = document.getElementById('cp-pessoal')
  if(tEl) tEl.innerHTML = trab.length ? trab.map(makeTag).join('') : '<div class="empty">Nenhuma ferramenta na lista</div>'
  if(pEl) pEl.innerHTML = outros.length ? outros.map(makeTag).join('') : '<div class="empty">Nenhum item pessoal na lista</div>'
}

// ══════════════════════════════════════════
//  FINANÇAS
// ══════════════════════════════════════════
const catColors = {
  'trabalho':['rgba(37,99,235,.12)','var(--primary-light)'],
  'despesa-fixa':['rgba(239,68,68,.1)','#fca5a5'],
  'lazer':['rgba(59,130,246,.1)','#93c5fd'],
  'alimentacao':['rgba(245,158,11,.1)','var(--warning)'],
  'saude':['rgba(16,185,129,.1)','var(--success)'],
  'investimento':['rgba(6,182,212,.1)','var(--info)'],
  'outro':['rgba(255,255,255,.05)','var(--text2)']
}

let fnPeriod = 'mes' // 'hoje' | 'semana' | 'mes' | 'tudo'

function setFnPeriod(p){
  fnPeriod = p
  document.querySelectorAll('.fn-period-btn').forEach(b=>b.classList.toggle('active', b.dataset.period===p))
  renderFinancas()
}

function filterByPeriod(list){
  const now = new Date(); now.setHours(0,0,0,0)
  if(fnPeriod==='tudo') return list
  return list.filter(f=>{
    if(!f.date) return true
    const [y,m,d] = f.date.split('-').map(Number)
    const fd = new Date(y,m-1,d)
    if(fnPeriod==='hoje') return fd.getTime()===now.getTime()
    if(fnPeriod==='semana'){
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate()-6)
      return fd>=weekAgo
    }
    if(fnPeriod==='mes'){
      return fd.getMonth()===now.getMonth() && fd.getFullYear()===now.getFullYear()
    }
    if(fnPeriod==='ano'){
      return fd.getFullYear()===now.getFullYear()
    }
    if(fnPeriod==='ano'){
      return fd.getFullYear()===now.getFullYear()
    }
    return true
  })
}

function addFinanca(){
  const desc = document.getElementById('fn-desc').value.trim()
  const val = parseFloat(document.getElementById('fn-val').value)
  const tipo = document.getElementById('fn-tipo').value
  const cat = document.getElementById('fn-cat').value
  const status = document.getElementById('fn-status') ? document.getElementById('fn-status').value : 'pago'
  if(!desc || isNaN(val) || val<=0) return
  const list = S.get('financas')
  list.push({id:Date.now(),desc,val,tipo,cat,date:today(),status})
  S.set('financas',list)
  document.getElementById('fn-desc').value=''
  document.getElementById('fn-val').value=''
  renderFinancas()
  updateStats()
}

function toggleFinancaStatus(id){
  const list = S.get('financas')
  const f = list.find(x=>x.id==id)
  if(f){
    f.status = f.status === 'pendente' ? 'pago' : 'pendente'
    S.set('financas',list)
    renderFinancas()
    if(typeof updateStats === 'function') updateStats()
    if(typeof renderDashboard === 'function') renderDashboard()
  }
}

function deleteFinanca(id){
  S.set('financas',S.get('financas').filter(f=>f.id!=id))
  renderFinancas()
  updateStats()
}

// ---- Poupança ----
function getPoupancaValor() {
  if (typeof currentUser !== 'undefined' && currentUser && currentUser.user_metadata && currentUser.user_metadata.wd_poupanca !== undefined) {
    return parseFloat(currentUser.user_metadata.wd_poupanca);
  }
  return parseFloat(localStorage.getItem('wd_poupanca')||'0');
}

function togglePoupancaEdit(){
  const editEl = document.getElementById('fn-poupanca-edit')
  const dispEl = document.getElementById('fn-poupanca-display')
  const input  = document.getElementById('fn-poupanca-input')
  if(editEl.style.display==='none'){
    const current = getPoupancaValor()
    input.value = current > 0 ? current.toFixed(2) : ''
    editEl.style.display='block'
    dispEl.style.display='none'
    input.focus(); input.select()
  } else {
    cancelPoupancaEdit()
  }
}

function savePoupanca(){
  const val = parseFloat(document.getElementById('fn-poupanca-input').value)
  if(isNaN(val)||val<0){ showToast('Valor inválido','error'); return }
  
  localStorage.setItem('wd_poupanca', val.toFixed(2))
  
  if (typeof currentUser !== 'undefined' && currentUser && currentUser.id !== 'local-dev' && typeof db !== 'undefined') {
    db.auth.updateUser({
      data: { wd_poupanca: val.toFixed(2) }
    }).then((res) => {
      if (res && res.data && res.data.user) {
        currentUser = res.data.user;
      }
    }).catch(e => console.error('Erro ao salvar poupança:', e))
  }

  cancelPoupancaEdit()
  renderFinancas()
  if(typeof updateStats === 'function') updateStats()
  if(typeof renderDashboard === 'function') renderDashboard()
  showToast('Poupança atualizada ✓','success',2000)
}

function cancelPoupancaEdit(){
  document.getElementById('fn-poupanca-edit').style.display='none'
  document.getElementById('fn-poupanca-display').style.display='block'
}

function renderFinancas(){
  const allList = S.get('financas')
  const list = filterByPeriod(allList)
  // Saldo bruto sempre sobre TODOS os lançamentos pagos
  const allPaid = S.get('financas')
  const globalIn = allPaid.filter(f=>f.tipo==='entrada' && f.status!=='pendente').reduce((a,f)=>a+f.val,0);
  const totalIn  = list.filter(f=>f.tipo==='entrada' && f.status!=='pendente').reduce((a,f)=>a+f.val,0)
  const globalOut= allPaid.filter(f=>f.tipo==='saida'   && f.status!=='pendente').reduce((a,f)=>a+f.val,0);
  const totalOut = list.filter(f=>f.tipo==='saida'   && f.status!=='pendente').reduce((a,f)=>a+f.val,0)
  const pendIn   = list.filter(f=>f.tipo==='entrada' && f.status==='pendente').reduce((a,f)=>a+f.val,0)
  const pendOut  = list.filter(f=>f.tipo==='saida'   && f.status==='pendente').reduce((a,f)=>a+f.val,0)
  const saldo    = globalIn - globalOut
  const poupanca = getPoupancaValor()
  const disponivel = saldo - poupanca

  const fmtBRL = v => 'R$'+v.toFixed(2).replace('.',',')

  const tiEl   = document.getElementById('fn-total-in')
  const toEl   = document.getElementById('fn-total-out')
  const fsEl   = document.getElementById('fn-saldo')
  const piEl   = document.getElementById('fn-pend-in')
  const poEl   = document.getElementById('fn-pend-out')
  const dispEl = document.getElementById('fn-disponivel')
  const poupEl = document.getElementById('fn-poupanca-display')

  if(tiEl) tiEl.textContent = fmtBRL(totalIn)
  if(toEl) toEl.textContent = fmtBRL(totalOut)
  if(fsEl){ fsEl.textContent = fmtBRL(saldo); fsEl.style.color = saldo>=0?'var(--accent)':'var(--accent4)' }
  if(piEl) piEl.textContent = fmtBRL(pendIn)
  if(poEl) poEl.textContent = fmtBRL(pendOut)
  if(dispEl){ dispEl.textContent = fmtBRL(disponivel); dispEl.style.color = disponivel>=0?'var(--accent2)':'var(--accent4)' }
  if(poupEl) poupEl.textContent = fmtBRL(poupanca)

  const lEl = document.getElementById('fn-list')
  if(!lEl) return
  if(!list.length){lEl.innerHTML='<div class="empty">Nenhum lançamento neste período</div>';renderFinChart([]);return}

  const sortedList = [...list].sort((a,b) => {
    if(a.status==='pendente' && b.status!=='pendente') return -1;
    if(a.status!=='pendente' && b.status==='pendente') return 1;
    return b.id - a.id;
  })

  lEl.innerHTML = sortedList.map(f=>{
    const [bg,fg] = catColors[f.cat]||catColors.outro
    const isPend = f.status === 'pendente'
    return `<div class="fin-item ${isPend ? 'is-pend' : ''}">
      <div class="fin-info">
        <div class="fin-origin">
          ${f.desc}
          ${isPend ? '<span class="badge-pendente">Pendente</span>' : ''}
        </div>
        <span class="fin-cat-badge" style="background:${bg};color:${fg}">${f.cat}</span>
        <span style="font-size:13px;color:var(--text3);margin-left:6px">${formatDate(f.date)}</span>
      </div>
      <div class="fin-val ${f.tipo==='entrada'?'v-in':'v-out'}">${f.tipo==='entrada'?'+':'-'}R$${f.val.toFixed(2).replace('.',',')}</div>
      <button class="wd-btn ${isPend ? 'btn-primary' : 'btn-ghost'} btn-sm" style="margin-left:8px" onclick="toggleFinancaStatus(${f.id})" title="${isPend?'Marcar como pago/recebido':'Voltar para pendente'}">
        ${isPend ? '✓ Dar Baixa' : '↺'}
      </button>
      <button class="wd-btn btn-danger btn-sm" style="margin-left:4px" onclick="deleteFinanca(${f.id})"><i data-lucide="x" style="width:14px;height:14px"></i></button>
    </div>`
  }).join('')

  renderFinChart(list)
  renderMetasFinanceiras(list)
}

// ══════════════════════════════════════════
//  GRÁFICO FINANCEIRO — Donut por Categoria
// ══════════════════════════════════════════
const chartPalette = {
  'trabalho':    '#2563eb',
  'despesa-fixa':'#ef4444',
  'lazer':       '#3b82f6',
  'alimentacao': '#f59e0b',
  'saude':       '#10b981',
  'investimento':'#06b6d4',
  'outro':       '#71717a'
}
const catLabels = {
  'trabalho':'Trabalho','despesa-fixa':'Despesa Fixa',
  'lazer':'Lazer','alimentacao':'Alimentação',
  'saude':'Saúde','investimento':'Investimento','outro':'Outro'
}

function renderFinChart(list){
  const canvas  = document.getElementById('fn-chart')
  const legend  = document.getElementById('fn-chart-legend')
  const empty   = document.getElementById('fn-chart-empty')
  if(!canvas || !legend) return

  const saidas = list.filter(f=>f.tipo==='saida')

  if(!saidas.length){
    canvas.style.display  = 'none'
    legend.style.display  = 'none'
    if(empty) empty.style.display = 'block'
    return
  }
  canvas.style.display  = ''
  legend.style.display  = 'flex'
  if(empty) empty.style.display = 'none'

  // Totais por categoria
  const cats = {}
  saidas.forEach(f=>{ cats[f.cat] = (cats[f.cat]||0) + f.val })
  const total = Object.values(cats).reduce((a,b)=>a+b,0)
  const entries = Object.entries(cats).sort((a,b)=>b[1]-a[1])

  // Tamanho responsivo
  const dpr  = window.devicePixelRatio || 1
  const size = Math.min((canvas.parentElement?.clientWidth||280) * 0.42, 200)
  canvas.width  = size * dpr
  canvas.height = size * dpr
  canvas.style.width  = size + 'px'
  canvas.style.height = size + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, size, size)

  const cx = size/2, cy = size/2
  const outerR = size * 0.44
  const innerR = size * 0.27
  const gap = 0.03  // gap entre fatias em radianos

  // Detecta tema claro
  const isLight = document.documentElement.getAttribute('data-theme') === 'light'
  const textColor    = isLight ? '#09090b' : '#f4f4f5'
  const subtextColor = isLight ? '#71717a' : '#71717a'

  // Sombra geral do canvas
  ctx.shadowColor   = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur    = 12

  let angle = -Math.PI / 2
  entries.forEach(([cat, val])=>{
    const slice = (val / total) * 2 * Math.PI - gap
    const color = chartPalette[cat] || '#64748b'

    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, outerR, angle + gap/2, angle + gap/2 + slice)
    ctx.arc(cx, cy, innerR, angle + gap/2 + slice, angle + gap/2, true)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
    angle += slice + gap
  })

  // Buraco central limpo
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(cx, cy, innerR - 1, 0, 2*Math.PI)
  ctx.fillStyle = isLight ? '#ffffff' : '#0f0f17'
  ctx.fill()

  // Texto central
  const fmtBRL = v => 'R$' + v.toLocaleString('pt-BR',{minimumFractionDigits:0})
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = textColor
  ctx.font = `bold ${Math.round(size*0.13)}px Inter,sans-serif`
  ctx.fillText(fmtBRL(total), cx, cy - size*0.05)
  ctx.fillStyle = subtextColor
  ctx.font = `${Math.round(size*0.08)}px Inter,sans-serif`
  ctx.fillText('em gastos', cx, cy + size*0.1)

  // Legenda HTML
  legend.innerHTML = entries.map(([cat, val])=>{
    const pct = ((val/total)*100).toFixed(1)
    const color = chartPalette[cat] || '#64748b'
    const label = catLabels[cat] || cat
    return `
      <div style="display:flex;align-items:center;gap:8px;font-size:13px">
        <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:${color};box-shadow:0 0 6px ${color}88"></div>
        <div style="flex:1;color:var(--text2)">${label}</div>
        <div style="font-weight:600;color:var(--text1)">${fmtBRL(val)}</div>
        <div style="color:var(--text3);min-width:38px;text-align:right">${pct}%</div>
      </div>`
  }).join('')
}

// ══════════════════════════════════════════
//  METAS FINANCEIRAS
// ══════════════════════════════════════════
function renderMetasFinanceiras(list){
  const el = document.getElementById('fn-metas-list')
  if(!el) return
  
  // Apenas saídas pagas deste período
  const saidas = list.filter(f=>f.tipo==='saida' && f.status==='pago')
  const spentByCat = {}
  saidas.forEach(s => {
    spentByCat[s.cat] = (spentByCat[s.cat] || 0) + s.val
  })

  const metas = JSON.parse(localStorage.getItem('wd_fin_metas') || '{}')
  const cats = Object.keys(catLabels)
  
  const fmtBRL = v => 'R$' + v.toLocaleString('pt-BR',{minimumFractionDigits:0})

  el.innerHTML = cats.map(cat => {
    // Escondemos metas para entradas (trabalho) e investimentos (que são reserva)
    if(cat === 'trabalho' || cat === 'investimento') return ''; 
    
    const spent = spentByCat[cat] || 0
    const limit = metas[cat] || 0
    const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
    const color = chartPalette[cat] || 'var(--accent)'
    const label = catLabels[cat]
    
    let statusClass = ''
    if(limit > 0 && spent > limit) statusClass = 'meta-over'
    else if(limit > 0 && pct > 80) statusClass = 'meta-warning'

    return `
      <div class="meta-item ${statusClass}">
        <div class="meta-header">
          <div class="meta-info">
            <span class="meta-dot" style="background:${color}"></span>
            <span class="meta-label">${label}</span>
          </div>
          <div class="meta-values">
            <span class="meta-spent">${fmtBRL(spent)}</span>
            <span class="meta-sep">/</span>
            <button class="meta-limit-btn" onclick="promptMeta('${cat}')">${limit > 0 ? fmtBRL(limit) : 'Definir meta'}</button>
          </div>
        </div>
        <div class="meta-progress-bg">
          <div class="meta-progress-fill" style="width:${pct}%; background:${color}"></div>
        </div>
      </div>`
  }).join('')
}

function promptMeta(cat){
  const metas = JSON.parse(localStorage.getItem('wd_fin_metas') || '{}')
  const current = metas[cat] || ''
  const val = prompt(`Definir limite mensal para ${catLabels[cat]}:`, current)
  if(val === null) return
  const n = parseFloat(val.replace(',','.'))
  if(isNaN(n) || n < 0){
    showToast('Valor inválido', 'error')
    return
  }
  metas[cat] = n
  localStorage.setItem('wd_fin_metas', JSON.stringify(metas))
  renderFinancas()
  showToast(`Meta de ${catLabels[cat]} atualizada`, 'success')
}



// ══════════════════════════════════════════
//  PROJETOS
// ══════════════════════════════════════════
const projColors = {trabalho:'var(--accent)',pessoal:'var(--accent2)',estudo:'var(--accent3)',financeiro:'var(--accent5)'}

function addProjeto(){
  const nome = document.getElementById('pj-nome').value.trim()
  const desc = document.getElementById('pj-desc').value.trim()
  const cat = document.getElementById('pj-cat').value
  const pct = parseInt(document.getElementById('pj-pct').value)
  if(!nome) return
  const list = S.get('projetos')
  list.push({id:Date.now(),nome,desc,cat,pct,notas:'',rascunhos:'',plano:'',createdAt:today()})
  S.set('projetos',list)
  document.getElementById('pj-nome').value=''
  document.getElementById('pj-desc').value=''
  document.getElementById('pj-pct').value=0
  document.getElementById('pj-pct-lbl').textContent='0%'
  closeModal('modal-proj')
  renderProjetos()
}

function openEditProg(id,pct){
  document.getElementById('prog-id').value=id
  document.getElementById('prog-pct').value=pct
  document.getElementById('prog-pct-lbl').textContent=pct+'%'
  openModal('modal-prog')
}

function saveProgresso(){
  const id = parseInt(document.getElementById('prog-id').value)
  const pct = parseInt(document.getElementById('prog-pct').value)
  const list = S.get('projetos')
  const p = list.find(x=>x.id==id)
  if(p) p.pct=pct
  S.set('projetos',list)
  closeModal('modal-prog')
  renderProjetos()
}

function deleteProjeto(id){
  S.set('projetos',S.get('projetos').filter(p=>p.id!=id))
  renderProjetos()
}

function renderProjetos(){
  const list = S.get('projetos') || [];
  const el = document.getElementById('proj-list-full');
  if(!el) return;

  if(!list.length){
    el.innerHTML=`
      <div class="proj-empty-card">
        <div class="proj-empty-icon">🚀</div>
        <p style="font-weight: 600; color: var(--text2); font-size: 16px; margin-bottom: 6px;">Nenhum projeto registrado</p>
        <p style="color: var(--text3); font-size: 13px;">Clique em "+ Novo Projeto" para planejar e acompanhar seus objetivos.</p>
      </div>`;
    return;
  }

  // Categoria badge formatting map
  const catLabels = {
    trabalho: '💼 Trabalho',
    pessoal: '👤 Pessoal',
    estudo: '📚 Estudo',
    financeiro: '💰 Financeiro'
  };

  const ativos = list.filter(p => p.pct < 100);
  const concluidos = list.filter(p => p.pct === 100);

  // Sorting: newest first
  ativos.sort((a,b) => b.id - a.id);
  concluidos.sort((a,b) => b.id - a.id);

  let htmlContent = '';

  // 1. Seção de Projetos em Andamento
  htmlContent += `
    <div class="proj-section-title active-title">
      <i data-lucide="rocket" style="width:20px;height:20px"></i>
      Projetos em Andamento (${ativos.length})
    </div>
    <div class="proj-grid">
  `;

  if (ativos.length === 0) {
    htmlContent += `
      <div class="proj-empty-card">
        <div class="proj-empty-icon">💡</div>
        <p style="font-weight: 500; color: var(--text3); font-size: 14px; margin: 0;">Nenhum projeto em andamento no momento.</p>
      </div>
    `;
  } else {
    htmlContent += ativos.map(p => {
      const color = projColors[p.cat] || 'var(--accent)';
      const catLabel = catLabels[p.cat] || p.cat;
      const desc = p.desc ? `<div class="proj-card-desc">${p.desc}</div>` : `<div class="proj-card-desc" style="color:var(--text3); font-style:italic;">Sem descrição cadastrada.</div>`;
      
      return `
        <div class="proj-card active-card">
          <div class="proj-card-header">
            <div class="proj-card-title-area">
              <div class="proj-card-title" title="${p.nome}">${p.nome}</div>
            </div>
            <span class="ptag" style="border-color:${color}44; color:${color}; background:${color}11;">${catLabel}</span>
          </div>
          ${desc}
          <div class="proj-card-prog-section">
            <div class="proj-card-prog-header">
              <span style="font-size:12px; font-weight:600; color:var(--text2)">Progresso</span>
              <span class="proj-card-prog-pct" style="color:${color}">${p.pct}%</span>
            </div>
            <div class="proj-card-prog-bar">
              <div class="proj-card-prog-fill" style="width:${p.pct}%; background:linear-gradient(90deg, var(--primary-light), ${color}); box-shadow: 0 0 10px ${color}44;"></div>
            </div>
          </div>
          <div class="proj-card-footer">
            <div class="proj-card-date">Criado em ${formatDate(p.createdAt)}</div>
            <div class="proj-card-actions">
              <button class="wd-btn btn-ghost btn-sm" onclick="openProjectDetails(${p.id})" title="Ver Detalhes">🔍 Detalhes</button>
              <button class="wd-btn btn-ghost btn-sm" onclick="openEditProg(${p.id},${p.pct})" title="Atualizar Progresso">Atualizar</button>
              <button class="wd-btn btn-danger btn-sm" onclick="deleteProjeto(${p.id})" title="Excluir Projeto"><i data-lucide="x" style="width:14px;height:14px"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  htmlContent += `</div>`; // Fechar proj-grid ativos

  // 2. Seção de Projetos Concluídos
  htmlContent += `
    <div class="proj-section-title completed-title" style="margin-top: 36px;">
      <i data-lucide="check-circle-2" style="width:20px;height:20px"></i>
      Projetos Concluídos (${concluidos.length})
    </div>
    <div class="proj-grid">
  `;

  if (concluidos.length === 0) {
    htmlContent += `
      <div class="proj-empty-card" style="border-color: rgba(16, 185, 129, 0.15)">
        <div class="proj-empty-icon" style="font-size: 26px;">🎯</div>
        <p style="font-weight: 500; color: var(--text3); font-size: 14px; margin: 0;">Seus projetos concluídos (100%) aparecerão aqui!</p>
      </div>
    `;
  } else {
    htmlContent += concluidos.map(p => {
      const color = 'var(--success)';
      const catLabel = catLabels[p.cat] || p.cat;
      const desc = p.desc ? `<div class="proj-card-desc" style="opacity: 0.8;">${p.desc}</div>` : `<div class="proj-card-desc" style="color:var(--text3); font-style:italic;">Sem descrição cadastrada.</div>`;
      
      return `
        <div class="proj-card completed-card">
          <div class="proj-card-header">
            <div class="proj-card-title-area" style="display:flex; align-items:center; gap:6px;">
              <span style="font-size: 18px; line-height: 1;">🏆</span>
              <div class="proj-card-title" title="${p.nome}">${p.nome}</div>
            </div>
            <span class="ptag" style="border-color:rgba(16, 185, 129, 0.3); color:${color}; background:rgba(16, 185, 129, 0.1);">${catLabel}</span>
          </div>
          ${desc}
          <div class="proj-card-prog-section">
            <div class="proj-card-prog-header">
              <span style="font-size:12px; font-weight:600; color:var(--success)">Concluído!</span>
              <span class="proj-card-prog-pct" style="color:${color}">100%</span>
            </div>
            <div class="proj-card-prog-bar" style="border-color:rgba(16, 185, 129, 0.2)">
              <div class="proj-card-prog-fill" style="width:100%; background:linear-gradient(90deg, #10b981, #059669); box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);"></div>
            </div>
          </div>
          <div class="proj-card-footer">
            <div class="proj-card-date">Criado em ${formatDate(p.createdAt)}</div>
            <div class="proj-card-actions">
              <button class="wd-btn btn-ghost btn-sm" onclick="openProjectDetails(${p.id})" title="Ver Detalhes">🔍 Detalhes</button>
              <button class="wd-btn btn-ghost btn-sm" onclick="openEditProg(${p.id},100)" title="Atualizar Progresso">Atualizar</button>
              <button class="wd-btn btn-danger btn-sm" onclick="deleteProjeto(${p.id})" title="Excluir Projeto"><i data-lucide="x" style="width:14px;height:14px"></i></button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  htmlContent += `</div>`; // Fechar proj-grid concluídos

  el.innerHTML = htmlContent;
  
  // Re-inicializa ícones Lucide no conteúdo dinamicamente gerado
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

// Detalhes e Edição de Projeto
function openProjectDetails(id){
  const p = S.get('projetos').find(x=>x.id==id)
  if(!p) return
  
  document.getElementById('det-id').value = p.id
  document.getElementById('det-nome').value = p.nome
  document.getElementById('det-cat').value = p.cat
  document.getElementById('det-pct').value = p.pct
  document.getElementById('det-pct-lbl').textContent = p.pct + '%'
  document.getElementById('det-desc').value = p.desc || ''
  document.getElementById('det-notas').value = p.notas || ''
  document.getElementById('det-rascunhos').value = p.rascunhos || ''
  document.getElementById('det-plano').value = p.plano || ''
  
  switchProjectTab('geral')
  openModal('modal-detalhes-proj')
}

function switchProjectTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'))
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active')
  
  document.querySelectorAll('.tab-content').forEach(c=>c.style.display='none')
  document.getElementById('tab-'+tab).style.display='block'
}

function saveProjectDetails(){
  const id = parseInt(document.getElementById('det-id').value)
  const list = S.get('projetos')
  const p = list.find(x=>x.id==id)
  
  if(p){
    p.nome = document.getElementById('det-nome').value.trim()
    p.cat = document.getElementById('det-cat').value
    p.pct = parseInt(document.getElementById('det-pct').value)
    p.desc = document.getElementById('det-desc').value.trim()
    p.notas = document.getElementById('det-notas').value.trim()
    p.rascunhos = document.getElementById('det-rascunhos').value.trim()
    p.plano = document.getElementById('det-plano').value.trim()
    
    S.set('projetos', list)
    closeModal('modal-detalhes-proj')
    renderProjetos()
  }
}

// ══════════════════════════════════════════
//  SEGUNDO CÉREBRO
// ══════════════════════════════════════════
const tagColors = {
  ideia:['rgba(245,158,11,.1)','#fbbf24'],
  projeto:['rgba(37,99,235,.12)','var(--primary-light)'],
  aprendizado:['rgba(59,130,246,.1)','#93c5fd'],
  reflexao:['rgba(217,119,6,.12)','var(--cyan)'],
  referencia:['rgba(16,185,129,.1)','var(--success)'],
  outro:['rgba(255,255,255,.05)','var(--text2)']
}
const tagIcons = {ideia:'💡',projeto:'🚀',aprendizado:'📚',reflexao:'🔮',referencia:'🔗',outro:'📌'}

function addNota(){
  const texto = document.getElementById('br-input').value.trim()
  const tag = document.getElementById('br-tag').value
  if(!texto) return
  const list = S.get('brain')
  list.push({id:Date.now(),texto,tag,date:today()})
  S.set('brain',list)
  document.getElementById('br-input').value=''
  renderCerebro()
}

function deleteNota(id){
  S.set('brain',S.get('brain').filter(n=>n.id!=id))
  renderCerebro()
}

function renderCerebro(){
  const list = S.get('brain')
  const el = document.getElementById('brain-list')
  const search = document.getElementById('br-search')?.value.toLowerCase() || ''
  
  if(!el) return
  if(!list.length){el.innerHTML='<div class="empty">Jogue sua primeira ideia aqui 💡</div>';return}

  const filtered = list.filter(n => 
    n.texto.toLowerCase().includes(search) || 
    n.tag.toLowerCase().includes(search)
  );

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank" style="color:var(--accent2);text-decoration:underline">${url}</a>`);
  }

  el.innerHTML = [...filtered].reverse().map(n=>{
    const [bg,fg] = tagColors[n.tag]||tagColors.outro
    return `<div class="brain-note">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span class="fin-cat-badge" style="background:${bg};color:${fg}">${tagIcons[n.tag]} ${n.tag}</span>
        <button class="wd-btn btn-danger btn-sm" onclick="deleteNota(${n.id})"><i data-lucide="x" style="width:14px;height:14px"></i></button>
      </div>
      <div class="brain-note-text">${linkify(n.texto).replace(/\n/g,'<br>')}</div>
      <div class="brain-note-date">${formatDate(n.date)}</div>
    </div>`
  }).join('')
}

// ══════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════
function renderDashboard(){
  const t = today()
  const habitos = S.get('habitos')
  const tarefas = S.get('tarefas')
  const financas = S.get('financas')
  const projetos = S.get('projetos')
  const dHoje = new Date().getDay()
  const hora = new Date().getHours()

  // Saudação personalizada
  const greetEl = document.getElementById('dash-greeting')
  if(greetEl){
    const saudacao = hora<12?'Bom dia':hora<18?'Boa tarde':'Boa noite'
    const nome = (currentUser?.user_metadata?.full_name||currentUser?.email||'').split(' ')[0]
    greetEl.textContent = `${saudacao}${nome ? ', '+nome : ''} 👋`
  }

  // Score do dia
  const schedHoje = habitos.filter(h=>h.tipo==='rec'&&(h.dias||[0,1,2,3,4,5,6]).includes(dHoje))
  const habitsDone = schedHoje.filter(h=>h.done.includes(t)).length
  const dailyTasks = tarefas.filter(t2=>t2.is_daily)
  const tasksDone = dailyTasks.filter(t2=>t2.done).length
  const totalItems = schedHoje.length + dailyTasks.length
  const score = totalItems>0 ? Math.round(((habitsDone+tasksDone)/totalItems)*100) : 0
  const scoreEl = document.getElementById('dash-score')
  if(scoreEl){
    const scoreColor = score>=80?'var(--accent2)':score>=50?'var(--accent3)':'var(--accent4)'
    scoreEl.innerHTML = `<div style="font-size:36px;font-weight:700;color:${scoreColor};line-height:1">${score}%</div><div style="font-size:12px;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;margin-top:4px">Score do dia</div>`
  }

  // Resumo do dia
  const summaryEl = document.getElementById('dash-summary')
  if(summaryEl){
    const pendOut = financas.filter(f=>f.tipo==='saida'&&f.status==='pendente').reduce((a,f)=>a+f.val,0)
    const pendTarefas = tarefas.filter(t2=>!t2.done&&t2.is_daily).length
    const pendHabits = schedHoje.length - habitsDone
    const parts = []
    if(pendHabits>0) parts.push(`${pendHabits} hábito${pendHabits>1?'s':''}`)
    if(pendTarefas>0) parts.push(`${pendTarefas} tarefa${pendTarefas>1?'s':''} urgente${pendTarefas>1?'s':''}`)
    if(pendOut>0) parts.push(`R$${pendOut.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,'.')} a pagar`)
    summaryEl.textContent = parts.length ? 'Hoje: ' + parts.join(' · ') : '🎉 Dia 100%! Tudo em dia.'
  }

  // hábitos mini
  const dhEl = document.getElementById('dash-habitos-list')
  if(dhEl){
    const dHoje = new Date().getDay()
    const scheduled = habitos.filter(h=>h.tipo==='rec' && (h.dias||[0,1,2,3,4,5,6]).includes(dHoje))
    const occDone = habitos.filter(h=>h.tipo==='occ' && h.done.includes(t))
    const toShow = [...scheduled, ...occDone]
    
    if(!toShow.length){dhEl.innerHTML='<div class="empty">Nenhum hábito para hoje</div>'}
    else {
      dhEl.innerHTML = toShow.slice(0,5).map(h=>{
        const done = h.done.includes(t)
        return `<div class="habit-item">
          <div class="hcheck ${done?'done':''}" onclick="toggleHabito(${h.id});renderDashboard()"></div>
          <div class="habit-name ${done?'done':''}">
             ${h.nome} 
             ${h.duracao?`<span style="color:var(--text3);font-size:13px;margin-left:4px">(${h.duracao})</span>`:''}
             ${h.hora?`<span style="color:var(--accent2);font-size:13px;margin-left:4px">⏰ ${h.hora}</span>`:''}
          </div>
        </div>`
      }).join('')
    }
  }

  // tarefas mini
  const dtEl = document.getElementById('dash-tarefas-list')
  if(dtEl){
    const dailyPend = tarefas.filter(t => !t.done && t.is_daily).sort((a,b) => a.seq - b.seq)
    const laterPend = tarefas.filter(t => !t.done && !t.is_daily)
    const pend = [...dailyPend, ...laterPend].slice(0,6)
    
    if(!pend.length){dtEl.innerHTML='<div class="empty">Nenhuma tarefa pendente 🎉</div>'}
    else {
      dtEl.innerHTML = pend.map(t=>`<div class="task-item">
        <div class="task-check ${t.done?'done':''}" onclick="toggleTarefa(${t.id});renderDashboard()"></div>
        <div class="task-prio" style="background:${prioColors[t.prio]}"></div>
        <div class="task-body">
          <div class="task-name ${t.done?'done':''}">${t.is_daily?'⭐ ':''}${t.nome}</div>
          <div class="task-meta">${t.prio}${t.prazo?' · '+formatDate(t.prazo):''}</div>
        </div>
      </div>`).join('')
    }
  }

  // projetos mini
  const dpEl = document.getElementById('dash-proj-list')
  if(dpEl){
    const activeProjs = projetos.filter(p => p.pct < 100);
    if(!activeProjs.length){dpEl.innerHTML='<div class="empty">Nenhum projeto em andamento</div>'}
    else{
      dpEl.innerHTML = activeProjs.slice(0,4).map(p=>{
        const color = projColors[p.cat]||'var(--accent)'
        return `<div class="proj-item" style="margin-bottom:12px">
          <div class="proj-header"><div class="proj-name">${p.nome}</div><div class="proj-pct" style="color:${color}">${p.pct}%</div></div>
          <div class="prog-bar" style="margin-bottom:6px"><div class="prog-fill" style="width:${p.pct}%;background:${color}"></div></div>
        </div>`
      }).join('')
    }
  }

  // finanças mini
  const dfEl = document.getElementById('dash-fin-list')
  if(dfEl){
    if(!financas.length){dfEl.innerHTML='<div class="empty">Nenhum lançamento</div>'}
    else{
      dfEl.innerHTML = [...financas].reverse().slice(0,4).map(f=>{
        const isPend = f.status === 'pendente'
        return `<div class="fin-item ${isPend ? 'is-pend' : ''}">
          <div class="fin-info"><div class="fin-origin" style="font-size:15px">${f.desc}${isPend ? ' <span class="badge-pendente">Pend.</span>' : ''}</div></div>
          <div class="fin-val ${f.tipo==='entrada'?'v-in':'v-out'}" style="font-size:15px">${f.tipo==='entrada'?'+':'-'}R$${f.val.toFixed(2).replace('.',',')}</div>
        </div>`
      }).join('')
    }
  }

  updateStats()
}

function updateStats(){
  const t = today()
  const dHoje = new Date().getDay()
  const habitos = S.get('habitos')
  const tarefas = S.get('tarefas')
  const financas = S.get('financas')

  const expectedHabits = habitos.filter(h=>h.tipo==='rec' && (h.dias||[0,1,2,3,4,5,6]).includes(dHoje))
  const occDoneToday = habitos.filter(h=>h.tipo==='occ' && h.done.includes(t)).length
  
  const total = expectedHabits.length
  const done = expectedHabits.filter(h=>h.done.includes(t)).length + occDoneToday
  const totalIn = financas.filter(f=>f.tipo==='entrada' && f.status!=='pendente').reduce((a,f)=>a+f.val,0)
  const totalOut = financas.filter(f=>f.tipo==='saida' && f.status!=='pendente').reduce((a,f)=>a+f.val,0)
  const saldo = totalIn - totalOut
  const poupanca = getPoupancaValor()
  const disponivel = saldo - poupanca
  const pendentes = tarefas.filter(t=>!t.done).length

  const dsh   = document.getElementById('ds-habitos')
  const dst   = document.getElementById('ds-tarefas')
  const dss   = document.getElementById('ds-saldo')
  const dssub = document.getElementById('ds-saldo-sub')
  const thl   = document.getElementById('todayHabitsLabel')

  if(dsh) dsh.textContent = `${done}/${total}`
  if(dst) dst.textContent = pendentes
  if(dss){
    dss.textContent = 'R$'+disponivel.toLocaleString('pt-BR',{minimumFractionDigits:0})
    dss.style.color = disponivel>=0?'var(--accent2)':'var(--accent4)'
  }
  if(dssub){
    dssub.textContent = poupanca>0
      ? `Bruto: R$${saldo.toLocaleString('pt-BR',{minimumFractionDigits:0})} · 🐷 R$${poupanca.toLocaleString('pt-BR',{minimumFractionDigits:0})} guardado`
      : ''
  }
  if(thl) thl.textContent = `${done}/${total} hábitos hoje`
}


// ══════════════════════════════════════════
//  MODAIS
// ══════════════════════════════════════════
function openModal(id){document.getElementById(id).classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open')}
document.querySelectorAll('.modal-overlay').forEach(m=>{
  m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')})
})

// listeners extras
document.querySelectorAll('.wp-day').forEach(d=>{
  d.addEventListener('click',()=>d.classList.toggle('active'))
})

// ══════════════════════════════════════════
//  COFRE DE SENHAS (AES-256-GCM)
// ══════════════════════════════════════════
let vaultKey = null;

// Geração de chave a partir da senha mestre (PBKDF2)
async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits", "deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  );
}

async function encryptData(text, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv }, key, enc.encode(text)
  );
  const ivArr = Array.from(iv);
  const cArr = Array.from(new Uint8Array(ciphertext));
  return btoa(JSON.stringify({iv: ivArr, data: cArr}));
}

async function decryptData(encStr, key) {
  const dec = JSON.parse(atob(encStr));
  const iv = new Uint8Array(dec.iv);
  const ciphertext = new Uint8Array(dec.data);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv }, key, ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

async function getVaultData() {
  const enc = S.getSingle('senhas_enc', null);
  if(!enc) return [];
  try {
    const dec = await decryptData(enc, vaultKey);
    return JSON.parse(dec);
  } catch(e) {
    return [];
  }
}

async function saveVaultData(list) {
  const enc = await encryptData(JSON.stringify(list), vaultKey);
  S.set('senhas_enc', enc);
}

// Acesso ao cofre
async function submitVaultMaster() {
  const errorEl = document.getElementById('vault-lock-error');
  const input = document.getElementById('vault-master-input');
  const pwd = input.value;
  if(!pwd) return;

  const vaultConf = S.getSingle('vault_conf', null);
  
  try {
    if(!window.crypto || !window.crypto.subtle) {
      throw new Error("Seu navegador não suporta criptografia (Web Crypto API). Tente usar HTTPS.");
    }
    
    if(!vaultConf) {
      // Primeira vez: cria
      const salt = crypto.getRandomValues(new Uint8Array(16));
      vaultKey = await deriveKey(pwd, salt);
      // Cria um check de verificação criptografando string conhecida
      const checkStr = await encryptData('WD_VAULT_OK', vaultKey);
      S.set('vault_conf', { salt: Array.from(salt), check: checkStr });
      unlockVaultUI();
    } else {
      // Desbloquear
      const salt = new Uint8Array(vaultConf.salt);
      const key = await deriveKey(pwd, salt);
      try {
        const check = await decryptData(vaultConf.check, key);
        if(check === 'WD_VAULT_OK') {
          vaultKey = key;
          unlockVaultUI();
        } else { throw new Error("Check failed"); }
      } catch(decErr) {
        throw new Error("wrong_pass");
      }
    }
    input.value = '';
  } catch(e) {
    if(e.message === 'wrong_pass') {
      errorEl.textContent = 'Senha incorreta. Tente novamente.';
    } else {
      errorEl.textContent = 'Erro de segurança: ' + e.message;
    }
    errorEl.style.display = 'block';
    setTimeout(() => errorEl.style.display = 'none', 4500);
  }
}

function unlockVaultUI() {
  document.getElementById('vault-locked').style.display = 'none';
  document.getElementById('vault-unlocked').style.display = 'block';
  renderSenhasList();
}

function lockVault() {
  vaultKey = null;
  document.getElementById('vault-unlocked').style.display = 'none';
  document.getElementById('vault-locked').style.display = 'flex';
}

function renderSenhas() {
  const conf = S.getSingle('vault_conf', null);
  const btn = document.querySelector('#vault-locked button');
  const sub = document.getElementById('vault-lock-sub');
  if(!conf) {
    document.getElementById('vault-create-hint').style.display = 'block';
    if(btn) btn.innerHTML = '✨ Criar Senha Mestre';
    if(sub) sub.innerHTML = 'Bem-vindo(a) ao cofre protegido. Crie a sua chave única abaixo:';
  } else {
    document.getElementById('vault-create-hint').style.display = 'none';
    if(btn) btn.innerHTML = '🔓 Desbloquear Cofre';
    if(sub) sub.innerHTML = 'Digite a senha mestre para acessar seu cofre';
  }
}

// CRUD de senhas
async function renderSenhasList() {
  const listEl = document.getElementById('pwd-list');
  const term = document.getElementById('pwd-search').value.toLowerCase();
  
  if(!vaultKey) return;
  const list = await getVaultData();
  
  const filtered = list.filter(p => p.site.toLowerCase().includes(term) || p.user.toLowerCase().includes(term));
  if(!filtered.length) {
    listEl.innerHTML = '<div class="empty">Nenhuma senha cadastrada ou encontrada.</div>';
    return;
  }
  
  listEl.innerHTML = filtered.map(p => {
    const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${p.url || p.site}`;
    return `
    <div class="card" style="margin-bottom:10px;display:flex;align-items:center;gap:12px;padding:12px 18px">
      <div style="width:36px;height:36px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
        <img src="${iconUrl}" style="width:20px;height:20px;object-fit:contain" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.site)}&background=random'">
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="font-size:16px;font-weight:600;color:var(--text1);margin-bottom:2px" class="text-truncate">${esc(p.site)}</div>
          ${p.cat ? `<span class="fin-cat-badge" style="font-size:10px;padding:1px 6px;margin-top:0;opacity:0.7">${p.cat}</span>` : ''}
        </div>
        <div style="font-size:13px;color:var(--text3)" class="text-truncate">${esc(p.user)}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="wd-btn btn-ghost btn-sm" onclick="copyToClipboard('${esc(p.pwd)}')"><i data-lucide="copy" style="width:14px;height:14px"></i></button>
        <button class="wd-btn btn-ghost btn-sm" onclick="editSenha(${p.id})"><i data-lucide="edit-2" style="width:14px;height:14px"></i></button>
        <button class="wd-btn btn-danger btn-sm" onclick="deleteSenha(${p.id})"><i data-lucide="x" style="width:14px;height:14px"></i></button>
      </div>
    </div>
  `}).join('');
}

function openSenhaModal() {
  document.getElementById('ms-title').textContent = 'Nova Senha';
  document.getElementById('ms-id').value = '';
  document.getElementById('ms-site').value = '';
  document.getElementById('ms-user').value = '';
  document.getElementById('ms-pwd').value = '';
  document.getElementById('ms-url').value = '';
  document.getElementById('ms-nota').value = '';
  document.getElementById('ms-cat').value = 'outro';
  openModal('modal-senha');
}

async function editSenha(id) {
  const list = await getVaultData();
  const s = list.find(x => x.id == id);
  if(!s) return;
  document.getElementById('ms-title').textContent = 'Editar Senha';
  document.getElementById('ms-id').value = s.id;
  document.getElementById('ms-site').value = s.site;
  document.getElementById('ms-user').value = s.user;
  document.getElementById('ms-pwd').value = s.pwd;
  document.getElementById('ms-url').value = s.url || '';
  document.getElementById('ms-nota').value = s.nota || '';
  document.getElementById('ms-cat').value = s.cat || 'outro';
  openModal('modal-senha');
}

async function saveSenha() {
  const idStr = document.getElementById('ms-id').value;
  const site = document.getElementById('ms-site').value.trim();
  const user = document.getElementById('ms-user').value.trim();
  const pwd = document.getElementById('ms-pwd').value;
  const url = document.getElementById('ms-url').value.trim();
  const nota = document.getElementById('ms-nota').value.trim();
  const cat = document.getElementById('ms-cat').value;
  
  if(!site || !pwd) return;
  
  const list = await getVaultData();
  if(idStr) {
    const idx = list.findIndex(x => x.id == idStr);
    if(idx > -1) list[idx] = { ...list[idx], site, user, pwd, url, nota, cat };
  } else {
    list.push({ id: Date.now(), site, user, pwd, url, nota, cat });
  }
  
  await saveVaultData(list);
  closeModal('modal-senha');
  renderSenhasList();
}

async function deleteSenha(id) {
  if(!confirm('Tem certeza que deseja excluir esta senha?')) return;
  const list = await getVaultData();
  await saveVaultData(list.filter(x => x.id != id));
  renderSenhasList();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  // feedback visual breve
  const btn = event.currentTarget;
  const oldText = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="check" style="width:14px;height:14px"></i>';
  setTimeout(()=>btn.innerHTML=oldText, 1500);
}

function downloadProjectPlan() {
  const id = parseInt(document.getElementById('det-id').value);
  const p = S.get('projetos').find(x => x.id === id);
  if(!p) return;
  
  const content = `PROJETO: ${p.nome}\nCATEGORIA: ${p.cat}\nPROGRESSO: ${p.pct}%\nOBJETIVO: ${p.desc}\n\nINFORMAÇÕES:\n${p.notas}\n\nPLANO DE PROJETO:\n${p.plano}\n\nGerado em: ${new Date().toLocaleString('pt-BR')}`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plano_${p.nome.toLowerCase().replace(/\s+/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function toggleMsPwd() {
  const i = document.getElementById('ms-pwd');
  i.type = i.type === 'password' ? 'text' : 'password';
}

// ── Gerador de Senha ──
function toggleGenerator() {
  const g = document.getElementById('pwd-generator');
  g.style.display = g.style.display === 'none' ? 'block' : 'none';
  if(g.style.display === 'block') generatePassword();
}

function generatePassword() {
  const len = parseInt(document.getElementById('gen-len').value);
  const up = document.getElementById('gen-upper').checked;
  const low = document.getElementById('gen-lower').checked;
  const num = document.getElementById('gen-nums').checked;
  const sym = document.getElementById('gen-syms').checked;
  
  let chars = '';
  if(up) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if(low) chars += 'abcdefghijklmnopqrstuvwxyz';
  if(num) chars += '0123456789';
  if(sym) chars += '!@#$%^&*()_+~|}{[]:;?><,./-=';
  
  if(!chars) {
    document.getElementById('gen-result').textContent = 'Selecione ao menos um tipo';
    return;
  }
  
  let pwd = '';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for(let i=0; i<len; i++) pwd += chars[arr[i] % chars.length];
  
  document.getElementById('gen-result').textContent = pwd;
  
  // calc strength
  let s = 0;
  if(len > 8) s++;
  if(len >= 12) s++;
  if(len >= 16) s++;
  if(up&&low) s++;
  if(num) s++;
  if(sym) s++;
  
  const fill = document.getElementById('gen-strength-fill');
  const lbl = document.getElementById('gen-strength-label');
  fill.style.width = Math.min(100, (s/6)*100) + '%';
  fill.style.background = s < 3 ? 'var(--accent4)' : (s < 5 ? 'var(--accent3)' : 'var(--accent2)');
  lbl.textContent = s < 3 ? 'Fraca' : (s < 5 ? 'Boa 💪' : 'Forte 🛡️');
}

function copyGenerated() {
  const pwd = document.getElementById('gen-result').textContent;
  if(pwd && pwd !== 'Selecione ao menos um tipo') copyToClipboard(pwd);
}

function fillFromGenerator() {
  const cur = document.getElementById('ms-pwd');
  const gen = document.getElementById('gen-result').textContent;
  if(gen && gen !== 'Clique em "Gerar"' && gen !== 'Selecione ao menos um tipo') {
    cur.value = gen;
    cur.type = 'text'; 
  }
}


//  GOOGLE AGENDA — Abertura inteligente por plataforma
// ══════════════════════════════════════════

const isAndroid = /Android/i.test(navigator.userAgent)
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
const isMobile = isAndroid || isIOS

function openCalendar(){
  if(isAndroid){
    // Android Intent URI: abre direto no app Google Calendar
    window.location.href = 'intent://calendar.google.com/calendar/r#Intent;scheme=https;package=com.google.android.calendar;S.browser_fallback_url=https%3A%2F%2Fcalendar.google.com%2Fcalendar%2Fr;end'
  } else if(isIOS){
    // iOS não tem intent URI, mas o Safari pergunta se quer abrir no app
    window.open('https://calendar.google.com/calendar/r', '_blank')
  } else {
    // Desktop: abre em popup dentro do workspace
    window.open('https://calendar.google.com/calendar/r', 'gcal_view', 'width=900,height=700,left=100,top=80,menubar=no,toolbar=no,location=no,scrollbars=yes')
  }
}

function newCalendarEvent(){
  if(isAndroid){
    // Android Intent URI: abre tela de novo evento no app Google Calendar
    window.location.href = 'intent://calendar.google.com/calendar/r/eventedit#Intent;scheme=https;package=com.google.android.calendar;S.browser_fallback_url=https%3A%2F%2Fcalendar.google.com%2Fcalendar%2Fr%2Feventedit;end'
  } else if(isIOS){
    window.open('https://calendar.google.com/calendar/r/eventedit', '_blank')
  } else {
    // Desktop: abre popup de criação de evento
    window.open('https://calendar.google.com/calendar/r/eventedit?src=otsuguarede%40gmail.com', 'gcal_new', 'width=820,height=720,left=200,top=80,menubar=no,toolbar=no,location=no,scrollbars=yes')
  }
}

// ══════════════════════════════════════════
//  TEMA CLARO / ESCURO
// ══════════════════════════════════════════
function toggleTheme(){
  const html = document.documentElement
  const btn = document.getElementById('themeBtn')
  const isLight = html.getAttribute('data-theme') === 'light'
  if(isLight){
    html.removeAttribute('data-theme')
    localStorage.setItem('wd_theme','dark')
    if(btn) btn.textContent = '🌙'
  } else {
    html.setAttribute('data-theme','light')
    localStorage.setItem('wd_theme','light')
    if(btn) btn.textContent = '☀️'
  }
}

function initTheme(){
  const saved = localStorage.getItem('wd_theme')
  const btn = document.getElementById('themeBtn')
  if(saved === 'light'){
    document.documentElement.setAttribute('data-theme','light')
    if(btn) btn.textContent = '☀️'
  } else {
    if(btn) btn.textContent = '🌙'
  }
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
//  HISTÓRICO & EVOLUÇÃO
// ══════════════════════════════════════════
let historyPeriod = 'semana'

function setHistoryPeriod(p){
  historyPeriod = p
  document.querySelectorAll('[data-hper]').forEach(b => {
    b.classList.toggle('active', b.dataset.hper === p)
  })
  renderHistorico()
}

function getRangeDates(period){
  const now = new Date()
  let start = new Date()
  if(period==='semana') start.setDate(now.getDate()-7)
  else if(period==='mes') start.setMonth(now.getMonth()-1)
  else if(period==='trimestre') start.setMonth(now.getMonth()-3)
  else if(period==='semestre') start.setMonth(now.getMonth()-6)
  else if(period==='ano') start.setFullYear(now.getFullYear()-1)
  return {start, now}
}

function renderHistorico(){
  const el = document.getElementById('page-historico')
  if(!el || !el.classList.contains('active')) return

  const {start, now} = getRangeDates(historyPeriod)
  const fmtBRL = v => 'R$' + v.toLocaleString('pt-BR',{minimumFractionDigits:2})
  
  // 1. Dados Filtrados
  const habitos = S.get('habitos')
  const tarefas = S.get('tarefas')
  const financas = S.get('financas')
  
  const startISO = start.toISOString().split('T')[0]
  
  // 2. Cálculos de Performance
  // Hábitos: média de conclusão no período
  let totalHabitSlots = 0
  let doneHabitSlots = 0
  habitos.forEach(h => {
    h.done.forEach(d => {
      if(d >= startISO) doneHabitSlots++
    })
    // Estimativa simples de slots totais (dias que o hábito deveria ter sido feito)
    const diffDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24))
    totalHabitSlots += (h.tipo === 'rec' ? (h.dias.length / 7) * diffDays : 1)
  })
  const habitScore = totalHabitSlots > 0 ? Math.round((doneHabitSlots / totalHabitSlots) * 100) : 0

  // Tarefas: Concluídas vs Total criadas no período
  const tkPeriod = tarefas.filter(t => t.createdAt >= startISO)
  const tkDone = tkPeriod.filter(t => t.done).length
  const taskScore = tkPeriod.length > 0 ? Math.round((tkDone / tkPeriod.length) * 100) : 0

  // Finanças
  const finPeriod = financas.filter(f => f.date >= startISO && f.status === 'pago')
  const totalIn = finPeriod.filter(f => f.tipo === 'entrada').reduce((a,b)=>a+b.val, 0)
  const totalOut = finPeriod.filter(f => f.tipo === 'saida').reduce((a,b)=>a+b.val, 0)
  const balance = totalIn - totalOut

  // 3. Renderizar Summary Grid
  const grid = document.getElementById('history-summary-grid')
  grid.innerHTML = `
    <div class="stat-chip">
      <div class="sc-label">Score de Hábitos</div>
      <div class="sc-value" style="color:var(--accent2)">${habitScore}%</div>
    </div>
    <div class="stat-chip">
      <div class="sc-label">Tarefas Entregues</div>
      <div class="sc-value" style="color:var(--accent)">${tkDone} <small style="font-size:12px;opacity:0.6">de ${tkPeriod.length}</small></div>
    </div>
    <div class="stat-chip">
      <div class="sc-label">Saldo do Período</div>
      <div class="sc-value" style="color:${balance>=0?'var(--accent2)':'var(--accent4)'}">${fmtBRL(balance)}</div>
    </div>
  `

  // 4. Renderizar Detalhes
  document.getElementById('history-habits-detail').innerHTML = habitos.map(h => {
    const count = h.done.filter(d => d >= startISO).length
    return `<div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px">
      <span style="color:var(--text2)">${h.nome}</span>
      <span style="font-weight:600">${count}x</span>
    </div>`
  }).join('')

  document.getElementById('history-finance-detail').innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:12px">
      <span style="color:var(--text3)">Total Recebido</span>
      <span style="color:var(--accent2); font-weight:600">${fmtBRL(totalIn)}</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:12px">
      <span style="color:var(--text3)">Total Gasto</span>
      <span style="color:var(--accent4); font-weight:600">${fmtBRL(totalOut)}</span>
    </div>
    <div style="border-top:1px solid var(--border); padding-top:12px; display:flex; justify-content:space-between">
      <span style="font-weight:600">Resultado Líquido</span>
      <span style="font-weight:700; color:${balance>=0?'var(--accent2)':'var(--accent4)'}">${fmtBRL(balance)}</span>
    </div>
  `

  // 5. Gráfico de Evolução (Barras Simples no Canvas)
  renderHistoryChart(tkPeriod, finPeriod, startISO)
}

function renderHistoryChart(tasks, finances, startISO){
  const canvas = document.getElementById('history-chart')
  if(!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const w = rect.width
  const h = rect.height
  ctx.clearRect(0,0,w,h)

  // Desenhar 7 barras (exemplo simplificado p/ evolução)
  const barCount = 7
  const barW = (w / barCount) - 20
  const maxH = h - 40

  for(let i=0; i<barCount; i++){
    const x = i * (w/barCount) + 10
    const valPct = 0.3 + (Math.random() * 0.6) // Simulando dados reais por enquanto
    const barH = valPct * maxH
    
    // Gradiente
    const grad = ctx.createLinearGradient(x, h-20, x, h-20-barH)
    grad.addColorStop(0, 'rgba(108, 99, 255, 0.8)')
    grad.addColorStop(1, 'rgba(108, 99, 255, 0.2)')
    
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(x, h-20-barH, barW, barH, [8,8,0,0])
    ctx.fill()
  }
}

function exportForAI(){
  const {start} = getRangeDates(historyPeriod)
  const startISO = start.toISOString().split('T')[0]
  
  const studyData = {
    periodo: historyPeriod,
    desde: startISO,
    metricas: {
      habitos: S.get('habitos').map(h => ({
        nome: h.nome,
        frequencia_no_periodo: h.done.filter(d => d >= startISO).length,
        tipo: h.tipo
      })),
      tarefas: {
        total_criadas: S.get('tarefas').filter(t => t.createdAt >= startISO).length,
        concluidas: S.get('tarefas').filter(t => t.createdAt >= startISO && t.done).length,
        atrasadas: S.get('tarefas').filter(t => t.createdAt >= startISO && !t.done && t.prazo && t.prazo < today()).length
      },
      financeiro: {
        entradas: S.get('financas').filter(f => f.date >= startISO && f.tipo==='entrada' && f.status==='pago').reduce((a,b)=>a+b.val,0),
        saidas: S.get('financas').filter(f => f.date >= startISO && f.tipo==='saida' && f.status==='pago').reduce((a,b)=>a+b.val,0),
        maiores_gastos: S.get('financas')
          .filter(f => f.date >= startISO && f.tipo==='saida')
          .sort((a,b)=>b.val-a.val)
          .slice(0,5)
          .map(f=>({desc:f.desc, valor:f.val, cat:f.cat}))
      },
      projetos: S.get('projetos').map(p => ({nome:p.nome, progresso:p.pct, categoria:p.cat}))
    },
    instrucao_ia: "Analise estes dados de produtividade e finanças. Identifique padrões de procrastinação, categorias de gasto excessivo e sugira 3 ações concretas para melhorar a performance na próxima semana."
  }

  const blob = new Blob([JSON.stringify(studyData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `estudo_ia_workspace_${historyPeriod}_${today()}.json`;
  a.click();
  showToast('JSON de estudo gerado! Envie para sua IA favorita para análise.', 'success')
}

// ══════════════════════════════════════════
//  DEV MODE — localhost pula login
// ══════════════════════════════════════════
const IS_DEV = ['localhost','127.0.0.1'].includes(window.location.hostname)

async function init(){
  // Controle de Versão (Cache Busting)
  const savedV = localStorage.getItem('wd_app_version')
  if(savedV !== APP_VERSION){
    localStorage.setItem('wd_app_version', APP_VERSION)
    window.location.reload()
    return
  }

  if(IS_DEV){
    // Modo preview local: usa localStorage, sem login
    currentUser={id:'local-dev',user_metadata:{full_name:'Preview Local',avatar_url:''}}
    // Reverte S para localStorage em modo dev
    S.get = k=>{try{return JSON.parse(localStorage.getItem('wd_'+k))||[]}catch{return[]}}
    S.set = (k,v)=>{localStorage.setItem('wd_'+k,JSON.stringify(v))}
    S.getSingle = (k,d)=>{try{return JSON.parse(localStorage.getItem('wd_'+k))||d}catch{return d}}
    // Badge visual indicando modo dev
    const badge=document.createElement('span')
    badge.textContent='⚡ DEV LOCAL'
    badge.style.cssText='font-size:13px;padding:3px 10px;border-radius:20px;background:#1a1420;color:#c084fc;font-weight:700;letter-spacing:.08em'
    document.querySelector('.topbar-right').prepend(badge)
  } else {
    const {data:{session}}=await db.auth.getSession()
    if(!session){window.location.href='/';return}
    
    // Obter dados atualizados do servidor para evitar sessão cacheada e obsoleta
    try {
      const {data:{user}} = await db.auth.getUser()
      currentUser = user || session.user
    } catch(e) {
      currentUser = session.user
    }
    
    try{await loadAllData()}catch(e){console.error('Load error',e)}
    setupRealtimeSync()
  }
  initDate()
  initTheme()
  renderDashboard()
  showUserInfo()
  // Atalhos de teclado
  document.addEventListener('keydown', e=>{
    const tag = document.activeElement?.tagName
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return
    if(e.metaKey||e.ctrlKey||e.altKey) return
    const k = e.key.toLowerCase()
    if(e.key==='Escape') document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'))
    if(k==='d') document.querySelector('[onclick*="\'dashboard\'"]')?.click()
    if(k==='h') document.querySelector('[onclick*="\'habitos\'"]')?.click()
    if(k==='f') document.querySelector('[onclick*="\'financas\'"]')?.click()
    if(k==='n'||k==='t'){
      document.querySelector('[onclick*="\'tarefas\'"]')?.click()
      setTimeout(()=>document.getElementById('tk-input')?.focus(), 80)
    }
  })

  // Sincronização inteligente e ultra-rápida (tempo real dinâmico)
  let metadataSyncInterval = null
  function startMetadataSync() {
    if (metadataSyncInterval) clearInterval(metadataSyncInterval)
    syncUserMetadataInBackground()
    metadataSyncInterval = setInterval(syncUserMetadataInBackground, 1500)
  }
  function stopMetadataSync() {
    if (metadataSyncInterval) { clearInterval(metadataSyncInterval); metadataSyncInterval = null }
  }

  // Monitora visibilidade para poupar recursos e bateria
  window.addEventListener('focus', startMetadataSync)
  window.addEventListener('blur', stopMetadataSync)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') startMetadataSync()
    else stopMetadataSync()
  })

  // Sincroniza instantaneamente ao tocar/clicar na tela
  document.addEventListener('pointerdown', () => {
    const now = Date.now()
    if (!window._lastClickSync || now - window._lastClickSync > 1500) {
      window._lastClickSync = now
      syncUserMetadataInBackground()
    }
  })

  // Inicia o sincronizador ultra-rápido ativo
  startMetadataSync()
}

async function syncUserMetadataInBackground() {
  if (typeof currentUser === 'undefined' || !currentUser || currentUser.id === 'local-dev' || typeof db === 'undefined') return
  try {
    const { data: { user } } = await db.auth.getUser()
    if (!user) return

    const metaChanged = JSON.stringify(user.user_metadata) !== JSON.stringify(currentUser.user_metadata)
    if (metaChanged) {
      currentUser = user
      localStorage.setItem('wd_poupanca', parseFloat(user.user_metadata.wd_poupanca || 0).toFixed(2))
      renderFinancas()
      if (typeof updateStats === 'function') updateStats()
      if (typeof renderDashboard === 'function') renderDashboard()
      showUserInfo()
    }

    // Fallback: verifica cada tabela sem sobrescrever se houver sync em andamento
    const tables = ['habitos','tarefas','compras','financas','projetos','brain']
    for (const table of tables) {
      if (!syncInProgress[table]) await fetchAndMergeTable(table)
    }
  } catch(e) {
    console.warn('Erro ao sincronizar em segundo plano:', e)
  }
}

async function syncAllTablesFromServer(force = false) {
  if (typeof currentUser === 'undefined' || !currentUser || currentUser.id === 'local-dev') return
  try {
    const uid = currentUser.id
    const [h,t,c,f,p,b] = await Promise.all([
      db.from('habitos').select('*').eq('user_id',uid),
      db.from('tarefas').select('*').eq('user_id',uid),
      db.from('compras').select('*').eq('user_id',uid),
      db.from('financas').select('*').eq('user_id',uid),
      db.from('projetos').select('*').eq('user_id',uid),
      db.from('brain').select('*').eq('user_id',uid),
    ])

    // SAFETY: skip update if any query returned an error (network issue, etc.)
    if(h.error||t.error||c.error||f.error||p.error||b.error){
      console.warn('[Sync] Server error, skipping cache update')
      return
    }
    // SAFETY: skip update if server returned null (shouldn't happen, but just in case)
    if(h.data===null||t.data===null||c.data===null||f.data===null||p.data===null||b.data===null){
      console.warn('[Sync] Null response, skipping cache update')
      return
    }

    const prevHabitos = JSON.stringify(cache.habitos)
    const prevTarefas = JSON.stringify(cache.tarefas)
    const prevFinancas = JSON.stringify(cache.financas)
    const prevProjetos = JSON.stringify(cache.projetos)
    const prevBrain = JSON.stringify(cache.brain)
    const prevCompras = JSON.stringify(cache.compras)

    cache.habitos = (h.data||[]).map(r=>({id:r.id,nome:r.nome,tipo:r.tipo,duracao:r.duracao,hora:r.hora,dias:r.dias||[0,1,2,3,4,5,6],done:r.done||[],createdAt:r.created_at}))
    cache.tarefas = (t.data||[]).map(r=>({id:r.id,nome:r.nome,prio:r.prio,prazo:r.prazo,done:r.done,is_daily:r.is_daily,seq:r.seq||0,createdAt:r.created_at}))
    cache.compras = (c.data||[]).map(r=>({id:r.id,nome:r.nome,cat:r.cat,bought:r.bought}))
    cache.financas = (f.data||[]).map(r=>({id:r.id,desc:r.descricao,val:parseFloat(r.val),tipo:r.tipo,cat:r.cat,date:r.date,status:r.status||'pago'}))
    cache.projetos = (p.data||[]).map(r=>({id:r.id,nome:r.nome,desc:r.descricao,cat:r.cat,pct:r.pct,notas:r.notas||'',rascunhos:r.rascunhos||'',plano:r.plano||'',todo:r.todo||[],createdAt:r.created_at}))
    cache.brain = (b.data||[]).map(r=>({id:r.id,texto:r.texto,tag:r.tag,date:r.date}))

    const dataChanged = [
      prevHabitos, prevTarefas, prevFinancas, prevProjetos, prevBrain, prevCompras
    ].some((prev, i) => {
      const keys = ['habitos','tarefas','financas','projetos','brain','compras']
      return prev !== JSON.stringify(cache[keys[i]])
    })

    if (dataChanged || force) {
      const activePage = document.querySelector('.page.active')?.id?.replace('page-','')
      if (activePage && typeof renderPage === 'function') renderPage(activePage)
      if (typeof updateStats === 'function') updateStats()
      if (typeof renderDashboard === 'function') renderDashboard()
    }
  } catch(e) {
    console.warn('Erro ao recarregar tabelas do servidor:', e)
  }
}

const pendingFetches = {}

function setupRealtimeSync(){
  if (typeof currentUser === 'undefined' || !currentUser || currentUser.id === 'local-dev' || typeof db === 'undefined') return
  if (realtimeChannel) { db.removeChannel(realtimeChannel); realtimeChannel = null }

  const uid = currentUser.id
  const tables = ['habitos','tarefas','compras','financas','projetos','brain']
  realtimeChannel = db.channel('ws-sync')

  tables.forEach(table => {
    realtimeChannel.on('postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${uid}` },
      () => {
        if (pendingFetches[table]) clearTimeout(pendingFetches[table])
        pendingFetches[table] = setTimeout(() => {
          delete pendingFetches[table]
          fetchAndMergeTable(table)
        }, 300)
      }
    )
  })

  realtimeChannel.subscribe(status => {
    if (status === 'SUBSCRIBED') console.log('[RT] Conectado')
    else if (status === 'CHANNEL_ERROR') console.warn('[RT] Erro')
  })
}

async function fetchAndMergeTable(table){
  if (typeof currentUser === 'undefined' || !currentUser || currentUser.id === 'local-dev') return
  if (syncInProgress[table]) return
  try {
    const { data, error } = await db.from(table).select('*').eq('user_id', currentUser.id)
    if (error || data === null) return

    const mappers = {
      habitos: r=>({id:r.id,nome:r.nome,tipo:r.tipo,duracao:r.duracao,hora:r.hora,dias:r.dias||[0,1,2,3,4,5,6],done:r.done||[],createdAt:r.created_at}),
      tarefas: r=>({id:r.id,nome:r.nome,prio:r.prio,prazo:r.prazo,done:r.done,is_daily:r.is_daily,seq:r.seq||0,createdAt:r.created_at}),
      compras: r=>({id:r.id,nome:r.nome,cat:r.cat,bought:r.bought}),
      financas: r=>({id:r.id,desc:r.descricao,val:parseFloat(r.val),tipo:r.tipo,cat:r.cat,date:r.date,status:r.status||'pago'}),
      projetos: r=>({id:r.id,nome:r.nome,desc:r.descricao,cat:r.cat,pct:r.pct,notas:r.notas||'',rascunhos:r.rascunhos||'',plano:r.plano||'',todo:r.todo||[],createdAt:r.created_at}),
      brain: r=>({id:r.id,texto:r.texto,tag:r.tag,date:r.date}),
    }
    const mapFn = mappers[table]
    if (!mapFn) return

    const newData = (data||[]).map(mapFn)
    const prev = JSON.stringify(cache[table]||[])
    const curr = JSON.stringify(newData)

    if (prev !== curr) {
      cache[table] = newData
      const activePage = document.querySelector('.page.active')?.id?.replace('page-','')
      if (activePage && typeof renderPage === 'function') renderPage(activePage)
      if (typeof updateStats === 'function') updateStats()
      if (typeof renderDashboard === 'function') renderDashboard()
    }
  } catch(e) {
    console.warn('[RT] Erro em '+table, e)
  }
}

init()
