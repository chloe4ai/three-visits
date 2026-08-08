import { SCENES } from './scenes.js';
import { TIMELINE, RUNTIME } from './film.js';
import * as I from './ink.js';
import * as P from './portraits.js';

/**
 * engine.js — turns the screenplay into frames.
 *
 * Deterministic by construction: render(time) produces the same image for the
 * same time on every call. Nothing depends on wall-clock or on how many frames
 * have gone before, which is what lets the recorder capture a clean pass and
 * the scrubber seek anywhere.
 */

const TRANS = 0.9;          // transition length, seconds
const BAR = 0.115;          // letterbox bar height as a fraction of frame
const CJK = '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", serif';
const LATIN = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

export class Engine {
  constructor(canvas, { width = 1280, height = 720 } = {}) {
    this.canvas = canvas;
    this.W = canvas.width = width;
    this.H = canvas.height = height;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.showSlate = false;   // director's view: burn shot data into frame

    // Offscreen buffers for crossfades.
    this.bufA = document.createElement('canvas');
    this.bufB = document.createElement('canvas');
    [this.bufA, this.bufB].forEach((c) => { c.width = width; c.height = height; });
  }

  /** Draw one shot's picture (no overlays) into the given context. */
  drawShot(ctx, shot, time) {
    const t = Math.max(0, time - shot.start);
    const p = I.clamp01(t / shot.dur);
    const pal = I.PALETTES[shot.palette] || I.PALETTES.night;
    const scene = SCENES[shot.scene];

    ctx.save();
    ctx.fillStyle = pal.bg[0];
    ctx.fillRect(0, 0, this.W, this.H);

    // Camera. cam = [x0,y0,z0, x1,y1,z1] with x,y as the focal point in 0..1.
    //
    // The focal point is clamped to whatever the zoom can actually support.
    // At zoom z the visible width is 1/z, so the centre cannot travel closer
    // than 1/(2z) to either edge without panning off the drawn area and
    // exposing bare canvas. Rather than trust every shot in the screenplay to
    // respect that, enforce it here — a slightly shortened pan is invisible,
    // a hard seam down the frame is not.
    const cam = shot.cam;
    if (cam) {
      const k = I.easeInOut(p);
      const cz = Math.max(1, I.lerp(cam[2], cam[5], k));
      const half = 1 / (2 * cz);
      const cx = Math.min(1 - half, Math.max(half, I.lerp(cam[0], cam[3], k)));
      const cy = Math.min(1 - half, Math.max(half, I.lerp(cam[1], cam[4], k)));
      ctx.translate(this.W / 2, this.H / 2);
      ctx.scale(cz, cz);
      ctx.translate(-cx * this.W, -cy * this.H);
    }

    if (scene) scene(ctx, this.W, this.H, pal, t, p, shot);
    ctx.restore();
  }

  render(time) {
    const { ctx, W, H } = this;
    const clamped = Math.max(0, Math.min(RUNTIME - 0.001, time));
    const idx = TIMELINE.findIndex((s) => clamped >= s.start && clamped < s.end);
    const shot = TIMELINE[idx < 0 ? TIMELINE.length - 1 : idx];
    const prev = TIMELINE[Math.max(0, (idx < 0 ? TIMELINE.length - 1 : idx) - 1)];
    const local = clamped - shot.start;

    const dissolving = shot.trans === 'dissolve' && local < TRANS && prev !== shot;

    if (dissolving) {
      // Hold the outgoing shot on its final frame and fade the new one over it.
      const a = this.bufA.getContext('2d');
      const b = this.bufB.getContext('2d');
      this.drawShot(a, prev, prev.end - 0.001);
      this.drawShot(b, shot, clamped);
      ctx.drawImage(this.bufA, 0, 0);
      ctx.save();
      ctx.globalAlpha = I.easeInOut(local / TRANS);
      ctx.drawImage(this.bufB, 0, 0);
      ctx.restore();
    } else {
      this.drawShot(ctx, shot, clamped);
    }

    this.overlays(shot, local, clamped);
    return shot;
  }

