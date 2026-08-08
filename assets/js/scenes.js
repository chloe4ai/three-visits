import * as I from './ink.js';
import * as P from './portraits.js';

/**
 * scenes.js — one composition function per scene type.
 *
 * Signature: (ctx, W, H, pal, t, p, shot) where `t` is seconds elapsed within
 * the shot and `p` is 0→1 progress through it. The camera transform is already
 * applied by the engine, so these draw in plain frame coordinates.
 *
 * There is no battle here, so there is no spectacle to lean on. Every shot has
 * to hold on stillness: a closed gate, a man standing at the foot of some
 * steps, light crossing a floor. The compositional job is to keep the same
 * setup interesting three times while only the season changes.
 */

const CJK = '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", serif';
const LATIN = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

/* ------------------------------ title cards ------------------------------- */

function inkTitle(ctx, W, H, pal, t, p, shot, { big = true } = {}) {
  I.paper(ctx, W, H, pal);
  const settle = I.easeOut(Math.min(1, t / 1.6));
  const card = shot.card || {};

  if (shot.plate && P.has(shot.plate)) {
    const k = I.easeInOut(Math.min(1, t / 2.2));
    const zoom = 1 + p * 0.05;
    const bw = W * 1.02 * zoom;
    const bh = H * 1.02 * zoom;
    P.drawPortrait(ctx, shot.plate, [(W - bw) / 2, (H - bh) / 2 - p * 8, bw, bh], {
      inkColor: '#2b2c30', paperColor: pal.bg[0], alpha: 0.30 * k, feathered: true,
    });
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = pal.bg[0];
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cy = big ? H * 0.44 : H * 0.5;

  I.bleed(ctx, W / 2, cy, (big ? 210 : 150) * settle, 'rgba(30,32,36,0.10)', 0.9);

  ctx.globalAlpha = settle;
  ctx.fillStyle = pal.text;
  ctx.font = `${big ? 168 : 104}px ${CJK}`;
  ctx.fillText(card.zh || '', W / 2, cy);

  ctx.globalAlpha = settle * 0.85;
  ctx.font = `${big ? 34 : 22}px ${LATIN}`;
  ctx.letterSpacing = big ? '18px' : '10px';
  ctx.fillText(card.en || '', W / 2, cy + (big ? 132 : 84));
  ctx.letterSpacing = '0px';

  if (shot.footer) {
    ctx.globalAlpha = settle * 0.55 * Math.min(1, Math.max(0, (t - 1.2) / 1.2));
    ctx.font = `17px ${LATIN}`;
    ctx.fillText(shot.footer, W / 2, H * 0.78);
  }
  ctx.restore();

  if (big) I.seal(ctx, W * 0.5 + 150, cy - 96, 1.25, '三顧', { alpha: settle * 0.9 });
  I.grain(ctx, W, H, 0.07);
}

export function titleCard(ctx, W, H, pal, t, p, shot) { inkTitle(ctx, W, H, pal, t, p, shot, { big: true }); }
export function chapterCard(ctx, W, H, pal, t, p, shot) { inkTitle(ctx, W, H, pal, t, p, shot, { big: false }); }
export function endCard(ctx, W, H, pal, t, p, shot) { inkTitle(ctx, W, H, pal, t, p, shot, { big: true }); }

/* ---------------------------- character plate ----------------------------- */

export function characterPlate(ctx, W, H, pal, t, p, shot) {
  const key = shot.portrait;
  const entry = P.CAST[key] || {};
  I.paper(ctx, W, H, pal);

  const inA = I.easeOut(I.clamp01(t / 0.9));
  const outA = I.clamp01((shot.dur - t) / 0.5);
  const a = inA * outA;

  I.bleed(ctx, W * 0.30, H * 0.53, H * 0.42, 'rgba(40,42,48,0.10)', a);

  const boxW = W * 0.30;
  const boxH = H * 0.66;
  const bx = W * 0.13;
  const by = H * 0.19;
  const drift = (1 - inA) * 14;
  const drawn = P.drawPortrait(ctx, key, [bx, by + drift, boxW, boxH], {
    inkColor: '#191b1f', paperColor: pal.bg[0], alpha: a,
  });

  const tx = W * 0.50;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.globalAlpha = a;
  ctx.fillStyle = pal.text;
  ctx.font = `76px ${CJK}`;
  ctx.fillText(entry.zh || '', tx, H * 0.46);

  ctx.globalAlpha = a * 0.9;
  ctx.font = `24px ${LATIN}`;
  ctx.letterSpacing = '10px';
  ctx.fillText(entry.en || '', tx + 2, H * 0.545);
  ctx.letterSpacing = '0px';

  ctx.globalAlpha = a * 0.35;
  ctx.fillRect(tx + 2, H * 0.585, W * 0.20, 1);

  ctx.globalAlpha = a * 0.78;
  ctx.font = `26px ${CJK}`;
  ctx.fillText(entry.roleZh || '', tx + 2, H * 0.645);
  ctx.globalAlpha = a * 0.55;
  ctx.font = `15px ${LATIN}`;
  ctx.fillText(entry.roleEn || '', tx + 2, H * 0.685);

  const src = P.has(key) ? P.info(key).source : entry.source;
  ctx.globalAlpha = a * 0.45 * I.clamp01((t - 1.1) / 0.8);
  ctx.font = `13px ${CJK}`;
  ctx.fillText(src || '', tx + 2, H * 0.76);

  if (!drawn) {
    ctx.globalAlpha = a * 0.4;
    ctx.font = `13px ${LATIN}`;
    ctx.fillText('[ portrait loading ]', bx, by + boxH / 2);
  }
  ctx.restore();
  I.grain(ctx, W, H, 0.07);
}


/* ------------------------------- Longzhong -------------------------------- */

const SEASON = {
  quiet:  { snow: 0, blossom: 0, leaf: 0.2, haze: 0.45 },
  snow:   { snow: 1, blossom: 0.5, leaf: 0, haze: 0.8 },
  spring: { snow: 0, blossom: 0.15, leaf: 1, haze: 0.35 },
};

const VISIT_LABEL = { 1: '一顧', 2: '二顧', 3: '三顧' };

/** Hills, haze and ground — the base for every exterior at Longzhong. */
function valleyBase(ctx, W, H, pal, t, horizon, season, { seed = 12 } = {}) {
  I.paper(ctx, W, H, pal);
  I.ridge(ctx, { w: W, h: H, baseY: horizon - H * 0.02, amp: H * 0.16, seed, color: pal.far, alpha: 0.8, jag: 2 });
  I.ridge(ctx, { w: W, h: H, baseY: horizon + H * 0.03, amp: H * 0.10, seed: seed + 20, color: pal.mid, alpha: 0.6, jag: 3 });
  I.mist(ctx, { w: W, h: H, y: horizon - H * 0.02, band: H * 0.06, t, alpha: season.haze * 0.5, seed: seed + 7, speed: 2,
    color: season.snow ? 'rgba(240,246,252,1)' : 'rgba(238,236,220,1)' });
  ctx.save();
  ctx.fillStyle = pal.water;
  ctx.fillRect(-W * 0.2, horizon, W * 1.4, H - horizon + 20);
  ctx.restore();
  if (season.snow) I.snowDrift(ctx, { w: W, y: horizon + 6, depth: H * 0.02, seed: seed + 3 });
}

/**
 * The returning shot: the gate in the bamboo fence, three times.
 *
 * Same framing, same cottage, same distance. Only the season and who is
 * standing outside it change — and on the third visit, the gate.
 */
export function cottageGate(ctx, W, H, pal, t, p, shot) {
  const fx = shot.fx || {};
  const season = SEASON[fx.season] || SEASON.quiet;
  const horizon = H * 0.44;
  valleyBase(ctx, W, H, pal, t, horizon, season, { seed: 12 });

  // The stream and its plank bridge, in front of everything.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = season.snow ? 'rgba(150,170,186,0.8)' : 'rgba(120,132,120,0.75)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(-W * 0.1, H * 0.865);
  ctx.quadraticCurveTo(W * 0.42, H * 0.80, W * 1.1, H * 0.845);
  ctx.stroke();
  ctx.restore();

  I.pine(ctx, W * 0.16, H * 0.68, 1.15, { color: pal.near, alpha: 0.95, snow: season.snow, t, seed: 3 });
  I.pine(ctx, W * 0.86, H * 0.66, 0.9, { color: pal.near, alpha: 0.9, snow: season.snow, t: t + 2, seed: 8 });

  I.cottage(ctx, W * 0.54, H * 0.62, 1.05, {
    color: pal.near, alpha: 1, snow: season.snow, lit: fx.lit || 0, t,
  });

  if (season.blossom) {
    I.plumBranch(ctx, W * 0.30, H * 0.66, 1.0, { color: pal.near, alpha: 0.95, blossom: season.blossom, seed: 5 });
  }

  I.fence(ctx, {
    x0: W * 0.20, x1: W * 0.84, y: H * 0.725, h: H * 0.075,
    color: pal.near, alpha: 0.97, seed: 4,
    gateX: W * 0.44, gateOpen: fx.gateOpen, snow: season.snow,
  });

  I.bridge(ctx, { x0: W * 0.36, x1: W * 0.54, y: H * 0.845, color: pal.near, alpha: 0.95, rise: 13, snow: season.snow });

  // The callers, outside the fence. Their scale against the cottage is the
  // joke of the whole sequence: three armed men waiting on a farmhouse.
  const at = fx.atGate || 0;
  for (let i = 0; i < at; i++) {
    const x = W * (0.30 + i * 0.055);
    I.figure(ctx, x, H * 0.865, 0.95 - i * 0.05, { color: pal.near, alpha: 1, t: fx.letter ? 0 : t + i * 1.3 });
  }
  if (at) {
    I.horse(ctx, W * 0.13, H * 0.875, 0.85, t, { color: pal.near, alpha: 0.9, seed: 2 });
    I.horse(ctx, W * 0.05, H * 0.885, 0.9, t + 3, { color: pal.near, alpha: 0.9, flip: true, seed: 6 });
  }

  // The boy at the gate, small.
  if (fx.boy) I.figure(ctx, W * 0.47, H * 0.80, 0.55, { color: pal.near, alpha: 0.95, t: t + 1 });

  // The letter, left in the snow.
  if (fx.letter) {
    const a = I.clamp01((t - 2.6) / 1.4);
    ctx.save();
    ctx.globalAlpha = a * 0.95;
    ctx.fillStyle = 'rgba(242,236,220,0.97)';
    ctx.translate(W * 0.44, H * 0.79);
    ctx.rotate(-0.15);
    ctx.fillRect(-13, -17, 26, 34);
    ctx.restore();
  }

  if (season.snow) I.snowfall(ctx, { w: W, h: H, t, alpha: 0.85, seed: 7, density: 240, wind: 0.7 });

  // The visit counter, set like a seal.
  if (fx.visit) {
    const a = I.clamp01((t - 0.7) / 1.1) * I.clamp01((shot.dur - t) / 0.6);
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = pal.text;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `40px ${CJK}`;
    ctx.fillText(VISIT_LABEL[fx.visit] || '', W * 0.93, H * 0.28);
    ctx.globalAlpha = a * 0.5;
    ctx.font = `14px ${LATIN}`;
    ctx.letterSpacing = '3px';
    ctx.fillText(`VISIT ${fx.visit}`, W * 0.93, H * 0.325);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  I.vignette(ctx, W, H, 0.36);
  I.grain(ctx, W, H, 0.05);
}

/* ------------------------------ the hermit -------------------------------- */

export function recluseTalk(ctx, W, H, pal, t, p, shot) {
  const fx = shot.fx || {};
  const horizon = H * 0.52;
  valleyBase(ctx, W, H, pal, t, horizon, SEASON.quiet, { seed: 30 });

  I.pine(ctx, W * 0.78, H * 0.68, 1.5, { color: pal.near, alpha: 0.95, t, seed: 9 });
  I.fence(ctx, { x0: W * 0.08, x1: W * 0.62, y: H * 0.755, h: H * 0.07, color: pal.near, alpha: 0.9, seed: 11 });

  for (let i = 0; i < (fx.figures || 2); i++) {
    I.figure(ctx, W * (0.36 + i * 0.16), H * 0.865, 1.35, { color: pal.near, alpha: 1, flip: i === 1, t: t + i * 2 });
  }

  // The two names, appearing in the air between them.
  if (fx.named) {
    const a = I.clamp01((t - 2.4) / 1.5) * I.clamp01((shot.dur - t) / 0.8);
    ctx.save();
    ctx.globalAlpha = a * 0.75;
    ctx.fillStyle = pal.text;
    ctx.textAlign = 'center';
    ctx.font = `34px ${CJK}`;
    ctx.fillText('臥龍', W * 0.30, H * 0.34);
    ctx.fillText('鳳雛', W * 0.68, H * 0.34);
    ctx.globalAlpha = a * 0.4;
    ctx.font = `13px ${LATIN}`;
    ctx.fillText('SLEEPING DRAGON', W * 0.30, H * 0.385);
    ctx.fillText('FLEDGLING PHOENIX', W * 0.68, H * 0.385);
    ctx.restore();
  }

  I.vignette(ctx, W, H, 0.42);
  I.grain(ctx, W, H, 0.05);
}

/* -------------------------------- the road -------------------------------- */

export function ridingThere(ctx, W, H, pal, t, p, shot) {
  const fx = shot.fx || {};
  const season = SEASON[fx.season] || SEASON.quiet;
  const horizon = H * 0.48;
  valleyBase(ctx, W, H, pal, t, horizon, season, { seed: 44 });

  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = season.snow ? 'rgba(255,255,255,0.9)' : 'rgba(60,54,42,0.6)';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(-W * 0.1, H * 0.87);
  ctx.quadraticCurveTo(W * 0.5, H * 0.68, W * 1.1, H * 0.79);
  ctx.stroke();
  ctx.restore();

  I.pine(ctx, W * 0.10, H * 0.76, 1.2, { color: pal.near, alpha: 0.9, snow: season.snow, t, seed: 4 });
  I.pine(ctx, W * 0.92, H * 0.80, 1.5, { color: pal.near, alpha: 0.95, snow: season.snow, t: t + 3, seed: 7 });

  const dir = fx.returning ? -1 : 1;
  const n = fx.riders || 3;
  for (let i = 0; i < n; i++) {
    const q = (i / Math.max(1, n)) * 0.34 + 0.18 + (dir > 0 ? p * 0.3 : (1 - p) * 0.3);
    const x = W * (0.05 + q * 0.9);
    const y = H * (0.87 - Math.sin(q * Math.PI * 0.9) * 0.17);
    const s = 0.65 + Math.sin(q * Math.PI * 0.9) * 0.35;
    if (fx.walking) {
      I.figure(ctx, x, y, s * 1.25, { color: pal.near, alpha: 1, flip: dir < 0, t: t + i * 0.8 });
      I.horse(ctx, x - 44 * s, y, s * 0.9, t + i, { color: pal.near, alpha: 0.9, flip: dir < 0, seed: i + 2 });
    } else {
      I.cavalry(ctx, x, y, s, t + i * 0.7, { color: pal.near, alpha: 1, flip: dir < 0, seed: i + 3 });
    }
  }

  if (season.snow) I.snowfall(ctx, { w: W, h: H, t, alpha: 0.85, seed: 13, density: 260, wind: 0.9 });

  I.vignette(ctx, W, H, 0.4);
  I.grain(ctx, W, H, 0.05);
}

/* -------------------------------- waiting --------------------------------- */

/**
 * The long wait at the foot of the steps. Nothing happens in this scene on
 * purpose — the only thing that moves is the light on the floor, and the only
 * thing that changes is how long it has been.
 */
export function waiting(ctx, W, H, pal, t, p, shot) {
  const fx = shot.fx || {};
  const hours = fx.hours || 0;

  I.paper(ctx, W, H, pal);
  ctx.save();
  ctx.fillStyle = 'rgba(30,32,26,0.9)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // The doorway: the interior is a bright rectangle and everything else is dark.
  const dx = W * 0.34, dw = W * 0.32, dy = H * 0.16, dh = H * 0.66;
  ctx.save();
  const g = ctx.createLinearGradient(dx, dy, dx, dy + dh);
  g.addColorStop(0, 'rgba(246,240,214,0.92)');
  g.addColorStop(1, 'rgba(214,204,172,0.88)');
  ctx.fillStyle = g;
  ctx.fillRect(dx, dy, dw, dh);
  ctx.restore();

  // The sunlight lozenge on the floor, which is the clock for this scene.
  const shift = I.lerp(0.1, 0.62, hours ? 0.5 + p * 0.4 : p * 0.35);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(255,246,210,0.9)';
  ctx.beginPath();
  ctx.moveTo(dx + dw * shift, dy + dh * 0.62);
  ctx.lineTo(dx + dw * (shift + 0.3), dy + dh * 0.62);
  ctx.lineTo(dx + dw * (shift + 0.42), dy + dh);
  ctx.lineTo(dx + dw * (shift - 0.06), dy + dh);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (fx.sleeping) {
    I.couchAndScreen(ctx, { w: W, h: H, y: dy + dh * 0.72, color: 'rgba(40,42,34,0.85)', alpha: 1 });
    ctx.save();                                   // the sleeper, lying down
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(34,36,30,0.9)';
    ctx.translate(W * 0.5, dy + dh * 0.70);
    ctx.beginPath();
    ctx.ellipse(0, 0, W * 0.085, H * 0.022, -0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-W * 0.075, -H * 0.012, H * 0.018, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Liu Bei at the foot of the steps, hands together, not moving at all.
  I.figure(ctx, W * 0.20, H * 0.87, 1.7, { color: '#14160f', alpha: 1, t: 0 });
  if (fx.restless) {
    // The other two, shifting. Zhang Fei has ideas.
    I.figure(ctx, W * 0.76, H * 0.875, 1.6, { color: '#14160f', alpha: 1, flip: true, t: t * 2.2 });
    I.figure(ctx, W * 0.88, H * 0.88, 1.5, { color: '#14160f', alpha: 1, flip: true, t: t * 3.1 + 2 });
  } else {
    I.figure(ctx, W * 0.80, H * 0.875, 1.55, { color: '#14160f', alpha: 1, flip: true, t: t * 0.5 });
  }

  // How long it has been.
  const a = I.clamp01((t - 1.4) / 1.4) * I.clamp01((shot.dur - t) / 0.8);
  ctx.save();
  ctx.globalAlpha = a * 0.6;
  ctx.fillStyle = 'rgba(240,236,222,0.9)';
  ctx.textAlign = 'right';
  ctx.font = `26px ${CJK}`;
  ctx.fillText(hours ? '兩個時辰' : '一個時辰', W * 0.95, H * 0.28);
  ctx.restore();

  I.vignette(ctx, W, H, 0.6);
  I.grain(ctx, W, H, 0.06);
}

/* ------------------------------- interior --------------------------------- */

export function interior(ctx, W, H, pal, t, p, shot) {
  I.paper(ctx, W, H, pal);
  ctx.save();
  ctx.fillStyle = 'rgba(226,220,192,0.95)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // A window with the slow sun in it, which is what the poem is about.
  ctx.save();
  ctx.fillStyle = 'rgba(60,62,50,0.9)';
  ctx.fillRect(W * 0.62, H * 0.18, W * 0.26, H * 0.34);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillRect(W * 0.635, H * 0.195, W * 0.23, H * 0.31);
  ctx.restore();
  ctx.restore();
  I.bleed(ctx, W * 0.75, H * 0.35, H * 0.34, 'rgba(255,248,206,0.9)', 0.55);
  ctx.save();                                     // lattice
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = 'rgba(60,62,50,0.9)';
  for (let i = 1; i < 4; i++) ctx.fillRect(W * (0.635 + i * 0.0575), H * 0.195, 3, H * 0.31);
  for (let i = 1; i < 3; i++) ctx.fillRect(W * 0.635, H * (0.195 + i * 0.103), W * 0.23, 3);
  ctx.restore();

  I.couchAndScreen(ctx, { w: W, h: H, y: H * 0.74, color: 'rgba(52,54,42,0.9)', alpha: 1 });

  // Waking: he comes up onto one elbow partway through the shot.
  const rise = I.easeInOut(I.clamp01((t - 2.2) / 2.4));
  ctx.save();
  ctx.fillStyle = '#191b14';
  ctx.translate(W * 0.44, H * 0.72 - rise * H * 0.05);
  ctx.rotate(-rise * 0.22);
  ctx.beginPath();
  ctx.ellipse(0, 0, W * 0.11, H * 0.028, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-W * 0.095, -H * 0.018 - rise * H * 0.03, H * 0.024, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  I.vignette(ctx, W, H, 0.5);
  I.grain(ctx, W, H, 0.06);
}

/* ------------------------------ Longzhong plan ---------------------------- */

export function longzhongPlan(ctx, W, H, pal, t, p, shot) {
  const fx = shot.fx || {};
  I.paper(ctx, W, H, pal);
  ctx.save();
  ctx.fillStyle = 'rgba(214,208,180,0.95)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  I.bleed(ctx, W * 0.5, H * 0.3, H * 0.8, 'rgba(255,250,214,0.8)', 0.45);

  // The map is the subject of the scene, so it is large and central.
  I.empireMap(ctx, W * 0.5, H * 0.5, Math.min(W / 480, H / 330), { alpha: 1, reveal: fx.reveal ?? 0 });

  for (let i = 0; i < (fx.figures || 2); i++) {
    I.figure(ctx, W * (0.12 + i * 0.78), H * 0.885, 1.9, { color: '#171a12', alpha: 1, flip: i === 1, t: fx.quiet ? 0 : t + i * 2 });
  }

  if (fx.quiet) {
    // Nobody says anything for a moment.
    const a = I.clamp01((t - 2) / 1.6) * I.clamp01((shot.dur - t) / 1);
    ctx.save();
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = 'rgba(40,34,24,0.9)';
    ctx.textAlign = 'center';
    ctx.font = `20px ${CJK}`;
    ctx.fillText('隆中對', W * 0.5, H * 0.13);
    ctx.restore();
  }

  I.vignette(ctx, W, H, 0.44);
  I.grain(ctx, W, H, 0.06);
}

/* ------------------------------- departure -------------------------------- */

export function departure(ctx, W, H, pal, t, p, shot) {
  const fx = shot.fx || {};
  const horizon = H * 0.46;
  valleyBase(ctx, W, H, pal, t, horizon, SEASON.spring, { seed: 61 });

  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = 'rgba(60,54,42,0.6)';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(-W * 0.1, H * 0.865);
  ctx.quadraticCurveTo(W * 0.45, H * 0.70, W * 1.1, H * 0.78);
  ctx.stroke();
  ctx.restore();

  I.pine(ctx, W * 0.88, H * 0.79, 1.4, { color: pal.near, alpha: 0.95, t, seed: 7 });
  I.plumBranch(ctx, W * 0.08, H * 0.76, 1.1, { color: pal.near, alpha: 0.9, blossom: 0.35, seed: 5 });

  // Four now, where three rode out. The new one rides last.
  const n = fx.riders || 4;
  for (let i = 0; i < n; i++) {
    const q = 0.16 + (i / n) * 0.6 + p * 0.16;
    const x = W * (0.04 + q * 0.92);
    const y = H * (0.865 - Math.sin(q * Math.PI * 0.9) * 0.16);
    const s = 0.62 + Math.sin(q * Math.PI * 0.9) * 0.34;
    I.cavalry(ctx, x, y, s, t + i * 0.7, { color: pal.near, alpha: 1, seed: i + 4 });
  }

  I.vignette(ctx, W, H, 0.4);
  I.grain(ctx, W, H, 0.05);
}

export const SCENES = {
  titleCard, chapterCard, endCard, characterPlate,
  cottageGate, recluseTalk, ridingThere, waiting, interior, longzhongPlan, departure,
};
