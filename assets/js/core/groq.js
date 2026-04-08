/* ════════════════════════════════════════════════════════
   GROQ API INTEGRATION - Seguro com rate limiting
   ════════════════════════════════════════════════════════ */

const GroqAPI = {
  // API key configurada pelo usuário (não hardcoded)
  apiKey: null,
  baseURL: 'https://api.groq.com/openai/v1',
  model: 'mixtral-8x7b-32768',

  // ── Inicializar - carregar chave de configuração segura
  init() {
    const storedKey = Security.getSecure('groq_api_key', null);
    if (storedKey) {
      this.apiKey = storedKey;
    }
  },

  // ── Configurar API key (salva de forma segura)
  setApiKey(key) {
    if (!key || typeof key !== 'string') return false;
    const cleaned = key.trim();
    if (!cleaned.startsWith('gsk_')) return false;
    this.apiKey = cleaned;
    Security.setSecure('groq_api_key', cleaned);
    return true;
  },

  // ── Verificar se API está configurada
  isConfigured() {
    return !!this.apiKey;
  },

  // ── Remover API key
  clearApiKey() {
    this.apiKey = null;
    Security.removeSecure('groq_api_key');
  },

  // ── Rate limit: 5 chamadas por minuto
  _checkRateLimit() {
    if (!Security.rateLimiter.canCall('groq_api', 5, 60000)) {
      const waitTime = Security.rateLimiter.getWaitTime('groq_api', 60000);
      return { allowed: false, waitTime };
    }
    return { allowed: true };
  },

  // ── Chamada principal à API
  async chat(messages, temperature = 0.7, maxTokens = 1000) {
    // Verificar se API key está configurada
    if (!this.isConfigured()) {
      return null;
    }

    // Rate limiting
    const rateCheck = this._checkRateLimit();
    if (!rateCheck.allowed) {
      console.warn(`GroqAPI rate limited. Aguarde ${rateCheck.waitTime}s`);
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const error = await response.json();
        const msg = error.error?.message || 'Erro na API';

        // Log seguro (sem expor detalhes sensíveis)
        console.error('GroqAPI error:', Security.safeError(msg, 'chat'));

        // Se erro de autenticação, limpar key inválida
        if (response.status === 401 || response.status === 403) {
          this.clearApiKey();
        }

        return null;
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('GroqAPI:', Security.safeError(error, 'chat'));
      return null;
    }
  },

  // ── Gerar sugestões para Ikigai
  async suggestIkigai(passion, talent, need, returnValue) {
    const passionText = (passion || []).map(Utils.sanitize).join(', ') || 'não informado';
    const talentText = (talent || []).map(Utils.sanitize).join(', ') || 'não informado';
    const needText = (need || []).map(Utils.sanitize).join(', ') || 'não informado';
    const returnText = (returnValue || []).map(Utils.sanitize).join(', ') || 'não informado';

    const prompt = `Você é um especialista em vida integral e propósito pessoal.
Analisando o Ikigai de alguém:
- Paixão (o que ama): ${passionText}
- Talento (o que sabe fazer): ${talentText}
- Necessidade (mundo precisa): ${needText}
- Retorno (pode ganhar com): ${returnText}

Dê 3-5 sugestões concretas de caminhos profissionais/de vida que fazem sentido com essa combinação. Seja objetivo e prático.`;

    return await this.chat([{ role: 'user', content: prompt }], 0.7, 800);
  },

  // ── Refinar missão pessoal
  async refineMission(currentMission, values, objectives) {
    const missionText = Utils.sanitize(currentMission || '');
    const valuesText = (values || []).map(Utils.sanitize).join(', ') || 'não informado';
    const objText = (objectives || []).slice(0, 3).map(o => Utils.sanitize(o.text || '')).join('; ') || 'não informado';

    const prompt = `Você é um coach de vida pessoal.
Baseado em:
- Missão atual: "${missionText}"
- Valores: ${valuesText}
- Objetivos: ${objText}

Sugira uma missão pessoal mais clara, inspiradora e alinhada com os valores. A missão deve ser curta (1-2 linhas) e poderosa.`;

    return await this.chat([{ role: 'user', content: prompt }], 0.7, 400);
  },

  // ── Gerar insights sobre ideias no Segundo Cérebro
  async analyzeIdeas(ideas) {
    const ideasText = (ideas || []).slice(0, 20).map((i, idx) =>
      `${idx + 1}. [${Utils.sanitize(i.tag || '')}] ${Utils.sanitize(i.text || '')}`
    ).join('\n');

    const prompt = `Você é um analista de conhecimento.
Tenho essas ideias/notas:
${ideasText}

Identifique:
1. Temas/padrões recorrentes
2. Conexões entre ideias
3. Áreas de oportunidade
4. Próximos passos sugeridos

Seja conciso e prático.`;

    return await this.chat([{ role: 'user', content: prompt }], 0.7, 600);
  },

  // ── Gerar plano de ação de objetivos
  async generateActionPlan(objective, timeframe) {
    const objText = Utils.sanitize(objective || '');

    const prompt = `Você é um especialista em planejamento estratégico.
Objetivo: "${objText}"
Horizonte: ${Utils.validateNumber(timeframe, 1, 50)} ano(s)

Crie um plano de ação simples com:
1. 3-5 marcos principais
2. Prioridade
3. Timeframe estimado
4. Primeiros passos

Formato: simples e executável.`;

    return await this.chat([{ role: 'user', content: prompt }], 0.7, 500);
  },

  // ── Analisar progresso e dar insights
  async progressInsights(completed, total, recentActivities) {
    const safeCompleted = Utils.validateNumber(completed, 0);
    const safeTotal = Utils.validateNumber(total, 1);
    const pct = Math.round(safeCompleted / safeTotal * 100);
    const activitiesText = (recentActivities || []).slice(0, 10).map(Utils.sanitize).join('; ');

    const prompt = `Você é um coach motivacional e analista de produtividade.
Progresso:
- Concluído: ${safeCompleted} de ${safeTotal} (${pct}%)
- Atividades recentes: ${activitiesText}

Dê:
1. Uma análise positiva do progresso
2. 1-2 áreas de melhoria
3. Um conselho motivacional

Seja genuíno e construtivo.`;

    return await this.chat([{ role: 'user', content: prompt }], 0.7, 400);
  }
};

// Inicializar
GroqAPI.init();
