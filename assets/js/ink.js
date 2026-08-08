/**
 * ink.js — a procedural ink-wash (水墨) drawing library.
 *
 * Every frame of this film is composed in code. There is no photography and no
 * generated imagery, so the visual language has to be one that code can
 * actually execute well: silhouette, value, negative space and bleed rather
 * than texture and detail. Ink-wash is that language, and it happens to be the
 * right one for a 3rd-century Chinese river battle fought at night.
 *
 * Everything here is deterministic given a seed, so a shot renders identically
 * on every playthrough — which is what makes recording it to video safe.
 */

/* --------------------------------- random -------------------------------- */

/** mulberry32 — small, fast, seedable. Same seed, same frame, every time. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (t) => Math.max(0, Math.min(1, t));
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOut = (t) => 1 - (1 - t) ** 3;
export const easeIn = (t) => t * t * t;

/* -------------------------------- palettes -------------------------------- */

export const PALETTES = {
  // Paper and black ink. Titles, chapter cards, the calm before.
  ink: {
    bg: ['#efe9db', '#e4dccb'],
    far: 'rgba(60,66,72,0.20)',
    mid: 'rgba(40,45,50,0.38)',
    near: 'rgba(22,24,27,0.86)',
    water: 'rgba(70,78,86,0.16)',
    fg: '#191b1e',
    text: '#1a1c1f',
    accent: '#a8362a',
    glow: 'rgba(200,190,170,0.5)',
    dark: false,
  },
  // Late autumn at Longzhong: bare, pale, quiet. The first visit.
  quiet: {
    bg: ['#ddd6c6', '#cfc5b1', '#a89c86'],
    far: 'rgba(150,146,132,0.34)',
    mid: 'rgba(92,88,76,0.55)',
    near: 'rgba(38,34,28,0.93)',
    water: 'rgba(176,168,150,0.9)',
    fg: '#262219',
    text: '#241f17',
    accent: '#8a4426',
    glow: 'rgba(250,244,228,0.55)',
    dark: false,
  },
  // Deep snow. The second visit, and the coldest image in the film.
  snow: {
    bg: ['#dfe6ec', '#cdd6de', '#aab6c0'],
    far: 'rgba(180,192,204,0.4)',
    mid: 'rgba(112,124,136,0.5)',
    near: 'rgba(34,38,44,0.94)',
    water: 'rgba(224,232,238,0.96)',
    fg: '#22262c',
    text: '#1e2228',
    accent: '#8a4426',
    glow: 'rgba(255,255,255,0.7)',
    dark: false,
  },
  // Spring. The third visit, and the only one that works.
  spring: {
    bg: ['#cfdcc9', '#bccdb6', '#8fa285'],
    far: 'rgba(160,180,158,0.36)',
    mid: 'rgba(88,102,82,0.5)',
    near: 'rgba(32,38,30,0.93)',
    water: 'rgba(168,186,158,0.92)',
    fg: '#20261e',
    text: '#1c2219',
    accent: '#8a4426',
    glow: 'rgba(252,250,226,0.6)',
    dark: false,
  },
  // The long night on the river.
  night: {
    bg: ['#0a1018', '#111c28', '#1b2a38'],
    far: 'rgba(120,150,180,0.16)',
    mid: 'rgba(30,45,62,0.85)',
    near: 'rgba(5,8,12,0.96)',
    water: 'rgba(12,22,34,0.9)',
    fg: '#050809',
    text: '#dfe6ec',
    accent: '#e8622a',
    glow: 'rgba(150,190,225,0.5)',
    dark: true,
  },
  // Once the fleet is alight, the fire is the only light source. The base has
  // to stay dark: brightness is painted in deliberately where the fire is, so
  // the ships still read as black silhouettes against it. A bright base makes
  // the whole frame an orange wash with no contrast anywhere.
  fire: {
    bg: ['#070403', '#130806', '#220d07'],
    far: 'rgba(255,170,90,0.22)',
    mid: 'rgba(60,20,10,0.8)',
    near: 'rgba(10,5,3,0.95)',
    water: 'rgba(70,22,8,0.85)',
    fg: '#0a0503',
    text: '#ffe4c4',
    accent: '#ffb347',
    glow: 'rgba(255,150,60,0.75)',
    dark: true,
  },
  // Morning after. Deliberately kept dark at the top and bottom with the light
  // confined to the horizon — an evenly lit dawn goes flat and beige, which is
  // the opposite of what this beat needs.
  dawn: {
    bg: ['#171520', '#3c2f36', '#8a6a58'],
    far: 'rgba(255,215,180,0.3)',
    mid: 'rgba(48,38,42,0.85)',
    near: 'rgba(14,11,14,0.95)',
    water: 'rgba(58,46,46,0.82)',
    fg: '#171418',
    text: '#f2e2d2',
    accent: '#d8763c',
    glow: 'rgba(255,205,150,0.5)',
    dark: true,
  },
};

