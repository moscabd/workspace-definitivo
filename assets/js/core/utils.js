/* ════════════════════════════════════════════════════════
   UTILS - Funções utilitárias
   ════════════════════════════════════════════════════════ */

const Utils = {
  today() {
    return new Date().toISOString().split('T')[0];
  },

  formatDate(date) {
    if (!date) return '';
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  },

  formatDateFull(date) {
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  formatCurrency(value) {
    return 'R$' + value.toFixed(2).replace('.', ',');
  },

  formatBRL(value) {
    return 'R$' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  },

  generateId() {
    return Date.now();
  },

  debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },

  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

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

  // Strip HTML tags completamente
  stripHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '').trim();
  },

  // Validar texto (tamanho max)
  validateText(value, maxLen = 500) {
    if (typeof value !== 'string') return '';
    const cleaned = this.stripHTML(value);
    return cleaned.length > maxLen ? cleaned.substring(0, maxLen) : cleaned;
  },

  // Validar número dentro de range
  validateNumber(value, min = 0, max = Infinity) {
    const num = parseFloat(value);
    if (isNaN(num)) return min;
    return Math.max(min, Math.min(max, num));
  },

  // Validar moeda
  validateCurrency(value) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return 0;
    return Math.round(num * 100) / 100;
  }
};
