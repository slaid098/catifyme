export function installDomMocks() {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
  globalThis.localStorage._store = store;

  globalThis.navigator = globalThis.navigator || {};
  globalThis.navigator.language = 'en-US';

  globalThis.window = globalThis;

  globalThis.location = {
    search: '',
    href: 'https://catifyme.vercel.app/',
  };

  globalThis.document = {
    documentElement: { lang: '', setAttribute: () => {} },
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: () => {},
            fillRect: () => {},
            fillStyle: '',
            createLinearGradient: () => ({ addColorStop: () => {} }),
            fillText: () => {},
            textAlign: '',
            textBaseline: '',
          }),
          toDataURL: () => 'data:image/jpeg;base64,mockjpegdata',
          toBlob: (cb) => cb({ size: 1024, type: 'image/jpeg' }),
        };
      }
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: () => {},
          remove: () => {},
          style: {},
        };
      }
      if (tag === 'textarea') {
        return {
          value: '',
          style: {},
          select: () => {},
          remove: () => {},
        };
      }
      return { click: () => {}, remove: () => {}, appendChild: () => {}, style: {} };
    },
    createElementNS: () => ({}),
    body: { appendChild: () => {}, removeChild: () => {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: () => {},
  };

  globalThis.Image = class {
    constructor() {
      this._src = '';
      setTimeout(() => {
        this.width = 800;
        this.height = 600;
        if (this.onload) this.onload();
      }, 0);
    }
    set src(v) { this._src = v; }
    get src() { return this._src; }
    set crossOrigin(_) {}
  };

  globalThis.Blob = class {
    constructor(parts, opts) {
      this.size = parts?.[0]?.byteLength || 100;
      this.type = opts?.type || 'application/octet-stream';
    }
  };

  globalThis.atob = (b64) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = b64.replace(/=+$/, '');
    let out = '';
    for (let i = 0; i < str.length; i += 4) {
      const n = (chars.indexOf(str[i]) << 18) | (chars.indexOf(str[i+1]) << 12) | ((str[i+2] ? chars.indexOf(str[i+2]) : 0) << 6) | (str[i+3] ? chars.indexOf(str[i+3]) : 0);
      out += String.fromCharCode((n >> 16) & 255) + (str.length > i+2 ? String.fromCharCode((n >> 8) & 255) : '') + (str.length > i+3 ? String.fromCharCode(n & 255) : '');
    }
    return out;
  };

  globalThis.Uint8Array = globalThis.Uint8Array || Uint8Array;

  globalThis.File = class {
    constructor(parts, name, opts) {
      this.name = name;
      this.size = parts?.[0]?.size || 100;
      this.type = opts?.type || 'image/jpeg';
    }
  };

  globalThis.URL = {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => {},
  };

  globalThis.navigator.canShare = undefined;
  globalThis.navigator.share = undefined;
  globalThis.navigator.clipboard = undefined;

  globalThis.fetch = async (url) => {
    if (url.includes('ru.json')) {
      return { ok: true, json: async () => ({ 'lang.code': 'ru', 'app.title': 'CatifyMe', greeting: 'Привет' }) };
    }
    if (url.includes('en.json')) {
      return { ok: true, json: async () => ({ 'lang.code': 'en', 'app.title': 'CatifyMe', greeting: 'Hello' }) };
    }
    return { ok: false, json: async () => ({}) };
  };
}

export function resetDomMocks() {
  if (globalThis.localStorage?._store) {
    for (const k of Object.keys(globalThis.localStorage._store)) {
      delete globalThis.localStorage._store[k];
    }
  }
  globalThis.navigator.language = 'en-US';
  globalThis.location.search = '';
}
