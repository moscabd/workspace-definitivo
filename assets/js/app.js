// ══════════════════════════════════════════
//  SUPABASE CONFIG — preencha após criar o projeto
// ══════════════════════════════════════════
const SUPABASE_URL = 'https://dpuqurchrhmibkzmskdr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdXF1cmNocmhtaWJrem1za2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTM4NTcsImV4cCI6MjA5MTIyOTg1N30.we9ui-K1_cXXD5UYYjtrc-Hrr1U2qKQwaO1qgUF-WX4'
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)
let currentUser = null
const cache = {}

// ══════════════════════════════════════════
//  SECURITY
// ══════════════════════════════════════════
function esc(str){
  if(typeof str!=='string')return''
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
}
function cleanInput(val,max){
  if(typeof val!=='string')return''
  return val.replace(/<[^>]*>/g,'').trim().substring(0,max||200)
}
function safeNum(val,min,max){
  const n=parseFloat(val)
  if(isNaN(n))return min||0
  return Math.max(min||0,Math.min(max||Infinity,n))
}
if(window.self!==window.top){window.top.location=window.self.location}

// ══════════════════════════════════════════
//  DATA SYNC — Supabase
// ══════════════════════════════════════════
async function loadAllData(){
  const uid = currentUser.id
  const [h,t,c,f,p,b] = await Promise.all([
    db.from('habitos').select('*').eq('user_id',uid),
    db.from('tarefas').select('*').eq('user_id',uid),
    db.from('compras').select('*').eq('user_id',uid),
    db.from('financas').select('*').eq('user_id',uid),
    db.from('projetos').select('*').eq('user_id',uid),
    db.from('brain').select('*').eq('user_id',uid),
  ])
  cache.habitos=(h.data||[]).map(r=>({id:r.id,nome:r.nome,tipo:r.tipo,done:r.done||[],createdAt:r.created_at}))
  cache.tarefas=(t.data||[]).map(r=>({id:r.id,nome:r.nome,prio:r.prio,prazo:r.prazo,done:r.done,createdAt:r.created_at}))
  cache.compras=(c.data||[]).map(r=>({id:r.id,nome:r.nome,cat:r.cat,bought:r.bought}))
  cache.financas=(f.data||[]).map(r=>({id:r.id,desc:r.descricao,val:parseFloat(r.val),tipo:r.tipo,cat:r.cat,date:r.date}))
  cache.projetos=(p.data||[]).map(r=>({id:r.id,nome:r.nome,desc:r.descricao,cat:r.cat,pct:r.pct,createdAt:r.created_at}))
  cache.brain=(b.data||[]).map(r=>({id:r.id,texto:r.texto,tag:r.tag,date:r.date}))
}

const tableMappers = {
  habitos: r=>({id:r.id,user_id:currentUser.id,nome:r.nome,tipo:r.tipo,done:r.done||[],created_at:r.createdAt}),
  tarefas: r=>({id:r.id,user_id:currentUser.id,nome:r.nome,prio:r.prio,prazo:r.prazo||null,done:r.done||false,created_at:r.createdAt}),
  compras: r=>({id:r.id,user_id:currentUser.id,nome:r.nome,cat:r.cat,bought:r.bought||false}),
  financas: r=>({id:r.id,user_id:currentUser.id,descricao:r.desc,val:r.val,tipo:r.tipo,cat:r.cat,date:r.date}),
  projetos: r=>({id:r.id,user_id:currentUser.id,nome:r.nome,descricao:r.desc||'',cat:r.cat,pct:r.pct||0,created_at:r.createdAt}),
  brain: r=>({id:r.id,user_id:currentUser.id,texto:r.texto,tag:r.tag,date:r.date}),
}

async function syncTable(key,data){
  if(!currentUser||!tableMappers[key])return
  try{
    await db.from(key).delete().eq('user_id',currentUser.id)
    if(data.length>0){
      const {error}=await db.from(key).insert(data.map(tableMappers[key]))
      if(error)console.error('Sync['+key+']',error)
    }
  }catch(e){console.error('Sync error',e)}
}

