import { buildVisionPrompt, buildFallbackImgPrompt } from './prompts.js';

const VISION_MODEL = 'gpt-5-nano';
const IMAGE_MODEL = 'dall-e-3';

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

export async function ensureSignedIn() {
  if (typeof puter === 'undefined') {
    throw new Error('Puter not loaded');
  }
  if (puter.auth?.isSignedIn?.()) return;
  await puter.auth.signIn();
}

export async function analyzeSelfie(imageDataURL, lang) {
  if (!imageDataURL) throw new Error('No image provided');
  const messages = buildVisionPrompt(lang);
  const response = await puter.ai.chat(messages, imageDataURL, { model: VISION_MODEL });
  const text = extractText(response);
  if (!text) throw new Error('Empty AI response');
  const data = parseJSON(text);
  if (data.error === 'no_face') {
    const err = new Error('no_face');
    err.code = 'no_face';
    throw err;
  }
  if (!data.cat_breed || !data.img_prompt) {
    throw new Error('Incomplete AI response');
  }
  return {
    catBreed: data.cat_breed,
    catName: data.cat_name,
    personality: data.personality,
    funFact: data.fun_fact,
    imgPrompt: data.img_prompt,
  };
}

export async function generateCat(imgPrompt, breed) {
  if (typeof puter === 'undefined') throw new Error('Puter not loaded');
  const prompt = imgPrompt || buildFallbackImgPrompt(breed);
  const imgEl = await puter.ai.txt2img(prompt, { model: IMAGE_MODEL });
  if (!imgEl || !imgEl.src) throw new Error('Image generation returned empty result');
  return imgEl;
}
