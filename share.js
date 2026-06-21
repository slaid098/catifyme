const SITE_URL = 'https://catifyme.vercel.app';
const WATERMARK_TEXT = `CatifyMe → ${SITE_URL}`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img-load-error'));
    img.src = src;
  });
}

export async function composeShareableImage(imgSrc) {
  const img = await loadImage(imgSrc);
  const size = 1024;
  const barHeight = 88;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size + barHeight;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f0d12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawW = size;
  const drawH = size;
  const scale = Math.min(drawW / img.width, drawH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (drawW - w) / 2;
  const y = (drawH - h) / 2;
  ctx.drawImage(img, x, y, w, h);

  const grad = ctx.createLinearGradient(0, size, 0, canvas.height);
  grad.addColorStop(0, '#ff7a59');
  grad.addColorStop(1, '#ffb86b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, size, canvas.width, barHeight);

  ctx.fillStyle = '#1a0f08';
  ctx.font = '600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(WATERMARK_TEXT, canvas.width / 2, size + barHeight / 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas-blob-error'));
    }, 'image/jpeg', 0.92);
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareImage(blob, shareText) {
  const file = new File([blob], 'catifyme.jpg', { type: 'image/jpeg' });
  const nav = navigator;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], text: shareText, title: 'CatifyMe' });
    return 'shared';
  }
  if (nav.share) {
    await nav.share({ text: `${shareText} ${SITE_URL}`, title: 'CatifyMe' });
    return 'shared';
  }
  await copyLink(`${shareText} ${SITE_URL}`);
  return 'copied';
}

export async function copyLink(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

export function siteUrl() {
  return SITE_URL;
}

const SHARE_URLS = {
  telegram: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  x: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  whatsapp: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  reddit: (url, text) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  vk: (url) => `https://vk.com/share.php?url=${encodeURIComponent(url)}`,
};

export function shareTo(platform, text, url = SITE_URL) {
  const builder = SHARE_URLS[platform];
  if (!builder) throw new Error(`Unknown platform: ${platform}`);
  const shareUrl = builder(url, text);
  const w = 600;
  const h = 600;
  const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
  window.open(shareUrl, '_blank', `noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`);
}

