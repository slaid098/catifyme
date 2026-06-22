import { initI18n, setLang, getLang, t, onLangChange } from './i18n.js';
import { ensureSignedIn, isSignedIn, isInsufficientFundsError, analyzeSelfie, generateCat, normalizeImageToJPEG } from './puter-api.js';
import { composeShareableImage, shareImage, shareTo, copyLink, downloadBlob, siteUrl } from './share.js';

const els = {
  langBtns: document.querySelectorAll('.lang-btn'),
  fileInput: document.getElementById('file-input'),
  cameraInput: document.getElementById('camera-input'),
  previewImg: document.getElementById('preview-img'),
  btnConfirm: document.getElementById('btn-confirm'),
  btnAgain: document.getElementById('btn-again'),
  btnShare: document.getElementById('btn-share'),
  btnDownload: document.getElementById('btn-download'),
  shareBtns: document.querySelectorAll('[data-share]'),
  btnExplainerGo: document.getElementById('btn-explainer-go'),
  btnErrorRetry: document.getElementById('btn-error-retry'),
  loadingText: document.getElementById('loading-text'),
  resultImg: document.getElementById('result-img'),
  resultName: document.getElementById('result-name'),
  resultBreed: document.getElementById('result-breed'),
  resultPersonality: document.getElementById('result-personality'),
  resultFunfact: document.getElementById('result-funfact'),
  errorMessage: document.getElementById('error-message'),
  errorTech: document.getElementById('error-tech'),
  btnErrorPuter: document.getElementById('btn-error-puter'),
  sheets: {
    explainer: document.getElementById('sheet-explainer'),
    error: document.getElementById('sheet-error'),
    share: document.getElementById('sheet-share'),
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

const PENDING_SELFIE_KEY = 'catifyme-pending-selfie';

function savePendingSelfie(dataURL) {
  try {
    sessionStorage.setItem(PENDING_SELFIE_KEY, dataURL);
  } catch (e) {
    // sessionStorage full or unavailable — silently ignore
  }
}

function getPendingSelfie() {
  try {
    return sessionStorage.getItem(PENDING_SELFIE_KEY);
  } catch (e) {
    return null;
  }
}

function clearPendingSelfie() {
  try {
    sessionStorage.removeItem(PENDING_SELFIE_KEY);
  } catch (e) {
    // ignore
  }
}

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

function showError(messageKey, techDetail) {
  els.errorMessage.textContent = t(messageKey);
  if (techDetail) {
    els.errorTech.textContent = techDetail;
    els.errorTech.hidden = false;
  } else {
    els.errorTech.hidden = true;
    els.errorTech.textContent = '';
  }
  if (els.btnErrorPuter) {
    els.btnErrorPuter.hidden = messageKey !== 'error.credits';
  }
  console.error('[catifyme]', messageKey, techDetail || '');
  openSheet('error');
}

function mapError(err) {
  if (isInsufficientFundsError(err)) return 'error.credits';
  if (err?.message?.includes('auth') || err?.message?.includes('sign')) return 'error.login';
  if (err?.message?.includes('network') || err?.name === 'TypeError') return 'error.network';
  if (err?.message?.includes('image-decode') || err?.message?.includes('vision')) return 'error.vision';
  return 'error.generate';
}

function setLoadingText(key) {
  els.loadingText.textContent = t(key);
}

function buildShareText() {
  if (!currentResult) return t('share.text');
  return t('share.template')
    .replace('{name}', currentResult.catName)
    .replace('{breed}', currentResult.catBreed)
    .replace('{funFact}', currentResult.funFact);
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
    showError('error.vision', `stage: upload | type: ${file?.type || 'no file'}`);
    return;
  }
  try {
    const dataURL = await readFileAsDataURL(file);
    currentSelfie = dataURL;
    els.previewImg.src = dataURL;
    els.previewImg.alt = '';
    showScreen('preview');
  } catch (err) {
    showError('error.vision', `stage: upload | ${err?.message || 'read error'}`);
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
  clearPendingSelfie();
  showScreen('hero');
});

els.btnConfirm.addEventListener('click', async () => {
  if (isSignedIn()) {
    await runAnalysis();
  } else {
    openSheet('explainer');
  }
});

els.btnExplainerGo.addEventListener('click', async () => {
  closeSheet('explainer');
  await runAnalysis();
});

els.btnErrorRetry.addEventListener('click', async () => {
  closeSheet('error');
  if (currentSelfie) await runAnalysis();
});

if (els.btnErrorPuter) {
  els.btnErrorPuter.addEventListener('click', () => {
    window.open('https://puter.com', '_blank', 'noopener');
  });
}

function isTouchDevice() {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

els.btnShare.addEventListener('click', async () => {
  if (!currentResult?.imgSrc) return;
  const shareText = buildShareText();
  if (!isTouchDevice()) {
    openSheet('share');
    return;
  }
  try {
    const blob = await composeShareableImage(currentResult.imgSrc);
    const result = await shareImage(blob, shareText);
    if (result === 'copied') {
      openSheet('share');
      showToast('share.copied');
    }
  } catch (err) {
    if (err?.name === 'AbortError') return;
    openSheet('share');
  }
});

els.btnDownload.addEventListener('click', async () => {
  if (!currentResult?.imgSrc) return;
  try {
    const blob = await composeShareableImage(currentResult.imgSrc);
    downloadBlob(blob, 'catifyme.jpg');
  } catch (err) {
    showError('error.network', `stage: download | ${err?.message || 'error'}`);
  }
});

els.shareBtns.forEach((btn) => {
  btn.addEventListener('click', async () => {
    const platform = btn.dataset.share;
    const shareText = buildShareText();
    if (platform === 'copy') {
      try {
        await copyLink(`${shareText} ${siteUrl()}`);
        showToast('share.copied');
      } catch {
        showError('error.network', 'stage: share | copy failed');
      }
      return;
    }
    try {
      shareTo(platform, shareText);
    } catch {
      showError('error.network', `stage: share | ${platform} failed`);
    }
  });
});

function showToast(key) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = t(key);
  toast.classList.add('is-visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

async function runAnalysis() {
  if (!currentSelfie) {
    showScreen('hero');
    return;
  }
  showScreen('loading');
  setLoadingText('loading.analyzing');
  let normalizedSelfie = currentSelfie;
  try {
    normalizedSelfie = await normalizeImageToJPEG(currentSelfie);
  } catch (e) {
    // fallback to raw selfie
  }
  savePendingSelfie(normalizedSelfie);
  let stage = 'auth';
  try {
    await ensureSignedIn();
    stage = 'vision';
    setLoadingText('loading.thinking');
    const analysis = await analyzeSelfie(currentSelfie, getLang());
    stage = 'image';
    setLoadingText('loading.drawing');
    const catImg = await generateCat(analysis.imgPrompt, analysis.catBreed);
    currentResult = { ...analysis, imgSrc: catImg.src };
    clearPendingSelfie();
    renderResult(currentResult);
    showScreen('result');
  } catch (err) {
    showScreen('preview');
    const tech = `stage: ${stage} | ${err?.code || err?.name || 'Error'}: ${err?.message || 'unknown'}`;
    showError(mapError(err), tech);
  }
}

function renderResult(analysis) {
  els.resultName.textContent = analysis.catName;
  els.resultBreed.textContent = analysis.catBreed;
  els.resultPersonality.textContent = analysis.personality;
  els.resultFunfact.textContent = analysis.funFact;
  const wrap = els.resultImg.parentElement;
  if (analysis.imgSrc) {
    wrap.classList.remove('is-loading');
    els.resultImg.src = analysis.imgSrc;
  } else {
    wrap.classList.add('is-loading');
    els.resultImg.removeAttribute('src');
  }
  els.resultImg.alt = analysis.catName || '';
}

async function init() {
  onLangChange(updateLangButtons);
  await initI18n().catch(() => {});
  const pending = getPendingSelfie();
  if (pending) {
    currentSelfie = pending;
    els.previewImg.src = pending;
    els.previewImg.alt = '';
    if (isSignedIn()) {
      await runAnalysis();
    } else {
      showScreen('preview');
    }
  }
}

init();
