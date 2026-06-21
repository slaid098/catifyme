import { initI18n, setLang, getLang, t, onLangChange } from './i18n.js';

const els = {
  langBtns: document.querySelectorAll('.lang-btn'),
  fileInput: document.getElementById('file-input'),
  cameraInput: document.getElementById('camera-input'),
  previewImg: document.getElementById('preview-img'),
  btnConfirm: document.getElementById('btn-confirm'),
  btnAgain: document.getElementById('btn-again'),
  btnDownload: document.getElementById('btn-download'),
  btnShare: document.getElementById('btn-share'),
  btnExplainerGo: document.getElementById('btn-explainer-go'),
  btnErrorRetry: document.getElementById('btn-error-retry'),
  loadingText: document.getElementById('loading-text'),
  resultImg: document.getElementById('result-img'),
  resultName: document.getElementById('result-name'),
  resultBreed: document.getElementById('result-breed'),
  resultPersonality: document.getElementById('result-personality'),
  resultFunfact: document.getElementById('result-funfact'),
  errorMessage: document.getElementById('error-message'),
  sheets: {
    explainer: document.getElementById('sheet-explainer'),
    error: document.getElementById('sheet-error'),
  },
};

const screens = {
  hero: document.getElementById('screen-hero'),
  preview: document.getElementById('screen-preview'),
  loading: document.getElementById('screen-loading'),
  result: document.getElementById('screen-result'),
};

let currentSelfie = null;
let currentResult = null;

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('is-active'));
  screens[name].classList.add('is-active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSheet(name) {
  els.sheets[name].hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSheet(name) {
  els.sheets[name].hidden = true;
  document.body.style.overflow = '';
}

function showError(messageKey) {
  els.errorMessage.textContent = t(messageKey);
  openSheet('error');
}

function setLoadingText(key) {
  els.loadingText.textContent = t(key);
}

function updateLangButtons() {
  const active = getLang();
  els.langBtns.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.lang === active);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('read-error'));
    reader.readAsDataURL(file);
  });
}

async function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showError('error.vision');
    return;
  }
  try {
    const dataURL = await readFileAsDataURL(file);
    currentSelfie = dataURL;
    els.previewImg.src = dataURL;
    els.previewImg.alt = t('upload.preview.title');
    showScreen('preview');
  } catch {
    showError('error.vision');
  }
}

document.querySelectorAll('[data-close]').forEach((el) => {
  el.addEventListener('click', () => closeSheet(el.dataset.close));
});

els.langBtns.forEach((btn) => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

els.fileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
  e.target.value = '';
});

els.cameraInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
  e.target.value = '';
});

els.btnAgain.addEventListener('click', () => {
  currentSelfie = null;
  currentResult = null;
  showScreen('hero');
});

function init() {
  onLangChange(updateLangButtons);
  initI18n().catch(() => {});
}

init();
