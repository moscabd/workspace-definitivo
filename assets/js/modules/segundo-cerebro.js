/* ════════════════════════════════════════════════════════
   MÓDULO SEGUNDO CÉREBRO 2.0
   ════════════════════════════════════════════════════════ */

const SegundoCerebro = {
  init() {
    this.data = S.get('brain') || [];
  },

  add(text, tag) {
    if (!text.trim()) return;
    this.data.push({
      id: Utils.generateId(),
      text: text.trim(),
      tag: tag,
      date: Utils.today(),
      links: []
    });
    this.save();
  },

  delete(id) {
    this.data = this.data.filter(n => n.id !== id);
    this.save();
  },

  save() {
    S.set('brain', this.data);
    Events.emit('cerebro:updated', this.data);
  },

  search(query) {
    const q = query.toLowerCase();
    return this.data.filter(n => n.text.toLowerCase().includes(q) || n.tag.includes(q));
  },

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const html = `
      <div class="page" id="page-cerebro">
        <div style="max-width: 800px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 28px; margin-bottom: 8px;">🧠 Segundo Cérebro</h1>
            <p style="color: var(--text3);">Capture ideias, insights e referências</p>
            ${this.data.length > 0 ? `<button class="wd-btn btn-primary btn-sm" style="margin-top: 8px;" onclick="SegundoCerebro.analyzeWithAI()">🤖 Análise com IA</button>` : ''}
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
            <textarea
              id="br-input"
              class="wd-input"
              rows="3"
              placeholder="Jogue aqui uma ideia, pensamento, insight, referência..."
              style="resize: vertical; width: 100%;"
            ></textarea>
            <div style="display: flex; gap: 8px;">
              <select id="br-tag" class="wd-select">
                <option value="ideia">💡 Ideia</option>
                <option value="projeto">🚀 Projeto</option>
                <option value="aprendizado">📚 Aprendizado</option>
                <option value="reflexao">🔮 Reflexão</option>
                <option value="referencia">🔗 Referência</option>
                <option value="outro">📌 Outro</option>
              </select>
              <button class="wd-btn btn-primary" onclick="
                SegundoCerebro.add(
                  document.getElementById('br-input').value,
                  document.getElementById('br-tag').value
                );
                document.getElementById('br-input').value = '';
                SegundoCerebro.render('mainContent');
              ">+ Salvar nota</button>
            </div>
          </div>

          <div id="brain-list"></div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this.renderNotes();
  },

  analyzeWithAI() {
    const loading = document.createElement('div');
    loading.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: var(--bg2); padding: 30px; border-radius: 10px; border: 1px solid var(--border);
                  z-index: 1000; text-align: center; max-width: 400px;">
        <div style="font-size: 24px; margin-bottom: 12px;">⏳</div>
        <div>Analisando suas ideias com IA...</div>
      </div>
    `;
    document.body.appendChild(loading);

    GroqAPI.analyzeIdeas(this.data).then(analysis => {
      loading.remove();
      if (analysis) {
        const modal = document.createElement('div');
        modal.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); 
                      display: flex; align-items: center; justify-content: center; z-index: 1000;" id="ai-modal-overlay">
            <div style="background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; 
                        padding: 30px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="font-size: 18px;">🤖 Análise de Ideias</h3>
                <button onclick="document.getElementById('ai-modal-overlay').remove()" 
                        style="background: transparent; border: none; color: var(--text3); cursor: pointer; font-size: 20px;">✕</button>
              </div>
              <div style="color: var(--text2); line-height: 1.8; white-space: pre-wrap; font-size: 13px;">
                ${Utils.sanitize(analysis).replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      } else {
        alert('❌ Erro ao analisar. Tente novamente.');
      }
    });
  },

  renderNotes() {
    const list = document.getElementById('brain-list');
    if (!list) return;

    if (this.data.length === 0) {
      list.innerHTML = '<div class="empty">Jogue sua primeira ideia aqui 💡</div>';
      return;
    }

    const tagEmojis = { ideia: '💡', projeto: '🚀', aprendizado: '📚', reflexao: '🔮', referencia: '🔗', outro: '📌' };
    const tagColors = {
      ideia: ['#1e1a10', 'var(--accent3)'],
      projeto: ['#1a1835', 'var(--accent)'],
      aprendizado: ['#101a2a', 'var(--accent5)'],
      reflexao: ['#18102a', '#c084fc'],
      referencia: ['#0f2318', 'var(--accent2)'],
      outro: ['#1a1a1a', 'var(--text2)']
    };

    list.innerHTML = [...this.data].reverse().map(n => {
      const [bg, fg] = tagColors[n.tag] || tagColors.outro;
      return `
        <div style="background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="badge" style="background: ${bg}; color: ${fg};">${tagEmojis[n.tag]} ${n.tag}</span>
            <button class="wd-btn btn-danger btn-sm" onclick="SegundoCerebro.delete(${n.id}); SegundoCerebro.render('mainContent');">✕</button>
          </div>
          <div style="color: var(--text2); line-height: 1.6; margin-bottom: 6px;">${Utils.sanitize(n.text).replace(/\n/g, '<br>')}</div>
          <div style="font-size: 10px; color: var(--text3);">${Utils.formatDate(n.date)}</div>
        </div>
      `;
    }).join('');
  }
};

SegundoCerebro.init();
