/**
 * portraits.js — human faces in the film.
 *
 * Two sources, one treatment:
 *
 *   1. Bundled public-domain portraits (Ming woodblock and Qing 绣像). These
 *      ship in the repo and are safe to publish.
 *   2. Local overrides you supply yourself — a still you have licensed, a
 *      frame you shot, anything. Dropped in via the picker or placed in
 *      `characters/<key>.jpg`, which is gitignored. Never committed.
 *
 * The point of the treatment layer is that a 1607 woodblock, a Qing line
 * drawing and a modern photograph have nothing in common tonally, and dropping
 * them into the same film unedited looks like three different productions. So
 * everything is normalised: levels, then a duotone into the film's own ink and
 * paper, then grain and a feathered edge. Mixed sources end up looking like
 * one set of images — which is exactly what a real production does with
 * mixed reference.
 *
 * Line art and photographs need different handling (a photo turned into an
 * alpha mask loses its midtones entirely), so the mode is detected from the
 * image itself.
 */

export const CAST = {
  'liu-bei': {
    zh: '劉　備', en: 'LIU BEI', roleZh: '左將軍 · 新野', roleEn: 'General of the Left, at Xinye',
    file: 'liu-bei.jpg', face: [0.26, 0.01, 0.48, 0.26],
    source: '清代人物畫',
  },
  'zhuge-liang': {
    zh: '諸葛亮', en: 'ZHUGE LIANG', roleZh: '布衣 · 躬耕南陽', roleEn: 'A farmer at Nanyang, aged 26',
    file: 'zhuge-liang.jpg', face: [0.14, 0.16, 0.68, 0.50],
    source: '《三才圖會》萬曆三十七年 (1609)',
  },
  'guan-yu': {
    zh: '關　羽', en: 'GUAN YU', roleZh: '義弟', roleEn: 'Sworn brother',
    file: 'guan-yu.jpg', face: [0.50, 0.01, 0.44, 0.27],
    source: '清代人物畫 · before 1912',
  },
  'zhang-fei': {
    zh: '張　飛', en: 'ZHANG FEI', roleZh: '義弟', roleEn: 'Sworn brother',
    file: 'zhang-fei.jpg', face: [0.24, 0.01, 0.50, 0.26],
    source: '清代繡像本',
  },
  'sima-hui': {
    zh: '司馬徽', en: 'SIMA HUI', roleZh: '隱士 · 水鏡先生', roleEn: 'The recluse, Master Water-Mirror',
    file: 'sima-hui.jpg', face: [0.24, 0.05, 0.52, 0.27],
    source: '清代繡像本 (1906)',
  },
};

/** Non-character plates: period artwork used as scene backing. */
export const PLATES = {};

const DIR = 'assets/portraits/';
const OVERRIDE_DIR = 'characters/';
const OVERRIDE_EXT = ['jpg', 'jpeg', 'png', 'webp'];

const store = new Map();   // key → { img, mode, source, isOverride }
const tintCache = new Map();

/* ------------------------------ loading ---------------------------------- */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Same-origin only. A cross-origin portrait would taint the canvas and
    // silently break both toDataURL and captureStream — i.e. kill the export.
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/** Try `characters/<key>.<ext>` before the bundled portrait. */
async function loadOverride(key) {
  for (const ext of OVERRIDE_EXT) {
    try {
      const url = `${OVERRIDE_DIR}${key}.${ext}`;
      const head = await fetch(url, { method: 'HEAD' });
      if (!head.ok) continue;
      return await loadImage(url);
    } catch { /* not present — fall through to the bundled one */ }
  }
  return null;
}

export async function loadPlates() {
  await Promise.all(Object.entries(PLATES).map(async ([key, p]) => {
    try {
      const img = await loadImage(DIR + p.file);
      store.set(key, { img, mode: detectMode(img), source: p.source, isOverride: false });
    } catch { /* the card simply renders without it */ }
  }));
}

export async function loadCast(onEach) {
  const keys = Object.keys(CAST);
  await Promise.all(keys.map(async (key) => {
    const entry = CAST[key];
    let img = null;
    let isOverride = false;
    try {
      img = await loadOverride(key);
      isOverride = Boolean(img);
    } catch { /* ignore */ }
    if (!img) {
      try { img = await loadImage(DIR + entry.file); } catch { return; }
    }
    store.set(key, { img, mode: detectMode(img), source: isOverride ? 'local override' : entry.source, isOverride });
    onEach?.(key);
  }));
  return store.size;
}

/** Replace a portrait for this session from a File the user picked. */
export async function setOverride(key, file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    store.set(key, { img, mode: detectMode(img), source: 'local override', isOverride: true });
    for (const k of [...tintCache.keys()]) if (k.startsWith(key + '|')) tintCache.delete(k);
    return true;
  } finally {
    // Keep the object URL alive for the life of the image; browsers hold the
    // decoded bitmap regardless, and revoking early can blank the picture.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export const has = (key) => store.has(key);
export const info = (key) => ({ ...CAST[key], ...(store.get(key) || {}) });

/* ----------------------------- treatment --------------------------------- */

/**
 * Line art is mostly bare paper with sparse dark strokes; a photograph is not.
 * Sampling the histogram tells the two apart reliably enough to pick a
 * treatment automatically, which matters because the user's own images arrive
 * unlabelled.
 */
function detectMode(img) {
  const c = document.createElement('canvas');
  const n = 96;
  c.width = c.height = n;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, n, n);
  let bright = 0, satSum = 0;
  const d = g.getImageData(0, 0, n, n).data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gg = d[i + 1], b = d[i + 2];
    const lum = 0.299 * r + 0.587 * gg + 0.114 * b;
    if (lum > 170) bright++;
    satSum += (Math.max(r, gg, b) - Math.min(r, gg, b)) / 255;
  }
  const px = d.length / 4;
  return (bright / px > 0.55 && satSum / px < 0.30) ? 'line' : 'photo';
}

