/* ════════════════════════════════════════════════════════
   STORAGE - Abstração para LocalStorage
   ════════════════════════════════════════════════════════ */

const Storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem('wd_' + key)) || [];
    } catch (e) {
      return [];
    }
  },

  set(key, value) {
    localStorage.setItem('wd_' + key, JSON.stringify(value));
  },

  getSingle(key, defaultValue) {
    try {
      return JSON.parse(localStorage.getItem('wd_' + key)) || defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  setSingle(key, value) {
    localStorage.setItem('wd_' + key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem('wd_' + key);
  },

  clear() {
    localStorage.clear();
  }
};

// Alias curto
const S = Storage;