// ══════════════════════════════════════════
//  STORAGE (cache + Supabase)
// ══════════════════════════════════════════
const S = {
  get(k){return cache[k]||[]},
  set(k,v){cache[k]=v;syncTable(k,v)},
  getSingle(k,d){return cache[k]!==undefined?cache[k]:d}
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
  cerebro:'Segundo Cérebro',agenda:'Google Agenda'
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

  function makeItem(h){
    const done = h.done.includes(t)
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
          ${h.duracao?`<span class="hb-dur">${h.duracao}</span>`:''}
          <button class="wd-btn btn-ghost btn-sm" onclick="openHabitModal(${h.id})">Editar</button>
          <button class="wd-btn btn-danger btn-sm" onclick="deleteHabito(${h.id})">✕</button>
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

// ══════════════════════════════════════════
//  TAREFAS
// ══════════════════════════════════════════
const prioColors = {alta:'var(--accent4)',media:'var(--accent3)',baixa:'var(--accent2)'}

function addTarefa(){
  const nome = document.getElementById('tk-input').value.trim()
  const prio = document.getElementById('tk-prio').value
  const prazo = document.getElementById('tk-prazo').value
  if(!nome) return
  const list = S.get('tarefas')
  list.push({id:Date.now(),nome,prio,prazo,done:false,createdAt:today()})
  S.set('tarefas',list)
  document.getElementById('tk-input').value=''
  document.getElementById('tk-prazo').value=''
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

function renderTarefas(){
  const list = S.get('tarefas')
  const pend = list.filter(t=>!t.done)
  const done = list.filter(t=>t.done)

  function makeItem(t){
    return `<div class="task-item">
      <div class="task-check ${t.done?'done':''}" onclick="toggleTarefa(${t.id})"></div>
      <div class="task-prio" style="background:${prioColors[t.prio]}"></div>
      <div class="task-body">
        <div class="task-name ${t.done?'done':''}">${t.nome}</div>
        <div class="task-meta">${t.prio} ${t.prazo?'· '+formatDate(t.prazo):''}</div>
      </div>
      <button class="wd-btn btn-danger btn-sm" onclick="deleteTarefa(${t.id})">✕</button>
    </div>`
  }

  const pEl = document.getElementById('tk-list')
  const dEl = document.getElementById('tk-done-list')
  if(pEl) pEl.innerHTML = pend.length ? pend.map(makeItem).join('') : '<div class="empty">Nenhuma tarefa pendente 🎉</div>'
  if(dEl) dEl.innerHTML = done.length ? done.map(makeItem).join('') : '<div class="empty">Nenhuma concluída ainda</div>'
}

function formatDate(d){
  if(!d) return ''
  const [y,m,dd] = d.split('-')
  return `${dd}/${m}/${y}`
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
    return `<span class="shop-tag ${c.bought?'bought':''}" onclick="toggleCompra(${c.id})">
      <span class="shop-dot" style="background:${cpColors[c.cat]||'var(--text2)'}"></span>
      ${c.nome}
      <span onclick="event.stopPropagation();deleteCompra(${c.id})" style="margin-left:4px;color:var(--text3);font-size:13px">✕</span>
    </span>`
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
  'trabalho':['#1a2810','var(--accent2)'],
  'despesa-fixa':['#1a1835','var(--accent)'],
  'lazer':['#1a1020','#e879f9'],
  'alimentacao':['#2a1e10','var(--accent3)'],
  'saude':['#101a2a','var(--accent5)'],
  'investimento':['#0f2318','var(--accent2)'],
  'outro':['#1a1a1a','var(--text2)']
}

function addFinanca(){
  const desc = document.getElementById('fn-desc').value.trim()
  const val = parseFloat(document.getElementById('fn-val').value)
  const tipo = document.getElementById('fn-tipo').value
  const cat = document.getElementById('fn-cat').value
  if(!desc || isNaN(val) || val<=0) return
  const list = S.get('financas')
  list.push({id:Date.now(),desc,val,tipo,cat,date:today()})
  S.set('financas',list)
  document.getElementById('fn-desc').value=''
  document.getElementById('fn-val').value=''
  renderFinancas()
  updateStats()
}

function deleteFinanca(id){
  S.set('financas',S.get('financas').filter(f=>f.id!=id))
  renderFinancas()
  updateStats()
}

function renderFinancas(){
  const list = S.get('financas')
  const totalIn = list.filter(f=>f.tipo==='entrada').reduce((a,f)=>a+f.val,0)
  const totalOut = list.filter(f=>f.tipo==='saida').reduce((a,f)=>a+f.val,0)
  const saldo = totalIn - totalOut

  const fmtBRL = v => 'R$'+v.toFixed(2).replace('.',',')

  const tiEl = document.getElementById('fn-total-in')
  const toEl = document.getElementById('fn-total-out')
  const fsEl = document.getElementById('fn-saldo')
  if(tiEl) tiEl.textContent = fmtBRL(totalIn)
  if(toEl) toEl.textContent = fmtBRL(totalOut)
  if(fsEl){
    fsEl.textContent = fmtBRL(saldo)
    fsEl.style.color = saldo>=0?'var(--accent2)':'var(--accent4)'
  }

  const lEl = document.getElementById('fn-list')
  if(!lEl) return
  if(!list.length){lEl.innerHTML='<div class="empty">Nenhum lançamento ainda</div>';return}

  lEl.innerHTML = [...list].reverse().map(f=>{
    const [bg,fg] = catColors[f.cat]||catColors.outro
    return `<div class="fin-item">
      <div class="fin-info">
        <div class="fin-origin">${f.desc}</div>
        <span class="fin-cat-badge" style="background:${bg};color:${fg}">${f.cat}</span>
        <span style="font-size:13px;color:var(--text3);margin-left:6px">${formatDate(f.date)}</span>
      </div>
      <div class="fin-val ${f.tipo==='entrada'?'v-in':'v-out'}">${f.tipo==='entrada'?'+':'-'}R$${f.val.toFixed(2).replace('.',',')}</div>
      <button class="wd-btn btn-danger btn-sm" style="margin-left:8px" onclick="deleteFinanca(${f.id})">✕</button>
    </div>`
  }).join('')

  renderFinChart(list)
}

// ══════════════════════════════════════════
//  GRÁFICO FINANCEIRO — Donut por Categoria
// ══════════════════════════════════════════
const chartPalette = {
  'trabalho':    '#6c63ff',
  'despesa-fixa':'#a78bfa',
  'lazer':       '#e879f9',
  'alimentacao': '#f5a623',
  'saude':       '#38bdf8',
  'investimento':'#3fcf8e',
  'outro':       '#64748b'
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
  const textColor    = isLight ? '#1a1d2e' : '#e8e9ee'
  const subtextColor = isLight ? '#8a90ad' : '#454857'

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
  ctx.fillStyle = isLight ? '#f8f9fc' : '#111318'
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
  list.push({id:Date.now(),nome,desc,cat,pct,createdAt:today()})
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
  const list = S.get('projetos')
  const el = document.getElementById('proj-list-full')
  if(!el) return
  if(!list.length){el.innerHTML='<div class="empty" style="padding:60px">Nenhum projeto ainda. Clique em "+ Novo Projeto" para começar.</div>';return}

  el.innerHTML = list.map(p=>{
    const color = projColors[p.cat]||'var(--accent)'
    return `<div class="card" style="margin-bottom:14px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text1)">${p.nome}</div>
          ${p.desc?`<div style="font-size:15px;color:var(--text3);margin-top:4px">${p.desc}</div>`:''}
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="ptag">${p.cat}</span>
          <button class="wd-btn btn-ghost btn-sm" onclick="openEditProg(${p.id},${p.pct})">Atualizar</button>
          <button class="wd-btn btn-danger btn-sm" onclick="deleteProjeto(${p.id})">✕</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="prog-bar" style="flex:1">
          <div class="prog-fill" style="width:${p.pct}%;background:${color}"></div>
        </div>
        <div style="font-size:17px;font-weight:600;color:${color};min-width:40px;text-align:right">${p.pct}%</div>
      </div>
      <div style="font-size:13px;color:var(--text3);margin-top:6px">Criado em ${formatDate(p.createdAt)}</div>
    </div>`
  }).join('')
}

// ══════════════════════════════════════════
//  SEGUNDO CÉREBRO
// ══════════════════════════════════════════
const tagColors = {
  ideia:['#1e1a10','var(--accent3)'],
  projeto:['#1a1835','var(--accent)'],
  aprendizado:['#101a2a','var(--accent5)'],
  reflexao:['#18102a','#c084fc'],
  referencia:['#0f2318','var(--accent2)'],
  outro:['#1a1a1a','var(--text2)']
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
  if(!el) return
  if(!list.length){el.innerHTML='<div class="empty">Jogue sua primeira ideia aqui 💡</div>';return}

  el.innerHTML = [...list].reverse().map(n=>{
    const [bg,fg] = tagColors[n.tag]||tagColors.outro
    return `<div class="brain-note">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span class="fin-cat-badge" style="background:${bg};color:${fg}">${tagIcons[n.tag]} ${n.tag}</span>
        <button class="wd-btn btn-danger btn-sm" onclick="deleteNota(${n.id})">✕</button>
      </div>
      <div class="brain-note-text">${n.texto.replace(/\n/g,'<br>')}</div>
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
    const pend = tarefas.filter(t=>!t.done).slice(0,5)
    if(!pend.length){dtEl.innerHTML='<div class="empty">Nenhuma tarefa pendente 🎉</div>'}
    else {
      dtEl.innerHTML = pend.map(t=>`<div class="task-item">
        <div class="task-check ${t.done?'done':''}" onclick="toggleTarefa(${t.id})"></div>
        <div class="task-prio" style="background:${prioColors[t.prio]}"></div>
        <div class="task-body">
          <div class="task-name">${t.nome}</div>
          <div class="task-meta">${t.prio}${t.prazo?' · '+formatDate(t.prazo):''}</div>
        </div>
      </div>`).join('')
    }
  }

  // projetos mini
  const dpEl = document.getElementById('dash-proj-list')
  if(dpEl){
    if(!projetos.length){dpEl.innerHTML='<div class="empty">Nenhum projeto</div>'}
    else{
      dpEl.innerHTML = projetos.slice(0,4).map(p=>{
        const color = projColors[p.cat]||'var(--accent)'
        return `<div class="proj-item">
          <div class="proj-header"><div class="proj-name">${p.nome}</div><div class="proj-pct" style="color:${color}">${p.pct}%</div></div>
          <div class="prog-bar"><div class="prog-fill" style="width:${p.pct}%;background:${color}"></div></div>
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
        return `<div class="fin-item">
          <div class="fin-info"><div class="fin-origin" style="font-size:15px">${f.desc}</div></div>
          <div class="fin-val ${f.tipo==='entrada'?'v-in':'v-out'}" style="font-size:15px">${f.tipo==='entrada'?'+':'-'}R$${f.val.toFixed(2)}</div>
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
  const totalIn = financas.filter(f=>f.tipo==='entrada').reduce((a,f)=>a+f.val,0)
  const totalOut = financas.filter(f=>f.tipo==='saida').reduce((a,f)=>a+f.val,0)
  const saldo = totalIn - totalOut
  const pendentes = tarefas.filter(t=>!t.done).length

  const dsh = document.getElementById('ds-habitos')
  const dst = document.getElementById('ds-tarefas')
  const dss = document.getElementById('ds-saldo')
  const thl = document.getElementById('todayHabitsLabel')

  if(dsh) dsh.textContent = `${done}/${total}`
  if(dst) dst.textContent = pendentes
  if(dss){
    dss.textContent = 'R$'+saldo.toLocaleString('pt-BR',{minimumFractionDigits:0})
    dss.style.color = saldo>=0?'var(--accent2)':'var(--accent4)'
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
// ══════════════════════════════════════════
//  DEV MODE — localhost pula login
// ══════════════════════════════════════════
const IS_DEV = ['localhost','127.0.0.1'].includes(window.location.hostname)

async function init(){
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
    currentUser=session.user
    try{await loadAllData()}catch(e){console.error('Load error',e)}
  }
  initDate()
  initTheme()
  renderDashboard()
  showUserInfo()
}
init()