function levels(v, black, white, gamma) {
  const t = Math.max(0, Math.min(1, (v - black) / Math.max(0.0001, white - black)));
  return t ** gamma;
}

/**
 * Normalise a portrait into the film's palette.
 *
 * line  → luminance becomes alpha, so the strokes sit on the film's own paper
 *         and inherit its texture instead of carrying their own foxed, yellowed
 *         background into every shot.
 * photo → duotone between paper and ink, kept opaque so midtones survive.
 */
function treat(key, inkColor, paperColor, opts = {}) {
  const rec = store.get(key);
  if (!rec) return null;
  const cacheKey = `${key}|${inkColor}|${paperColor}|${opts.mode || ''}`;
  if (tintCache.has(cacheKey)) return tintCache.get(cacheKey);

  const mode = opts.mode || rec.mode;
  const img = rec.img;
  const maxW = 720;
  const scale = Math.min(1, maxW / img.naturalWidth);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);

  const imgData = g.getImageData(0, 0, w, h);
  const d = imgData.data;
  const ink = hexToRgb(inkColor);
  const paper = hexToRgb(paperColor);

  // Auto black/white points from the histogram, so a foxed Qing page and a
  // clean modern scan end up at the same contrast.
  let lo = 255, hi = 0;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (lum < lo) lo = lum;
    if (lum > hi) hi = lum;
  }
  const black = (lo / 255) + 0.04;
  const white = (hi / 255) - 0.04;

  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const v = levels(lum, black, white, mode === 'line' ? 1.5 : 1.0);
    if (mode === 'line') {
      const a = Math.max(0, 1 - v) ** 1.25;
      d[i] = ink.r; d[i + 1] = ink.g; d[i + 2] = ink.b;
      d[i + 3] = Math.round(Math.min(1, a * 1.35) * 255);
    } else {
      d[i] = Math.round(ink.r + (paper.r - ink.r) * v);
      d[i + 1] = Math.round(ink.g + (paper.g - ink.g) * v);
      d[i + 2] = Math.round(ink.b + (paper.b - ink.b) * v);
      d[i + 3] = 255;
    }
  }
  g.putImageData(imgData, 0, 0);

  tintCache.set(cacheKey, { canvas: c, w, h, mode });
  return tintCache.get(cacheKey);
}

function hexToRgb(x) {
  if (typeof x !== 'string') return { r: 20, g: 20, b: 22 };
  const m = x.replace('#', '');
  if (m.length === 3) {
    return { r: parseInt(m[0] + m[0], 16), g: parseInt(m[1] + m[1], 16), b: parseInt(m[2] + m[2], 16) };
  }
  return { r: parseInt(m.slice(0, 2), 16), g: parseInt(m.slice(2, 4), 16), b: parseInt(m.slice(4, 6), 16) };
}

/* ------------------------------ drawing ---------------------------------- */

/**
 * Feathered edge. The portrait should dissolve into the frame rather than sit
 * in a hard rectangle — a visible photo border is the thing that makes a
 * composited still look pasted on.
 */
function feather(ctx, x, y, w, h, inset = 0.16) {
  // Work in a unit circle scaled to the box, so the falloff reaches full
  // transparency at every edge and corner rather than only along the long
  // axis. A circular gradient sized off max(w,h) leaves the short edges hard,
  // which is exactly what made an opaque photograph read as a pasted-in
  // rectangle.
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(w / 2, h / 2);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(Math.max(0, 1 - inset * 2.4), 'rgba(0,0,0,1)');
  g.addColorStop(0.94, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}

/** Draw a portrait, cropped to `rect` of the source, into the given box. */
export function drawPortrait(ctx, key, box, { inkColor = '#14141a', paperColor = '#efe9db', alpha = 1, crop = null, feathered = true } = {}) {
  const t = treat(key, inkColor, paperColor);
  if (!t) return false;

  const [bx, by, bw, bh] = box;
  const src = crop
    ? [crop[0] * t.w, crop[1] * t.h, crop[2] * t.w, crop[3] * t.h]
    : [0, 0, t.w, t.h];

  // Cover-fit the crop into the box.
  const sr = src[2] / src[3];
  const br = bw / bh;
  let sw = src[2], sh = src[3], sx = src[0], sy = src[1];
  if (sr > br) { sw = src[3] * br; sx = src[0] + (src[2] - sw) / 2; }
  else { sh = src[2] / br; sy = src[1] + (src[3] - sh) / 2; }

  const buf = document.createElement('canvas');
  buf.width = Math.max(1, Math.round(bw));
  buf.height = Math.max(1, Math.round(bh));
  const bg = buf.getContext('2d');
  bg.drawImage(t.canvas, sx, sy, sw, sh, 0, 0, buf.width, buf.height);
  // A photograph is opaque edge to edge and needs a deeper falloff than line
  // art, which is mostly transparent paper already.
  if (feathered) feather(bg, 0, 0, buf.width, buf.height, t.mode === 'photo' ? 0.24 : 0.14);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(buf, bx, by);
  ctx.restore();
  return true;
}

/** Head-and-shoulders crop, for cutting in on a line of dialogue. */
export function drawFace(ctx, key, box, opts = {}) {
  const entry = CAST[key];
  const rec = store.get(key);
  // A user-supplied still is usually already framed on the face; the bundled
  // full-length 绣像 are not, so they carry an explicit head rectangle.
  const crop = rec?.isOverride ? null : (entry?.face || null);
  return drawPortrait(ctx, key, box, { ...opts, crop });
}
