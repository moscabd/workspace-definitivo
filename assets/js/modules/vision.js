/* ════════════════════════════════════════════════════════
   MÓDULO VISÃO DE VIDA - Missão, Valores, Objetivos
   ════════════════════════════════════════════════════════ */

const Vision = {
  // Estrutura:
  // {
  //   mission: string,
  //   values: [string],
  //   pillars: [{ name, description }],
  //   objectives: [{ year, text, status }]
  // }

  init() {
    this.data = S.getSingle('vision', {
      mission: '',
      values: [],
      pillars: [],
      objectives: []
    });
  },

  updateMission(text) {
    this.data.mission = Utils.validateText(text, 1000);
    this.save();
  },

  addValue(text) {
    if (!text || typeof text !== 'string') return;
    const cleaned = Utils.validateText(text, 100);
    if (!cleaned) return;
    if (!this.data.values.includes(cleaned)) {
      this.data.values.push(cleaned);
      this.save();
    }
  },

  removeValue(index) {
    this.data.values.splice(index, 1);
    this.save();
  },

  addPillar(name, description) {
    const nameClean = Utils.validateText(name, 100);
    const descClean = Utils.validateText(description, 300);
    if (!nameClean) return;
    this.data.pillars.push({
      id: Security.generateId(),
      name: nameClean,
      description: descClean
    });
    this.save();
  },

  removePillar(id) {
    this.data.pillars = this.data.pillars.filter(p => p.id !== id);
    this.save();
  },

  addObjective(year, text) {
    this.data.objectives.push({
      id: Utils.generateId(),
      year: year,
      text: text.trim(),
      status: 'pending',
      createdAt: Utils.today()
    });
    this.save();
  },

  removeObjective(id) {
    this.data.objectives = this.data.objectives.filter(o => o.id !== id);
    this.save();
  },

  updateObjectiveStatus(id, status) {
    const obj = this.data.objectives.find(o => o.id === id);
    if (obj) obj.status = status;
    this.save();
  },

  save() {
    S.setSingle('vision', this.data);
    Events.emit('vision:updated', this.data);
  },

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const objectives1y = this.data.objectives.filter(o => o.year === '1');
    const objectives5y = this.data.objectives.filter(o => o.year === '5');
    const objectives10y = this.data.objectives.filter(o => o.year === '10');

    const html = `
      <div class="page" id="page-visao">
        <div class="vision-container">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="font-size: 32px; margin-bottom: 8px;">🌟 Sua Visão de Vida</h1>
            <p style="color: var(--text3); font-size: 14px;">
              Defina sua missão, valores, pilares pessoais e objetivos para diferentes horizontes.
            </p>
          </div>

          <!-- MISSÃO -->
          <div class="vision-section">
            <div class="vision-title">
              <span style="font-size: 20px;">📖</span>
              Missão Pessoal
            </div>
            <div class="vision-subtitle">Por que você existe? Qual é seu propósito?</div>
            <div class="vision-input-area">
              <textarea
                placeholder="Descreva sua missão pessoal..."
                rows="3"
                id="vision-mission"
                onchange="Vision.updateMission(this.value)"
              >${Utils.sanitize(this.data.mission)}</textarea>
              <button class="wd-btn btn-primary btn-sm" onclick="Vision.refineMissionWithAI()">
                ✨ Refinar com IA
              </button>
            </div>
          </div>

          <!-- VALORES -->
          <div class="vision-section">
            <div class="vision-title">
              <span style="font-size: 20px;">💎</span>
              Valores Core
            </div>
            <div class="vision-subtitle">O que você defende? Quais são seus princípios?</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
              ${this.data.values.map((value, idx) => `
                <span class="badge badge-primary" style="cursor: pointer;" onclick="Vision.removeValue(${idx}); Vision.render('mainContent');">
                  ${Utils.sanitize(value)} ✕
                </span>
              `).join('')}
            </div>
            <div class="vision-input-area">
              <input
                type="text"
                placeholder="Adicione um valor..."
                id="vision-value-input"
                onkeypress="if(event.key==='Enter') { Vision.addValue(this.value); this.value=''; Vision.render('mainContent'); }"
              >
            </div>
          </div>

          <!-- PILARES PESSOAIS -->
          <div class="vision-section">
            <div class="vision-title">
              <span style="font-size: 20px;">🏛️</span>
              Pilares de Vida
            </div>
            <div class="vision-subtitle">Quais são as áreas mais importantes da sua vida?</div>
            <div class="vision-pillars">
              ${this.data.pillars.map(pillar => `
                <div class="vision-pillar" onclick="if(confirm('Remover este pilar?')) { Vision.removePillar(${pillar.id}); Vision.render('mainContent'); }">
                  <div class="vision-pillar-name">${Utils.sanitize(pillar.name)}</div>
                  <div class="vision-pillar-desc">${Utils.sanitize(pillar.description)}</div>
                </div>
              `).join('')}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <input
                type="text"
                placeholder="Nome do pilar (ex: Saúde, Família)"
                id="vision-pillar-name"
                style="flex: 1;"
              >
              <input
                type="text"
                placeholder="Descrição"
                id="vision-pillar-desc"
                style="flex: 2;"
              >
              <button class="wd-btn btn-primary btn-sm" onclick="
                Vision.addPillar(
                  document.getElementById('vision-pillar-name').value,
                  document.getElementById('vision-pillar-desc').value
                );
                document.getElementById('vision-pillar-name').value = '';
                document.getElementById('vision-pillar-desc').value = '';
                Vision.render('mainContent');
              ">+</button>
            </div>
          </div>

          <!-- OBJETIVOS POR HORIZONTE -->
          <div class="vision-section">
            <div class="vision-title">
              <span style="font-size: 20px;">🎯</span>
              Objetivos por Horizonte
            </div>

            <!-- 1 ANO -->
            <div style="margin-bottom: 20px;">
              <h4 style="color: var(--accent); margin-bottom: 12px; font-size: 14px;">📆 Próximo 1 Ano</h4>
              <div class="vision-objectives">
                ${objectives1y.map(obj => this.renderObjective(obj)).join('')}
              </div>
              <div style="display: flex; gap: 8px; margin-top: 12px;">
                <input
                  type="text"
                  placeholder="Nova meta para 1 ano..."
                  id="vision-obj-1y"
                  class="wd-input"
                  style="flex: 1;"
                >
                <button class="wd-btn btn-primary btn-sm" onclick="
                  Vision.addObjective('1', document.getElementById('vision-obj-1y').value);
                  document.getElementById('vision-obj-1y').value = '';
                  Vision.render('mainContent');
                ">+</button>
              </div>
            </div>

            <!-- 5 ANOS -->
            <div style="margin-bottom: 20px;">
              <h4 style="color: var(--accent3); margin-bottom: 12px; font-size: 14px;">📊 Próximos 5 Anos</h4>
              <div class="vision-objectives">
                ${objectives5y.map(obj => this.renderObjective(obj)).join('')}
              </div>
              <div style="display: flex; gap: 8px; margin-top: 12px;">
                <input
                  type="text"
                  placeholder="Nova meta para 5 anos..."
                  id="vision-obj-5y"
                  class="wd-input"
                  style="flex: 1;"
                >
                <button class="wd-btn btn-primary btn-sm" onclick="
                  Vision.addObjective('5', document.getElementById('vision-obj-5y').value);
                  document.getElementById('vision-obj-5y').value = '';
                  Vision.render('mainContent');
                ">+</button>
              </div>
            </div>

            <!-- 10 ANOS -->
            <div>
              <h4 style="color: var(--accent2); margin-bottom: 12px; font-size: 14px;">🚀 Próximos 10 Anos</h4>
              <div class="vision-objectives">
                ${objectives10y.map(obj => this.renderObjective(obj)).join('')}
              </div>
              <div style="display: flex; gap: 8px; margin-top: 12px;">
                <input
                  type="text"
                  placeholder="Nova meta para 10 anos..."
                  id="vision-obj-10y"
                  class="wd-input"
                  style="flex: 1;"
                >
                <button class="wd-btn btn-primary btn-sm" onclick="
                  Vision.addObjective('10', document.getElementById('vision-obj-10y').value);
                  document.getElementById('vision-obj-10y').value = '';
                  Vision.render('mainContent');
                ">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  },

  renderObjective(obj) {
    const yearClass = `year-${obj.year}`;
    return `
      <div class="objective-card ${yearClass}">
        <div class="objective-year">${obj.year} ano${obj.year > 1 ? 's' : ''}</div>
        <div class="objective-text">${Utils.sanitize(obj.text)}</div>
        <div style="display: flex; gap: 6px; align-items: center; font-size: 11px;">
          <select
            onchange="Vision.updateObjectiveStatus(${obj.id}, this.value); Vision.render('mainContent');"
            style="padding: 4px; background: var(--bg2); border: 1px solid var(--border); border-radius: 4px; color: var(--text1);"
          >
            <option value="pending" ${obj.status === 'pending' ? 'selected' : ''}>Pendente</option>
            <option value="progress" ${obj.status === 'progress' ? 'selected' : ''}>Em Progresso</option>
            <option value="completed" ${obj.status === 'completed' ? 'selected' : ''}>Completado</option>
          </select>
          <button onclick="Vision.removeObjective(${obj.id}); Vision.render('mainContent');" style="margin-left: auto; background: transparent; border: none; color: var(--text3); cursor: pointer; font-size: 14px;">✕</button>
        </div>
      </div>
    `;
  },

  refineMissionWithAI() {
    const loading = document.createElement('div');
    loading.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: var(--bg2); padding: 30px; border-radius: 10px; border: 1px solid var(--border);
                  z-index: 1000; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 12px;">⏳</div>
        <div>Refinando sua missão com IA...</div>
      </div>
    `;
    document.body.appendChild(loading);

    GroqAPI.refineMission(
      this.data.mission,
      this.data.values,
      this.data.objectives
    ).then(suggestion => {
      loading.remove();
      if (suggestion) {
        const confirmed = confirm('✨ Missão refinada:\n\n' + suggestion + '\n\nDeseja usar essa missão?');
        if (confirmed) {
          document.getElementById('vision-mission').value = suggestion;
          this.updateMission(suggestion);
        }
      } else {
        alert('❌ Erro ao refinar. Tente novamente.');
      }
    });
  }
};

// Inicializar
Vision.init();
