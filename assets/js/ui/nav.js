/* ════════════════════════════════════════════════════════
   NAVEGAÇÃO
   ════════════════════════════════════════════════════════ */

const pageNames = {
  dashboard: 'Painel Geral',
  ikigai: 'Ikigai',
  visao: 'Visão de Vida',
  habitos: 'Hábitos',
  tarefas: 'Tarefas',
  projetos: 'Projetos',
  financas: 'Finanças',
  compras: 'Lista de Compras',
  bemEstar: 'Bem-Estar',
  cerebro: 'Segundo Cérebro',
  agenda: 'Google Agenda',
  config: 'Configurações'
};

function nav(page, el, mode) {
  document.querySelectorAll('.page').forEach(p => p.remove());

  document.getElementById('pageTitle').textContent = pageNames[page] || page;

  if (mode === 'mob') {
    document.querySelectorAll('.mob-nav-item').forEach(i => i.classList.remove('active'));
  } else {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  }
  if (el) el.classList.add('active');

  const content = document.getElementById('mainContent');
  content.innerHTML = '';

  if (page === 'ikigai') {
    Ikigai.render('mainContent');
  } else if (page === 'visao') {
    Vision.render('mainContent');
  } else if (page === 'cerebro') {
    SegundoCerebro.render('mainContent');
  } else if (page === 'config') {
    ConfigModule.render('mainContent');
  } else if (page === 'dashboard') {
    content.innerHTML = '<div class="page active" id="page-dashboard"><div class="empty" style="padding: 60px;"><h2>Dashboard</h2><p style="margin-top: 20px;">Em desenvolvimento...</p></div></div>';
  } else if (page === 'habitos') {
    content.innerHTML = '<div class="page active" id="page-habitos"><div class="empty" style="padding: 60px;"><h2>Hábitos</h2><p style="margin-top: 20px;">Em desenvolvimento...</p></div></div>';
  } else if (page === 'tarefas') {
    content.innerHTML = '<div class="page active" id="page-tarefas"><div class="empty" style="padding: 60px;"><h2>Tarefas</h2><p style="margin-top: 20px;">Em desenvolvimento...</p></div></div>';
  } else if (page === 'projetos') {
    content.innerHTML = '<div class="page active" id="page-projetos"><div class="empty" style="padding: 60px;"><h2>Projetos</h2><p style="margin-top: 20px;">Em desenvolvimento...</p></div></div>';
  } else if (page === 'financas') {
    content.innerHTML = '<div class="page active" id="page-financas"><div class="empty" style="padding: 60px;"><h2>Finanças</h2><p style="margin-top: 20px;">Em desenvolvimento...</p></div></div>';
  } else if (page === 'compras') {
    content.innerHTML = '<div class="page active" id="page-compras"><div class="empty" style="padding: 60px;"><h2>Compras</h2><p style="margin-top: 20px;">Em desenvolvimento...</p></div></div>';
  } else if (page === 'bemEstar') {
    content.innerHTML = '<div class="page active" id="page-bemEstar"><div class="empty" style="padding: 60px;"><h2>Bem-Estar</h2><p style="margin-top: 20px;">Em desenvolvimento...</p></div></div>';
  } else if (page === 'agenda') {
    content.innerHTML = '<div class="page active" id="page-agenda"><div class="empty" style="padding: 60px;"><h2>Google Agenda</h2><p style="margin-top: 20px;">Em desenvolvimento...</p></div></div>';
  }
}
