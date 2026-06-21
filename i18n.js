const STORAGE_KEY = 'catifyme-lang';
const SUPPORTED = ['ru', 'en'];
const DEFAULT_LANG = 'en';

let currentLang = null;
let translations = {};
const listeners = new Set();

function detectLang() {
  const params = new URLSearchParams(location.search);
  const queryLang = params.get('lang');
  if (queryLang && SUPPORTED.includes(queryLang)) {
    localStorage.setItem(STORAGE_KEY, queryLang);
    return queryLang;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED.includes(stored)) return stored;
  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('ru')) return 'ru';
  if (nav.startsWith('en')) return 'en';
  return DEFAULT_LANG;
}

async function loadLocale(lang) {
  const res = await fetch(`locales/${lang}.json`);
  if (!res.ok) throw new Error(`Failed to load locale: ${lang}`);
  return res.json();
}

function applyTranslations(dict) {
  document.documentElement.lang = dict['lang.code'] || currentLang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const pairs = el.getAttribute('data-i18n-attr').split(',');
    pairs.forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (dict[key] !== undefined) el.setAttribute(attr, dict[key]);
    });
  });
}

export async function initI18n() {
  currentLang = detectLang();
  translations[currentLang] = await loadLocale(currentLang);
  applyTranslations(translations[currentLang]);
  notifyListeners();
  return currentLang;
}

export function t(key) {
  const dict = translations[currentLang];
  if (dict && dict[key] !== undefined) return dict[key];
  return key;
}

export async function setLang(lang) {
  if (!SUPPORTED.includes(lang) || lang === currentLang) return;
  if (!translations[lang]) translations[lang] = await loadLocale(lang);
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations(translations[lang]);
  notifyListeners();
}

export function getLang() {
  return currentLang;
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyListeners() {
  listeners.forEach((fn) => fn(currentLang));
}
