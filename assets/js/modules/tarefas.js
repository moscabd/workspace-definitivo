/* Stubs dos módulos - implementar depois */

const Tarefas = { init() { this.data = S.get('tarefas') || []; }, render(id) { document.getElementById(id).innerHTML = '<div class="page" id="page-tarefas"><div class="empty">Tarefas em desenvolvimento</div></div>'; } };
const Habitos = { init() { this.data = S.get('habitos') || []; }, render(id) { document.getElementById(id).innerHTML = '<div class="page" id="page-habitos"><div class="empty">Hábitos em desenvolvimento</div></div>'; } };
const Projetos = { init() { this.data = S.get('projetos') || []; }, render(id) { document.getElementById(id).innerHTML = '<div class="page" id="page-projetos"><div class="empty">Projetos em desenvolvimento</div></div>'; } };
const Financas = { init() { this.data = S.get('financas') || []; }, render(id) { document.getElementById(id).innerHTML = '<div class="page" id="page-financas"><div class="empty">Finanças em desenvolvimento</div></div>'; } };
const Compras = { init() { this.data = S.get('compras') || []; }, render(id) { document.getElementById(id).innerHTML = '<div class="page" id="page-compras"><div class="empty">Compras em desenvolvimento</div></div>'; } };
const BemEstar = { init() { this.data = S.getSingle('bemEstar', {}); }, render(id) { document.getElementById(id).innerHTML = '<div class="page" id="page-bemEstar"><div class="empty">Bem-estar em desenvolvimento</div></div>'; } };

Tarefas.init();
Habitos.init();
Projetos.init();
Financas.init();
Compras.init();
BemEstar.init();
