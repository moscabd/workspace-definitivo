/* ════════════════════════════════════════════════════════
   MÓDULO IKIGAI - Propósito e Alinhamento
   ════════════════════════════════════════════════════════ */

const Ikigai = {
  // Estrutura de dados:
  // { passion: [], talent: [], need: [], return: [] }

  init() {
    this.data = S.getSingle('ikigai', { passion: [], talent: [], need: [], return: [] });
  },

  add(category, text) {
    if (!text || typeof text !== 'string') return;
    const cleaned = Utils.validateText(text, 200);
    if (!cleaned) return;
    if (!this.data[category]) this.data[category] = [];
    this.data[category].push({
      id: Security.generateId(),
      text: cleaned,
      createdAt: Utils.today()
    });
    this.save();
  },

  remove(category, id) {
    if (!this.data[category]) return;
    const safeId = Utils.validateNumber(id, 1);
    if (!safeId) return;
    this.data[category] = this.data[category].filter(item => item.id !== safeId);
    this.save();
  },

  get(category) {
    return this.data[category] || [];
  },

  getAll() {
    return this.data;
  },

  save() {
    S.setSingle('ikigai', this.data);
    Events.emit('ikigai:updated', this.data);
  },

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
      <div class="page" id="page-ikigai">
        <div class="ikigai-container">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 32px; margin-bottom: 8px;">🎯 Seu Ikigai</h1>
            <p style="color: var(--text3); font-size: 14px;">
              A interseção perfeita entre o que você ama, o que sabe fazer, o que o mundo precisa e pelo que pode ser pago.
            </p>
            <button class="wd-btn btn-primary" style="margin-top: 12px;" onclick="Ikigai.suggestWithAI()">
              ✨ Sugestões com IA
            </button>
          </div>

          <div class="ikigai-diagram">
            ${this.renderQuadrant('passion', '❤️ Paixão', 'O que você ama fazer?')}
            ${this.renderQuadrant('talent', '⭐ Talento', 'O que você é bom?')}
            ${this.renderQuadrant('need', '🌍 Necessidade', 'O que o mundo precisa?')}
            ${this.renderQuadrant('return', '💰 Retorno', 'Pelo que pode ser pago?')}

            <div class="ikigai-center">
              <div class="ikigai-center-icon">✨</div>
              <div class="ikigai-center-title">Seu Ikigai</div>
              <div class="ikigai-center-desc">
                Quando os 4 quadrantes se alinham, você encontra seu verdadeiro propósito.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  renderQuadrant(category, title, subtitle) {
    const items = this.get(category);

    return `
      <div class="ikigai-quadrant ${category}">
        <div class="ikigai-header">
          <span class="ikigai-icon">${title.split(' ')[0]}</span>
          <span>${title.split(' ').slice(1).join(' ')}</span>
        </div>

        <div style="font-size: 11px; color: var(--text3); margin-bottom: 12px;">
          ${subtitle}
        </div>

        <div class="ikigai-list">
          ${items.map(item => `
            <div class="ikigai-item">
              <div class="ikigai-item-text">${Utils.sanitize(item.text)}</div>
              <button class="ikigai-item-btn" onclick="Ikigai.remove('${category}', ${item.id}); Ikigai.render('mainContent')">✕</button>
            </div>
          `).join('')}
          ${items.length === 0 ? '<div style="color: var(--text3); font-size: 12px; font-style: italic;">Adicione itens...</div>' : ''}
        </div>

        <div class="ikigai-input-area">
          <input
            type="text"
            placeholder="Adicionar item..."
            id="ikigai-input-${category}"
            onkeypress="if(event.key==='Enter') { Ikigai.add('${category}', document.getElementById('ikigai-input-${category}').value); Ikigai.render('mainContent'); }"
          >
          <button onclick="Ikigai.add('${category}', document.getElementById('ikigai-input-${category}').value); Ikigai.render('mainContent');">+</button>
        </div>
      </div>
    `;
  }
};

  suggestWithAI() {
    const loading = document.createElement('div');
    loading.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: var(--bg2); padding: 30px; border-radius: 10px; border: 1px solid var(--border);
                  z-index: 1000; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 12px;">⏳</div>
        <div>Gerando sugestões com IA...</div>
        <div style="font-size: 12px; color: var(--text3); margin-top: 8px;">Isso pode levar alguns segundos</div>
      </div>
    `;
    document.body.appendChild(loading);

    GroqAPI.suggestIkigai(
      this.data.passion.map(p => p.text),
      this.data.talent.map(t => t.text),
      this.data.need.map(n => n.text),
      this.data.return.map(r => r.text)
    ).then(suggestion => {
      loading.remove();
      if (suggestion) {
        alert('💡 Sugestões de Ikigai:\n\n' + suggestion);
      } else {
        alert('❌ Erro ao gerar sugestões. Tente novamente.');
      }
    });
  }
};

// Inicializar
Ikigai.init();
