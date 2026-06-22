import { buildVisionPrompt, buildFallbackImgPrompt } from './prompts.js';

const VISION_MODEL = 'gpt-4o-mini';
const IMAGE_MODEL = 'gpt-image-1-mini';
const IMG2IMG_MODEL = 'gemini-2.5-flash-image-preview';
const NORMALIZE_MAX = 1536;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-decode-failed'));
    img.src = src;
  });
}

export async function normalizeImageToJPEG(dataURL) {
  const img = await loadImage(dataURL);
  const scale = Math.min(1, NORMALIZE_MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.92);
}

function extractText(response) {
  if (response == null) return '';
  if (typeof response === 'string') return response;
  const msg = response.message ?? response;
  if (typeof msg === 'string') return msg;
  if (typeof msg?.content === 'string') return msg.content;
  if (Array.isArray(msg?.content)) {
    const textPart = msg.content.find((c) => (c?.type ?? 'text') === 'text');
    return textPart?.text ?? '';
  }
  if (typeof response.toString === 'function') {
    const s = response.toString();
    if (s && s !== '[object Object]') return s;
  }
  return '';
}

function stripCodeFences(text) {
  return text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

function parseJSON(text) {
  const cleaned = stripCodeFences(text);
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response');
  }
  const slice = cleaned.slice(start, end + 1);
  return JSON.parse(slice);
}

export function isSignedIn() {
  return typeof puter !== 'undefined' && puter.auth?.isSignedIn?.() === true;
}

export async function ensureSignedIn() {
  if (typeof puter === 'undefined') {
    throw new Error('Puter not loaded');
  }
  if (puter.auth?.isSignedIn?.()) return;
  await puter.auth.signIn({ attempt_temp_user_creation: true });
}

export function isInsufficientFundsError(err) {
  const code = err?.code || '';
  const msg = err?.message || '';
  return (
    code === 'insufficient_funds' ||
    /insufficient[ _-]?funds|out[ _-]?of[ _-]?credits|no[ _-]?credit/i.test(msg)
  );
}

function dataURLtoBlob(dataURL) {
  const [header, base64] = dataURL.split(',');
  const mime = (header.match(/data:(.*?);/) || [, 'image/jpeg'])[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function stripDataUrlPrefix(dataURL) {
  const commaIdx = dataURL.indexOf(',');
  return commaIdx >= 0 ? dataURL.slice(commaIdx + 1) : dataURL;
}

export async function analyzeSelfie(imageDataURL, lang) {
  if (!imageDataURL) throw new Error('No image provided');
  const normalized = await normalizeImageToJPEG(imageDataURL);
  const blob = dataURLtoBlob(normalized);
  const tempName = `catifyme_temp_${Date.now()}.jpg`;
  const uploaded = await puter.fs.write(tempName, blob);
  try {
    const messages = buildVisionPrompt(lang, uploaded.path);
    const response = await puter.ai.chat(messages, { model: VISION_MODEL });
    const text = extractText(response);
    if (!text) throw new Error('Empty AI response');
    const data = parseJSON(text);
    if (!data.cat_breed || !data.img_prompt) {
      throw new Error('Incomplete AI response: ' + text.slice(0, 200));
    }
    return {
      catBreed: data.cat_breed,
      catName: data.cat_name || 'Cat',
      personality: data.personality || '',
      funFact: data.fun_fact || '',
      imgPrompt: data.img_prompt,
    };
  } finally {
    await puter.fs.delete(uploaded.path).catch(() => {});
  }
}

export async function generateCat(imgPrompt, breed, selfieDataURL) {
  if (typeof puter === 'undefined') throw new Error('Puter not loaded');
  const prompt = imgPrompt || buildFallbackImgPrompt(breed);

  if (selfieDataURL) {
    try {
      const rawBase64 = stripDataUrlPrefix(selfieDataURL);
      console.log('[catifyme] img2img: sending', rawBase64.length, 'bytes of base64');
      const imgEl = await puter.ai.txt2img(prompt, {
        model: IMG2IMG_MODEL,
        input_image: rawBase64,
        input_image_mime_type: 'image/jpeg',
        strength: 0.5,
      });
      if (imgEl?.src) {
        console.log('[catifyme] img2img: success');
        return imgEl;
      }
    } catch (err) {
      console.warn('[catifyme] img2img: failed, falling back to text-only —', err?.message || err);
    }
  }

  console.log('[catifyme] txt2img: fallback (text-only)');
  const imgEl = await puter.ai.txt2img(prompt, { model: IMAGE_MODEL, quality: 'low' });
  if (!imgEl || !imgEl.src) throw new Error('Image generation returned empty result');
  return imgEl;
}
