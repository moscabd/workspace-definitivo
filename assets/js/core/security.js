/* ════════════════════════════════════════════════════════
   SECURITY - Configuração segura, criptografia, validação
   ════════════════════════════════════════════════════════ */

const Security = {
  // ── Chave de criptografia simples (baseada em fingerprint do browser)
  _encryptionKey: null,

  init() {
    // Gerar chave única baseada em fingerprint simples
    const fingerprint = this._generateFingerprint();
    this._encryptionKey = this._deriveKey(fingerprint);
  },

  // ── Fingerprint simples do browser (não é perfeito, mas adiciona camada)
  _generateFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      'workspace-definitivo-v2'
    ];
    return btoa(components.join('|')).slice(0, 32);
  },

  // ── Derivar chave simples do fingerprint
  _deriveKey(fingerprint) {
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32bit integer
    }
    return Math.abs(hash).toString(36);
  },

  // ── Criptografia simples (XOR com chave) - camada básica de proteção
  _encrypt(text) {
    if (!this._encryptionKey) this.init();
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this._encryptionKey.charCodeAt(i % this._encryptionKey.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  },

  // ── Descriptografia
  _decrypt(encoded) {
    if (!this._encryptionKey) this.init();
    try {
      const text = atob(encoded);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ this._encryptionKey.charCodeAt(i % this._encryptionKey.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (e) {
      return null;
    }
  },

  // ── Salvar dado sensível criptografado
  setSecure(key, value) {
    const encrypted = this._encrypt(JSON.stringify(value));
    localStorage.setItem('wd_secure_' + key, encrypted);
  },

  // ── Ler dado sensível descriptografado
  getSecure(key, defaultValue) {
    const encrypted = localStorage.getItem('wd_secure_' + key);
    if (!encrypted) return defaultValue;
    const decrypted = this._decrypt(encrypted);
    if (!decrypted) return defaultValue;
    try {
      return JSON.parse(decrypted);
    } catch (e) {
      return defaultValue;
    }
  },

  // ── Remover dado sensível
  removeSecure(key) {
    localStorage.removeItem('wd_secure_' + key);
  },

  // ── Sanitização contra XSS (sempre usar antes de renderizar HTML)
  sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // ── Validação de inputs
  validate: {
    // Texto genérico (tamanho max, sem HTML)
    text(value, maxLen = 500) {
      if (typeof value !== 'string') return '';
      const cleaned = value.trim().replace(/<[^>]*>/g, ''); // Strip HTML tags
      return cleaned.length > maxLen ? cleaned.substring(0, maxLen) : cleaned;
    },

    // Número dentro de range
    number(value, min = 0, max = Infinity) {
      const num = parseFloat(value);
      if (isNaN(num)) return min;
      return Math.max(min, Math.min(max, num));
    },

    // Email básico
    email(value) {
      if (typeof value !== 'string') return '';
      const email = value.trim().toLowerCase();
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email) ? email : '';
    },

    // URL válida
    url(value) {
      if (typeof value !== 'string') return '';
      try {
        const url = new URL(value.trim());
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
      } catch (e) {
        return '';
      }
    },

    // Data válida (YYYY-MM-DD)
    date(value) {
      if (typeof value !== 'string') return '';
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) return '';
      const date = new Date(value + 'T00:00:00');
      return isNaN(date.getTime()) ? '' : value;
    },

    // Valor monetário
    currency(value) {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) return 0;
      return Math.round(num * 100) / 100;
    },

    // ID numérico
    id(value) {
      const num = parseInt(value);
      return isNaN(num) || num <= 0 ? null : num;
    }
  },

  // ── Rate Limiter simples
  rateLimiter: {
    _calls: {},

    canCall(key, maxCalls = 5, windowMs = 60000) {
      const now = Date.now();
      if (!this._calls[key]) {
        this._calls[key] = [];
      }

      // Limpar chamadas antigas
      this._calls[key] = this._calls[key].filter(time => now - time < windowMs);

      if (this._calls[key].length >= maxCalls) {
        return false;
      }

      this._calls[key].push(now);
      return true;
    },

    getWaitTime(key, windowMs = 60000) {
      if (!this._calls[key] || this._calls[key].length === 0) return 0;
      const oldest = this._calls[key][0];
      const wait = windowMs - (Date.now() - oldest);
      return Math.max(0, Math.ceil(wait / 1000));
    }
  },

  // ── Proteção contra clickjacking
  initClickjackingProtection() {
    // Verificar se está em iframe
    if (window.self !== window.top) {
      window.top.location = window.self.location;
    }
  },

  // ── Adicionar CSP meta tag
  initCSP() {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src https://api.groq.com; img-src 'self' data:;";
    document.head.appendChild(meta);
  },

  // ── Esconder detalhes de erro em produção
  safeError(error, context = '') {
    // Log interno (desenvolvimento)
    console.error(`[WD Error] ${context}:`, error);

    // Mensagem segura para usuário (sem expor detalhes internos)
    return 'Ocorreu um erro. Tente novamente mais tarde.';
  },

  // ── Gerar ID único seguro
  generateId() {
    return Date.now() + Math.floor(Math.random() * 10000);
  },

  // ── Verificar integridade de dados
  verifyData(data, expectedSchema) {
    if (!data || typeof data !== 'object') return false;

    for (const key of Object.keys(expectedSchema)) {
      const expectedType = expectedSchema[key];
      if (expectedType === 'array') {
        if (!Array.isArray(data[key])) return false;
      } else if (typeof data[key] !== expectedType) {
        return false;
      }
    }
    return true;
  }
};

// Inicializar automaticamente
Security.init();
Security.initClickjackingProtection();
Security.initCSP();