  overlays(shot, local, time) {
    const { ctx, W, H } = this;

    // Letterbox — commits it to a frame ratio and hides scene edges.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H * BAR);
    ctx.fillRect(0, H * (1 - BAR), W, H * BAR);

    this.cutIn(shot, local);
    this.captions(shot, local);
    if (this.showSlate) this.slate(shot, local, time);

    // Fade through black on 'fade' shots, plus head and tail of the film.
    let dark = 0;
    if (shot.trans === 'fade') {
      dark = Math.max(dark, 1 - I.clamp01(local / TRANS));
      const tail = shot.end - (time);
      if (tail < TRANS) dark = Math.max(dark, 1 - I.clamp01(tail / TRANS));
    }
    if (time < 1.2) dark = Math.max(dark, 1 - I.clamp01(time / 1.2));
    if (RUNTIME - time < 2.0) dark = Math.max(dark, 1 - I.clamp01((RUNTIME - time) / 2.0));
    if (dark > 0.001) {
      ctx.fillStyle = `rgba(0,0,0,${dark})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /**
   * Portrait cut-in for a line of dialogue.
   *
   * Rides over the live scene in the left third rather than replacing it, so
   * the shot keeps playing behind the speaker's face. Tinted into the shot's
   * own palette — a paper-white portrait dropped onto a night river would read
   * as a sticker.
   */
  cutIn(shot, local) {
    if (!shot.portrait || shot.scene === 'characterPlate') return;
    if (!P.has(shot.portrait)) return;

    const fade = Math.min(
      I.clamp01((local - 0.35) / 0.7),
      I.clamp01((shot.dur - local - 0.4) / 0.7),
    );
    if (fade <= 0) return;

    const { ctx, W, H } = this;
    const pal = I.PALETTES[shot.palette] || I.PALETTES.night;

    // Roughly the aspect of the head crops, so the fit doesn't shave the chin
    // and beard off — the first version cropped Cao Cao at the jaw.
    const bw = W * 0.215;
    const bh = H * 0.50;
    const bx = W * 0.055;
    const by = H * 0.5 - bh / 2;
    const rise = (1 - fade) * 18;
    const cx = bx + bw / 2;
    const cy = by + bh / 2 + rise;

    // A wash of paper behind the face rather than an inverted portrait.
    // Rendering the woodblock in white ink on the night sky reads as a photo
    // negative; a paper ground keeps it dark-on-light the way it was cut.
    ctx.save();
    ctx.globalAlpha = fade * 0.9;
    I.bleed(ctx, cx, cy, bh * 0.62, 'rgba(233,226,208,1)', 0.88);
    I.bleed(ctx, cx, cy, bh * 0.44, 'rgba(240,234,219,1)', 0.9);
    ctx.restore();

    P.drawFace(ctx, shot.portrait, [bx, by + rise, bw, bh], {
      inkColor: '#171a1e',
      paperColor: '#e9e2d0',
      alpha: fade * 0.97,
    });
  }

  /** Dialogue and narration. Fades in and out so nothing pops. */
  captions(shot, local) {
    const { ctx, W, H } = this;
    const hasLine = Boolean(shot.line);
    const hasSub = Boolean(shot.sub);
    if (!hasLine && !hasSub) return;

    const fade = Math.min(
      I.clamp01((local - 0.45) / 0.6),
      I.clamp01((shot.dur - local - 0.3) / 0.6),
    );
    if (fade <= 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = fade;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 14;

    let y = H * (1 - BAR) - 34;

    if (hasSub) {
      ctx.fillStyle = 'rgba(244,240,232,0.96)';
      ctx.font = `${hasLine ? 22 : 25}px ${LATIN}`;
      ctx.fillText(shot.sub, W / 2, y);
      y -= 40;
    }
    if (hasLine) {
      ctx.fillStyle = 'rgba(255,250,240,0.99)';
      ctx.font = `31px ${CJK}`;
      ctx.fillText(shot.line, W / 2, y);
      if (shot.speaker) {
        ctx.globalAlpha = fade * 0.62;
        ctx.fillStyle = 'rgba(230,205,160,0.95)';
        ctx.font = `15px ${LATIN}`;
        ctx.letterSpacing = '3px';
        ctx.fillText(shot.speaker, W / 2, y - 40);
        ctx.letterSpacing = '0px';
      }
    }
    ctx.restore();
  }

  /** Director's view — the shot data burned into the frame, as on a real animatic. */
  slate(shot, local, time) {
    const { ctx, W, H } = this;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, H * BAR, W, 54);
    ctx.fillStyle = 'rgba(240,236,228,0.95)';
    ctx.font = `13px ui-monospace, "SF Mono", Menlo, monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`SHOT ${String(shot.id).padStart(3, '0')}`, 22, H * BAR + 22);
    ctx.fillText(shot.slug || '', 110, H * BAR + 22);
    ctx.globalAlpha = 0.62;
    const cam = shot.cam ? (shot.cam[5] > shot.cam[2] ? 'PUSH IN' : shot.cam[5] < shot.cam[2] ? 'PULL OUT' : (shot.cam[3] !== shot.cam[0] ? 'PAN' : 'STATIC')) : 'STATIC';
    ctx.fillText(`${cam} · ${shot.dur.toFixed(1)}s · ${shot.palette.toUpperCase()}`, 22, H * BAR + 42);
    ctx.textAlign = 'right';
    ctx.fillText(`${local.toFixed(1)} / ${shot.dur.toFixed(1)}`, W - 22, H * BAR + 22);
    ctx.fillText(fmt(time), W - 22, H * BAR + 42);
    ctx.restore();
  }
}

export function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
