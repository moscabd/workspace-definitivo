/* ════════════════════════════════════════════════════════
   APP INITIALIZATION
   ════════════════════════════════════════════════════════ */

function initApp() {
  // Inicializar data
  const d = new Date();
  const ds = d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  document.getElementById('topDate').textContent = ds;

  // Carregar dashboard por padrão
  nav('dashboard', document.querySelector('[onclick*="dashboard"]'));
}

// Esperar DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