/* --------------------------------- paper ---------------------------------- */

let grainTile = null;

/** Pre-rendered noise, drawn once and reused — real paper is never flat. */
function getGrain() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  const r = rng(9137);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

export function paper(ctx, w, h, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const stops = pal.bg;
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function grain(ctx, w, h, alpha = 0.05) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = alpha;
  const t = getGrain();
  const p = ctx.createPattern(t, 'repeat');
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Vignette — keeps the eye centred and hides the canvas edges. */
export function vignette(ctx, w, h, strength = 0.5) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/* ------------------------------- brushwork -------------------------------- */

/** A tapered brush stroke through points — thick in the belly, thin at the ends. */
export function brush(ctx, pts, width, color, alpha = 1) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  const n = pts.length;
  const w = (i) => width * Math.sin((i / (n - 1)) * Math.PI) ** 0.6;
  // Up one side...
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    const ang = Math.atan2(next[1] - prev[1], next[0] - prev[0]) + Math.PI / 2;
    const o = w(i) / 2;
    const x = p[0] + Math.cos(ang) * o;
    const y = p[1] + Math.sin(ang) * o;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  // ...and back down the other.
  for (let i = n - 1; i >= 0; i--) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    const ang = Math.atan2(next[1] - prev[1], next[0] - prev[0]) - Math.PI / 2;
    const o = w(i) / 2;
    ctx.lineTo(p[0] + Math.cos(ang) * o, p[1] + Math.sin(ang) * o);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * A soft blot, the way wet ink spreads into paper.
 *
 * `soft` removes the solid core: with it, overlapping blots merge into one
 * mass instead of reading as a row of discs, which is what smoke needs.
 */
export function bleed(ctx, x, y, r, color, alpha = 0.5, soft = false) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  if (!soft) g.addColorStop(0.45, color);
  else g.addColorStop(0.5, color.replace(/[\d.]+\)$/, '0.45)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* -------------------------------- landscape ------------------------------- */

/**
 * A ridgeline. Depth comes from value, not detail: distant ranges are pale and
 * low-contrast, near ones nearly black. Layer three and you have a river gorge.
 */
export function ridge(ctx, { w, h, baseY, amp, seed, color, alpha = 1, jag = 3, roll = 0 }) {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, h + 10);
  const peaks = [];
  const n = 7 + Math.floor(r() * 4);
  for (let i = 0; i <= n; i++) {
    const x = -w * 0.2 + (w * 1.4 * i) / n;
    const bias = Math.sin((i / n) * Math.PI * (1 + r() * 0.6)) ** jag;
    peaks.push([x + roll, baseY - amp * bias * (0.55 + r() * 0.65)]);
  }
  ctx.lineTo(peaks[0][0], peaks[0][1]);
  for (let i = 0; i < peaks.length - 1; i++) {
    const [x0, y0] = peaks[i];
    const [x1, y1] = peaks[i + 1];
    const mx = (x0 + x1) / 2;
    ctx.quadraticCurveTo(x0 + (mx - x0) * 0.6, y0 + (y1 - y0) * 0.15, mx, (y0 + y1) / 2);
    ctx.quadraticCurveTo(x1 - (x1 - mx) * 0.6, y1 - (y1 - y0) * 0.15, x1, y1);
  }
  ctx.lineTo(w * 1.2, h + 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The cliffs themselves — near-vertical, blunt, oppressive. */
export function cliffWall(ctx, { w, h, side = 'left', width, color, alpha = 1, seed = 5 }) {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  const sgn = side === 'left' ? 1 : -1;
  const x0 = side === 'left' ? 0 : w;
  ctx.moveTo(x0, -20);
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    const y = (-20 + (h + 40) * i) / steps;
    const bulge = width * (0.55 + r() * 0.6) * (0.5 + 0.5 * Math.sin(i * 1.7));
    ctx.lineTo(x0 + sgn * bulge, y);
  }
  ctx.lineTo(x0, h + 20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Horizontal river band with drifting ripple strokes. */
export function water(ctx, { w, h, y, color, t, seed = 3, ripples = 26, alpha = 1, glowColor, glowX, glowSpread }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(-w * 0.2, y, w * 1.4, h - y + 20);

  if (glowColor) {
    // A light source on the water. This has to be a soft pool with broken
    // highlights riding on it — drawn as a hard-edged wedge it reads as a
    // spotlight cone, which is the one thing water never looks like.
    const spreadX = w * (glowSpread || 0.22);
    const spreadY = (h - y) * 1.15;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w * 0.2, y, w * 1.4, h - y + 20);
    ctx.clip();
    ctx.globalAlpha = alpha * 0.9;
    ctx.translate(glowX, y);
    ctx.scale(spreadX / spreadY, 1);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, spreadY);
    g.addColorStop(0, glowColor);
    g.addColorStop(0.45, glowColor.replace(/[\d.]+\)$/, '0.35)'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-spreadY * 2, 0, spreadY * 4, spreadY);
    ctx.restore();

    // Broken glints scattered down the reflection path — this is what actually
    // sells it as a reflection rather than a glow.
    const gr = rng(seed * 13 + 5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w * 0.2, y, w * 1.4, h - y + 20);
    ctx.clip();
    ctx.strokeStyle = glowColor;
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const d = gr();
      const ry = y + (h - y) * d ** 1.25 + 3;
      const jitter = (gr() - 0.5) * spreadX * (0.35 + d * 1.5);
      const len = spreadX * (0.06 + gr() * 0.3) * (0.4 + d);
      const drift = Math.sin(t * (0.6 + d) + i) * 6 * (0.3 + d);
      ctx.globalAlpha = alpha * (0.5 - d * 0.35) * (0.4 + gr() * 0.6);
      ctx.lineWidth = 1 + d * 2.6;
      ctx.beginPath();
      ctx.moveTo(glowX + jitter + drift - len / 2, ry);
      ctx.lineTo(glowX + jitter + drift + len / 2, ry);
      ctx.stroke();
    }
    ctx.restore();
  }

  const r = rng(seed);
  for (let i = 0; i < ripples; i++) {
    const ry = y + (h - y) * (i / ripples) ** 1.5 + 4;
    const speed = 6 + (i / ripples) * 26;
    const off = (t * speed + r() * w) % (w * 1.4) - w * 0.2;
    const len = w * (0.04 + r() * 0.16) * (0.4 + (i / ripples));
    const a = alpha * (0.05 + (i / ripples) * 0.22);
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 0.6 + (i / ripples) * 1.6;
    ctx.beginPath();
    ctx.moveTo(off, ry);
    ctx.quadraticCurveTo(off + len / 2, ry - 1.5, off + len, ry);
    ctx.stroke();
  }
  ctx.restore();
}

/* --------------------------------- mist ----------------------------------- */

/**
 * River mist. Many thin, wide, near-transparent streaks rather than a few fat
 * ellipses — stacked blobs read as a smear across the middle of the frame,
 * which is what this looked like on the first pass.
 */
export function mist(ctx, { w, h, y, band, t, alpha = 0.25, color = 'rgba(210,225,240,1)', seed = 11, speed = 8 }) {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < 11; i++) {
    const yy = y + (r() - 0.5) * band * 1.4;
    const hh = band * (0.06 + r() * 0.22);
    const off = ((t * speed * (0.3 + r() * 1.2)) % (w * 2.2)) - w * 0.6;
    const g = ctx.createLinearGradient(0, yy - hh, 0, yy + hh);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * (0.10 + r() * 0.3);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(off + w * 0.4, yy, w * (0.28 + r() * 0.45), hh, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* --------------------------------- ships ---------------------------------- */


/* ---------------------------------- fire ---------------------------------- */

/**
 * Fire, as a cluster of leaning tongues rather than one shape.
 *
 * A single symmetric triangle reads as a traffic cone the moment you scale it
 * up, which is exactly what the first pass looked like. Several narrow,
 * asymmetric, independently-leaning tongues at different heights read as
 * flame at any size.
 */
export function flame(ctx, x, y, s, t, { alpha = 1, seed = 7, tongues = 4, height = 1 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'screen';

  const layers = [
    ['rgba(190,55,12,0.40)', 1.0],
    ['rgba(255,125,35,0.46)', 0.66],
    ['rgba(255,230,165,0.55)', 0.33],
  ];

  for (let i = 0; i < tongues; i++) {
    const base = r();
    const ox = (base - 0.5) * 16 * s;
    const hgt = (20 + r() * 30) * s * height;
    const wid = (5.5 + r() * 5) * s;
    // Each tongue leans and flickers on its own clock.
    const lean = Math.sin(t * 3.1 + i * 2.3 + base * 6) * 0.38;
    const flick = 0.82 + Math.sin(t * (8 + i * 1.7) + i * 3) * 0.18;

    for (const [col, k] of layers) {
      const w2 = wid * k;
      const h2 = hgt * k * flick;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(ox - w2, 0);
      ctx.bezierCurveTo(
        ox - w2 * 0.95, -h2 * 0.38,
        ox - w2 * 0.45 + lean * h2 * 0.45, -h2 * 0.72,
        ox + lean * h2, -h2,
      );
      ctx.bezierCurveTo(
        ox + w2 * 0.45 + lean * h2 * 0.45, -h2 * 0.72,
        ox + w2 * 0.95, -h2 * 0.38,
        ox + w2, 0,
      );
      ctx.quadraticCurveTo(ox, h2 * 0.05, ox - w2, 0);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  // Embers
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = 'rgba(255,200,120,0.9)';
  for (let i = 0; i < 5; i++) {
    const p = (t * 0.6 + r()) % 1;
    ctx.globalAlpha = alpha * (1 - p) * 0.7;
    ctx.beginPath();
    ctx.arc(x + (r() - 0.5) * 30 * s, y - p * 90 * s, 1.4 * s * (1 - p * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * A smoke column. Puffs are kept narrow and released in a tight vertical
 * stack, drifting only slightly as they rise — wide random scatter reads as
 * fog, not as a plume standing off a burning ship.
 */
export function smoke(ctx, x, y, s, t, { alpha = 0.4, seed = 13, color = 'rgba(40,40,45,1)', rise = 120, spread = 0.35, puffs = 11 } = {}) {
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < puffs; i++) {
    const ph = (t * 0.16 + i / puffs + r() * 0.06) % 1;
    const yy = y - ph * rise * s;
    // Narrow at the base, opening out as it climbs.
    const rr = s * (10 + ph * 46) * (0.7 + r() * 0.5);
    const a = alpha * (1 - ph) ** 1.3 * (0.5 + r() * 0.5);
    const lean = Math.sin(t * 0.35 + i * 0.7) * 18 * s * ph * spread;
    const wobble = (r() - 0.5) * 26 * s * spread;
    bleed(ctx, x + lean + wobble, yy, rr, color, a, true);
  }
  ctx.restore();
}

/* -------------------------------- figures --------------------------------- */

/** A robed figure. Stance carries the character; there is no room for a face. */
export function figure(ctx, x, y, s, { color = '#000', alpha = 1, pose = 'stand', flip = false, t = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  const sway = Math.sin(t * 1.1) * 0.8;

  // Robe
  ctx.beginPath();
  ctx.moveTo(-6, -46);
  ctx.lineTo(6, -46);
  if (pose === 'arms-raised') {
    ctx.lineTo(15, -34);
    ctx.lineTo(26, -62);
    ctx.lineTo(31, -60);
    ctx.lineTo(22, -28);
  } else {
    ctx.lineTo(13, -30);
  }
  ctx.quadraticCurveTo(17 + sway, -6, 15 + sway, 0);
  ctx.lineTo(-15 + sway, 0);
  ctx.quadraticCurveTo(-17 + sway, -6, -13, -30);
  if (pose === 'arms-raised') {
    ctx.lineTo(-22, -28);
    ctx.lineTo(-31, -60);
    ctx.lineTo(-26, -62);
    ctx.lineTo(-15, -34);
  }
  ctx.closePath();
  ctx.fill();

  // Head + headdress
  ctx.beginPath();
  ctx.arc(0, -53, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-7.5, -62, 15, 5);
  ctx.restore();
}

/** Banners — the whole plot turns on which way these point. */
export function banner(ctx, x, y, s, t, { color = '#000', alpha = 1, wind = 1, glyph = null, glyphColor = '#efe9db' } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(-1.6, -84, 3.2, 84);

  const dir = Math.sign(wind) || 1;
  const strength = Math.abs(wind);
  ctx.beginPath();
  ctx.moveTo(0, -82);
  const segs = 7;
  for (let i = 0; i <= segs; i++) {
    const p = i / segs;
    const flap = Math.sin(t * 5 - p * 4) * 5 * strength * p;
    ctx.lineTo(dir * p * 46 * strength, -82 + p * 6 + flap);
  }
  for (let i = segs; i >= 0; i--) {
    const p = i / segs;
    const flap = Math.sin(t * 5 - p * 4) * 5 * strength * p;
    ctx.lineTo(dir * p * 46 * strength, -50 + p * 10 + flap);
  }
  ctx.closePath();
  ctx.fill();

  if (glyph) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.92;
    ctx.fillStyle = glyphColor;
    ctx.font = '22px "Songti SC", "STSong", "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, dir * 20 * strength, -66);
    ctx.restore();
  }
  ctx.restore();
}

/* --------------------------------- sky ------------------------------------ */

export function moon(ctx, x, y, r, { alpha = 1, color = 'rgba(230,240,255,1)' } = {}) {
  bleed(ctx, x, y, r * 4.5, color, alpha * 0.16);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function stars(ctx, w, h, { count = 90, seed = 21, alpha = 0.7, t = 0 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.fillStyle = '#dfeaf5';
  for (let i = 0; i < count; i++) {
    const x = r() * w;
    const y = r() * h * 0.55;
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    ctx.globalAlpha = alpha * (0.25 + r() * 0.75) * tw;
    ctx.beginPath();
    ctx.arc(x, y, r() * 1.3 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}


/* ------------------------------- typography -------------------------------- */

export function seal(ctx, x, y, s, text, { color = '#a8362a', alpha = 0.9 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  const r = 3 * s;
  ctx.roundRect ? ctx.roundRect(x, y, 34 * s, 34 * s, r) : ctx.rect(x, y, 34 * s, 34 * s);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `${15 * s}px "Songti SC", "STSong", "Noto Serif SC", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = text.split('');
  if (chars.length === 1) {
    ctx.fillText(chars[0], x + 17 * s, y + 17 * s);
  } else {
    ctx.fillText(chars[0], x + 17 * s, y + 11 * s);
    ctx.fillText(chars[1] || '', x + 17 * s, y + 25 * s);
  }
  ctx.restore();
}

/* ==========================================================================
   Longzhong. There is no battle in this story — no armies, no fire, no siege.
   The vocabulary is a thatched cottage behind a bamboo fence, pines, snow, a
   stream with a plank bridge, and three men standing outside a gate waiting to
   be let in. Everything is small, and the drama is entirely in how long people
   are willing to stand still.
   ========================================================================== */

/** Thatched cottage. Small on purpose — it has to look worth crossing a province for, and doesn't. */
export function cottage(ctx, x, y, s, { color = '#000', alpha = 1, snow = 0, lit = 0, t = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  ctx.fillRect(-52, -46, 104, 46);                       // walls
  ctx.beginPath();                                       // deep overhanging thatch
  ctx.moveTo(-72, -44);
  ctx.quadraticCurveTo(-30, -92, 0, -94);
  ctx.quadraticCurveTo(30, -92, 72, -44);
  ctx.quadraticCurveTo(36, -52, 0, -53);
  ctx.quadraticCurveTo(-36, -52, -72, -44);
  ctx.closePath();
  ctx.fill();

  ctx.save();                                            // doorway and one window
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillRect(-13, -32, 26, 32);
  ctx.fillRect(26, -36, 16, 15);
  ctx.restore();
  ctx.fillStyle = color;

  if (snow > 0) {                                        // snow lying on the thatch
    ctx.save();
    ctx.globalAlpha = alpha * snow;
    ctx.fillStyle = 'rgba(248,252,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(-70, -46);
    ctx.quadraticCurveTo(-30, -94, 0, -96);
    ctx.quadraticCurveTo(30, -94, 70, -46);
    ctx.quadraticCurveTo(34, -58, 0, -59);
    ctx.quadraticCurveTo(-34, -58, -70, -46);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  if (lit > 0) {
    // A lamp inside, seen through the door. Only ever lit on the third visit.
    bleed(ctx, x - 0 * s, y - 22 * s, 46 * s, 'rgba(255,196,120,0.85)', 0.5 * lit * (0.92 + 0.08 * Math.sin(t * 6)));
  }
}

/** Bamboo fence with a wicket gate — the thing Liu Bei keeps standing outside of. */
export function fence(ctx, { x0, x1, y, h, color = '#000', alpha = 1, seed = 3, gateX = null, gateOpen = false, snow = 0 }) {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const n = Math.max(6, Math.round(Math.abs(x1 - x0) / 13));
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, i / (n - 1));
    if (gateX !== null && Math.abs(x - gateX) < h * 0.55) continue;
    const hh = h * (0.86 + r() * 0.28);
    ctx.fillRect(x - 1.8, y - hh, 3.6, hh);
    if (snow > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * snow * 0.9;
      ctx.fillStyle = 'rgba(248,252,255,0.95)';
      ctx.fillRect(x - 2.6, y - hh - 3, 5.2, 3.4);
      ctx.restore();
      ctx.fillStyle = color;
    }
  }
  [0.42, 0.78].forEach((k) => {                          // horizontal rails
    ctx.fillRect(Math.min(x0, x1), y - h * k, Math.abs(x1 - x0), 2.4);
  });

  if (gateX !== null) {                                  // the wicket itself
    const gw = h * 0.5;
    ctx.save();
    ctx.translate(gateX, y);
    if (gateOpen) ctx.rotate(-0.5);
    ctx.fillRect(-gw, -h * 0.94, 3.2, h * 0.94);
    ctx.fillRect(gw - 3.2, -h * 0.94, 3.2, h * 0.94);
    ctx.fillRect(-gw, -h * 0.94, gw * 2, 3);
    for (let i = 1; i < 4; i++) ctx.fillRect(-gw + (gw * 2 * i) / 4, -h * 0.9, 2.2, h * 0.9);
    ctx.restore();
  }
  ctx.restore();
}

/** Pine — the standard companion to a recluse's cottage, and it holds snow well. */
export function pine(ctx, x, y, s, { color = '#000', alpha = 1, snow = 0, t = 0, seed = 2 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  ctx.beginPath();                                       // leaning trunk
  ctx.moveTo(-4, 0);
  ctx.quadraticCurveTo(-2, -40, -10, -74);
  ctx.lineTo(-4, -76);
  ctx.quadraticCurveTo(4, -42, 5, 0);
  ctx.closePath();
  ctx.fill();

  const tiers = [[-10, -76, 30], [-4, -58, 36], [2, -40, 30]];
  tiers.forEach(([tx, ty, tw], i) => {
    const sway = Math.sin(t * 0.8 + i) * 1.4;
    ctx.beginPath();                                     // flat horizontal canopies
    ctx.moveTo(tx - tw + sway, ty);
    ctx.quadraticCurveTo(tx + sway, ty - 13, tx + tw + sway, ty);
    ctx.quadraticCurveTo(tx + sway, ty + 6, tx - tw + sway, ty);
    ctx.closePath();
    ctx.fill();
    if (snow > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * snow;
      ctx.fillStyle = 'rgba(248,252,255,0.95)';
      ctx.beginPath();
      ctx.moveTo(tx - tw * 0.9 + sway, ty - 1);
      ctx.quadraticCurveTo(tx + sway, ty - 14, tx + tw * 0.9 + sway, ty - 1);
      ctx.quadraticCurveTo(tx + sway, ty - 7, tx - tw * 0.9 + sway, ty - 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = color;
    }
  });
  ctx.restore();
}

/** Bare winter branches with plum blossom — the one bright note in the snow. */
export function plumBranch(ctx, x, y, s, { color = '#000', alpha = 1, blossom = 0, seed = 5 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';

  const tips = [];
  const limb = (x0, y0, ang, len, w, depth) => {
    if (depth > 3 || len < 6) { tips.push([x0, y0]); return; }
    const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * 8, (y0 + y1) / 2 + (r() - 0.5) * 8, x1, y1);
    ctx.stroke();
    limb(x1, y1, ang - 0.4 - r() * 0.35, len * 0.68, w * 0.62, depth + 1);
    limb(x1, y1, ang + 0.4 + r() * 0.35, len * 0.62, w * 0.62, depth + 1);
  };
  limb(0, 0, -1.25, 40, 5, 0);

  if (blossom > 0) {
    ctx.fillStyle = 'rgba(236,196,204,0.95)';
    for (const [bx, by] of tips) {
      if (r() > blossom) continue;
      ctx.globalAlpha = alpha * (0.6 + r() * 0.4);
      ctx.beginPath();
      ctx.arc(bx + (r() - 0.5) * 5, by + (r() - 0.5) * 5, 2.4 + r() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Falling snow — slower and wider than rain, and it drifts sideways. */
export function snowfall(ctx, { w, h, t, alpha = 0.8, seed = 7, density = 220, wind = 0.5 }) {
  const r = rng(seed);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  for (let i = 0; i < density; i++) {
    const speed = 26 + r() * 54;
    const size = 0.9 + r() * 2.3;
    const x = ((r() * w * 1.4) + Math.sin(t * 0.5 + i) * 30 * wind + t * 26 * wind) % (w * 1.4) - w * 0.2;
    const y = ((r() * h) + t * speed) % h;
    ctx.globalAlpha = alpha * (0.25 + r() * 0.7);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Lying snow — a soft crested band along a ground line. */
export function snowDrift(ctx, { w, y, depth, seed = 9, alpha = 0.95 }) {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(246,251,255,0.97)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, y + depth * 3);
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const x = -w * 0.2 + (w * 1.4 * i) / n;
    ctx.lineTo(x, y - depth * (0.4 + r() * 0.9));
  }
  ctx.lineTo(w * 1.2, y + depth * 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** A plank bridge over a stream. Small, and everyone has to cross it single file. */
export function bridge(ctx, { x0, x1, y, color = '#000', alpha = 1, rise = 16, snow = 0 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const mid = (x0 + x1) / 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo(mid, y - rise * 2, x1, y);
  ctx.quadraticCurveTo(mid, y - rise * 1.5, x0, y);
  ctx.closePath();
  ctx.fill();
  if (snow > 0) {
    ctx.globalAlpha = alpha * snow;
    ctx.fillStyle = 'rgba(248,252,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(x0, y - rise * 0.3);
    ctx.quadraticCurveTo(mid, y - rise * 2.4, x1, y - rise * 0.3);
    ctx.quadraticCurveTo(mid, y - rise * 2.0, x0, y - rise * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A tethered horse, waiting. Three of them stand outside the fence for most of this film. */
export function horse(ctx, x, y, s, t, { color = '#000', alpha = 1, flip = false, seed = 4 } = {}) {
  const r = rng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const graze = Math.sin(t * 0.6 + r() * 5) * 3;

  ctx.beginPath();
  ctx.moveTo(-24, -22);
  ctx.quadraticCurveTo(-4, -30, 18, -24);
  ctx.quadraticCurveTo(28, -22, 28, -14);
  ctx.quadraticCurveTo(8, -8, -16, -10);
  ctx.quadraticCurveTo(-26, -12, -24, -22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();                                       // head lowered, cropping grass
  ctx.moveTo(18, -24);
  ctx.quadraticCurveTo(32, -26 + graze, 38, -14 + graze);
  ctx.lineTo(44, -12 + graze);
  ctx.quadraticCurveTo(40, -22 + graze, 30, -20);
  ctx.closePath();
  ctx.fill();
  [-18, -12, 14, 20].forEach((lx) => ctx.fillRect(lx - 1.6, -12, 3.4, 14));
  ctx.beginPath();
  ctx.moveTo(-24, -22);
  ctx.quadraticCurveTo(-34, -16, -30, -2);
  ctx.lineTo(-25, -6);
  ctx.quadraticCurveTo(-27, -16, -21, -20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * The map from the 隆中對 — the plan to hold Jing and Yi and let the empire
 * settle into three. This is the payoff image of the whole film, so it is the
 * one thing drawn with any precision.
 */
export function empireMap(ctx, x, y, s, { alpha = 1, reveal = 0, color = 'rgba(38,32,24,1)' } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = 'rgba(238,229,206,0.96)';              // the silk itself
  ctx.fillRect(-190, -128, 380, 256);
  ctx.strokeStyle = 'rgba(120,102,74,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-190, -128, 380, 256);

  ctx.strokeStyle = color;                               // the two rivers
  ctx.globalAlpha = alpha * 0.55;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-176, -58);
  ctx.bezierCurveTo(-90, -44, -10, -70, 172, -50);       // the Yellow River
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-176, 34);
  ctx.bezierCurveTo(-80, 14, 20, 52, 176, 24);           // the Yangtze
  ctx.stroke();

  // The three shares, filling in one at a time as he explains them.
  const shares = [
    { p: [[-176, -128], [176, -128], [176, -52], [-176, -60]], c: 'rgba(90,96,104,0.30)', label: '魏', lx: 30, ly: -92 },
    { p: [[-176, 30], [176, 22], [176, 128], [-176, 128]], c: 'rgba(80,110,96,0.30)', label: '吳', lx: 132, ly: 58 },
    { p: [[-176, -56], [10, -48], [30, 28], [-176, 34]], c: 'rgba(150,90,60,0.34)', label: '蜀', lx: -110, ly: -8 },
  ];
  shares.forEach((sh, i) => {
    const k = clamp01((reveal - i * 0.3) / 0.3);
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha * k * 0.9;
    ctx.fillStyle = sh.c;
    ctx.beginPath();
    sh.p.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha * k;
    ctx.fillStyle = color;
    ctx.font = '30px "Songti SC", "STSong", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sh.label, sh.lx, sh.ly);
    ctx.restore();
  });
  ctx.restore();
}

/** A low couch and a folding screen — the whole of the interior. */
export function couchAndScreen(ctx, { w, h, y, color = '#000', alpha = 1 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const sx = w * 0.28, sw = w * 0.44, sh = h * 0.26;     // screen behind
  ctx.fillRect(sx, y - sh, sw, sh);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 0.35;
  for (let i = 1; i < 3; i++) ctx.fillRect(sx + (sw * i) / 3, y - sh, 3, sh);
  ctx.restore();
  ctx.fillStyle = color;
  ctx.fillRect(w * 0.30, y, w * 0.40, h * 0.045);        // the couch
  ctx.fillRect(w * 0.31, y + h * 0.045, h * 0.02, h * 0.05);
  ctx.fillRect(w * 0.67, y + h * 0.045, h * 0.02, h * 0.05);
  ctx.restore();
}
