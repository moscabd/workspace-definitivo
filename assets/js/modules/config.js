/* ════════════════════════════════════════════════════════
   MÓDULO CONFIGURAÇÕES - API Key, Backup, Segurança
   ════════════════════════════════════════════════════════ */

const ConfigModule = {
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isConfigured = GroqAPI.isConfigured();

    const html = `
      <div class="page" id="page-config">
        <div style="max-width: 700px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 28px; margin-bottom: 8px;">⚙️ Configurações</h1>
            <p style="color: var(--text3);">API, Backup, Segurança</p>
          </div>

          <!-- API KEY -->
          <div class="card" style="margin-bottom: 20px;">
            <div class="card-title">🤖 Groq API</div>
            <p style="font-size: 12px; color: var(--text3); margin-bottom: 12px;">
              Configure sua chave de API para usar recursos de IA.
              A chave é salva de forma segura e criptografada.
            </p>
            <div style="display: flex; gap: 8px; align-items: center;">
              <input
                type="password"
                id="config-api-key"
                class="wd-input"
                placeholder="gsk_..."
                value="${isConfigured ? '••••••••••••••••' : ''}"
                style="flex: 1;"
              >
              <button class="wd-btn btn-primary" onclick="ConfigModule.saveApiKey()">
                ${isConfigured ? 'Atualizar' : 'Salvar'}
              </button>
              ${isConfigured ? '<button class="wd-btn btn-danger btn-sm" onclick="ConfigModule.clearApiKey()">Remover</button>' : ''}
            </div>
            <div id="config-api-status" style="margin-top: 8px; font-size: 11px; color: var(--text3);"></div>
            <div style="margin-top: 10px; font-size: 11px; color: var(--text3);">
              Obtenha sua chave em <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">console.groq.com</a>
            </div>
          </div>

          <!-- BACKUP -->
          <div class="card" style="margin-bottom: 20px;">
            <div class="card-title">💾 Backup de Dados</div>
            <p style="font-size: 12px; color: var(--text3); margin-bottom: 12px;">
              Exporte todos os seus dados para backup ou importe de um arquivo.
            </p>
            <div style="display: flex; gap: 8px;">
              <button class="wd-btn btn-primary" onclick="ConfigModule.exportData()">📤 Exportar Dados</button>
              <button class="wd-btn btn-ghost" onclick="document.getElementById('config-import-file').click()">📥 Importar Dados</button>
              <input type="file" id="config-import-file" accept=".json" style="display:none" onchange="ConfigModule.importData(this)">
            </div>
          </div>

          <!-- LIMPAR DADOS -->
          <div class="card" style="border-color: var(--accent4);">
            <div class="card-title" style="color: var(--accent4);">⚠️ Zona de Perigo</div>
            <p style="font-size: 12px; color: var(--text3); margin-bottom: 12px;">
              Apagar todos os dados permanentemente. Esta ação não pode ser desfeita.
            </p>
            <button class="wd-btn btn-danger" onclick="ConfigModule.clearAllData()">🗑️ Apagar Todos os Dados</button>
          </div>

          <!-- INFO SEGURANÇA -->
          <div class="card" style="margin-top: 20px;">
            <div class="card-title">🔒 Segurança</div>
            <div style="font-size: 12px; color: var(--text3); line-height: 1.8;">
              <div>✅ Dados criptografados no LocalStorage</div>
              <div>✅ Proteção contra XSS (sanitização)</div>
              <div>✅ Proteção contra clickjacking</div>
              <div>✅ Rate limiting na API</div>
              <div>✅ Validação de todos os inputs</div>
              <div>✅ API key armazenada de forma segura</div>
              <div>✅ Headers de segurança (CSP, X-Frame)</div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  saveApiKey() {
    const input = document.getElementById('config-api-key');
    const status = document.getElementById('config-api-status');
    const key = input.value.trim();

    if (key === '••••••••••••••••') {
      status.style.color = 'var(--accent3)';
      status.textContent = 'Digite a nova chave para atualizar.';
      return;
    }

    const success = GroqAPI.setApiKey(key);
    if (success) {
      status.style.color = 'var(--accent2)';
      status.textContent = '✓ Chave salva com segurança!';
      input.value = '••••••••••••••••';
    } else {
      status.style.color = 'var(--accent4)';
      status.textContent = '✕ Chave inválida. Deve começar com "gsk_".';
    }
  },

  clearApiKey() {
    if (confirm('Remover a chave de API? As funcionalidades de IA pararão de funcionar.')) {
      GroqAPI.clearApiKey();
      this.render('mainContent');
    }
  },

  exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('wd_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-definitivo-backup-${Utils.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (confirm(`Importar ${Object.keys(data).length} itens? Isso substituirá os dados atuais.`)) {
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('wd_')) {
              localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            }
          }
          alert('✓ Dados importados com sucesso! A página será recarregada.');
          location.reload();
        }
      } catch (err) {
        alert('✕ Arquivo inválido. Deve ser um JSON de backup válido.');
      }
    };
    reader.readAsText(file);
    input.value = '';
  },

  clearAllData() {
    if (confirm('⚠️ Tem certeza? TODOS os dados serão apagados permanentemente.')) {
      if (confirm('Última chance! Isso NÃO pode ser desfeito. Continuar?')) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('wd_')) keys.push(key);
        }
        keys.forEach(k => localStorage.removeItem(k));
        alert('Dados apagados. A página será recarregada.');
        location.reload();
      }
    }
  }
};
