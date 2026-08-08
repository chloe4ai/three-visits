/**
 * audio.js — a procedural score, synthesised in the browser.
 *
 * There are no audio files here. Everything is generated with Web Audio:
 * a plucked-string voice standing in for guqin, taiko-ish drums, a bowed
 * drone, wind and fire noise. It is written to a D minor pentatonic so the
 * cues sit together without needing an arranger.
 *
 * The output is split to the speakers *and* to a MediaStreamDestination, which
 * is what lets the exporter mux real audio into the recorded video.
 */

const PENT = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0];

export class Score {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.streamDest = null;
    this.ambience = null;
    this.enabled = true;
    this.cue = null;
    this.timers = [];
  }

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;

    // Gentle bus compression so drums don't blow past the fire noise.
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);

    this.streamDest = this.ctx.createMediaStreamDestination();
    comp.connect(this.streamDest);

    this.buildAmbience();
  }

  /** The river, always there under everything. */
  buildAmbience() {
    const ctx = this.ctx;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(6);
    noise.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 90;

    const g = ctx.createGain();
    g.gain.value = 0.05;

    noise.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master);
    noise.start();
    this.ambience = { g, lp };
  }

  noiseBuffer(seconds = 2) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ------------------------------ voices ------------------------------- */

  /** Plucked string. Noise transient into a decaying harmonic stack. */
  pluck(freq, when = 0, { gain = 0.22, dur = 3.2 } = {}) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const out = ctx.createGain();
    out.gain.value = gain;
    out.connect(this.master);

    [1, 2, 3.01, 4.02].forEach((mult, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(freq * mult, t0);
      // Strings drop slightly in pitch as the initial tension releases.
      o.frequency.exponentialRampToValueAtTime(freq * mult * 0.995, t0 + dur);
      const g = ctx.createGain();
      const peak = gain * (i === 0 ? 1 : 0.28 / i);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * (1 - i * 0.16));
      o.connect(g); g.connect(out);
      o.start(t0); o.stop(t0 + dur + 0.1);
    });

    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer(0.12);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(gain * 0.5, t0);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = freq * 3;
    n.connect(nf); nf.connect(ng); ng.connect(out);
    n.start(t0); n.stop(t0 + 0.15);
  }

  /** Taiko. Pitched thump plus a skin transient. */
  drum(when = 0, { gain = 0.5, freq = 68 } = {}) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 2.2, t0);
    o.frequency.exponentialRampToValueAtTime(freq, t0 + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + 0.8);

    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer(0.2);
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 1400;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(gain * 0.5, t0);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    n.connect(nf); nf.connect(ng); ng.connect(this.master);
    n.start(t0); n.stop(t0 + 0.2);
  }

  /** Bowed drone. Long, detuned, unresolved. */
  drone(freq = 73.42, when = 0, { gain = 0.13, dur = 14 } = {}) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 2.5);
    g.gain.setValueAtTime(gain, t0 + dur - 3);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340;
    g.connect(lp); lp.connect(this.master);
    [-4, 0, 5].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = cents;
      o.connect(g);
      o.start(t0); o.stop(t0 + dur + 0.2);
    });
    return { stop: () => { try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6); } catch {} } };
  }

  /** Struck gong — inharmonic partials, very long tail. */
  gong(when = 0, { gain = 0.4 } = {}) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const out = ctx.createGain();
    out.gain.value = gain;
    out.connect(this.master);
    [1, 1.51, 2.34, 3.16, 4.71].forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 92 * m;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gain * (0.9 / (i + 1)), t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 7 - i * 0.8);
      o.connect(g); g.connect(out);
      o.start(t0); o.stop(t0 + 7.2);
    });
  }

  /** Wind or fire, depending on the filter. */
  noiseSwell(when = 0, { gain = 0.2, dur = 4, from = 300, to = 2600, q = 1 } = {}) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer(Math.max(2, dur));
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(to, t0 + dur * 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    n.connect(f); f.connect(g); g.connect(this.master);
    n.start(t0); n.stop(t0 + dur + 0.1);
  }

  /* ------------------------------- cues -------------------------------- */

  clearTimers() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }

  /** Called when playback enters a new shot. */
  setCue(cue, shotDur = 6) {
    if (!this.ctx || !this.enabled || cue === this.cue) {
      this.cue = cue;
      return;
    }
    this.cue = cue;
    this.clearTimers();
    if (this.currentDrone) { this.currentDrone.stop(); this.currentDrone = null; }

    const A = this.ambience;
    const set = (freq, g) => {
      if (!A) return;
      A.lp.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.8);
      A.g.gain.setTargetAtTime(g, this.ctx.currentTime, 0.8);
    };

    switch (cue) {
      case 'silence':
        set(300, 0.02);
        break;
      case 'drone':
        set(520, 0.05);
        this.currentDrone = this.drone(73.42, 0, { gain: 0.11, dur: 24 });
        this.later(() => this.pluck(PENT[0], 0, { gain: 0.16 }), 900);
        this.later(() => this.pluck(PENT[2], 0, { gain: 0.13 }), 3600);
        break;
      case 'guqin':
        set(480, 0.045);
        this.currentDrone = this.drone(146.83, 0, { gain: 0.06, dur: 20 });
        [0, 1400, 2500, 4200, 5200].forEach((ms, i) => {
          this.later(() => this.pluck(PENT[[4, 3, 5, 2, 4][i]], 0, { gain: 0.2 }), ms);
        });
        break;
      case 'unease':
        set(600, 0.06);
        this.currentDrone = this.drone(69.3, 0, { gain: 0.13, dur: 20 });  // a semitone down: sour
        this.later(() => this.pluck(PENT[1], 0, { gain: 0.14 }), 1600);
        break;
      case 'strings':
        set(500, 0.04);
        this.currentDrone = this.drone(110, 0, { gain: 0.09, dur: 18 });
        [200, 1800, 3400, 4800].forEach((ms, i) => {
          this.later(() => this.pluck(PENT[[3, 5, 4, 6][i]], 0, { gain: 0.17 }), ms);
        });
        break;
      case 'ritual':
        set(420, 0.04);
        this.currentDrone = this.drone(97.99, 0, { gain: 0.1, dur: 20 });
        [0, 2200, 4400].forEach((ms) => this.later(() => this.drum(0, { gain: 0.34, freq: 58 }), ms));
        this.later(() => this.gong(0, { gain: 0.3 }), 400);
        break;
      case 'hold':
        set(240, 0.02);
        break;
      case 'swell':
        set(1800, 0.10);
        this.noiseSwell(0, { gain: 0.26, dur: 5.5, from: 260, to: 2400, q: 0.7 });
        this.later(() => this.gong(0, { gain: 0.42 }), 1300);
        this.currentDrone = this.drone(146.83, 0, { gain: 0.1, dur: 14 });
        break;
      case 'approach':
        set(900, 0.07);
        this.currentDrone = this.drone(73.42, 0, { gain: 0.12, dur: 16 });
        for (let i = 0; i < 8; i++) this.later(() => this.drum(0, { gain: 0.2 + i * 0.03, freq: 62 }), i * 720);
        break;
      case 'ignite':
        set(2600, 0.14);
        this.noiseSwell(0, { gain: 0.3, dur: 3.4, from: 600, to: 4200, q: 0.6 });
        this.drum(0, { gain: 0.55, freq: 74 });
        this.later(() => this.gong(0, { gain: 0.5 }), 120);
        break;
      case 'impact':
        set(3000, 0.16);
        this.drum(0, { gain: 0.62, freq: 70 });
        this.later(() => this.drum(0, { gain: 0.5, freq: 60 }), 260);
        this.later(() => this.drum(0, { gain: 0.44, freq: 82 }), 470);
        this.noiseSwell(0, { gain: 0.28, dur: 4, from: 900, to: 3800, q: 0.5 });
        break;
      case 'inferno':
        set(3400, 0.18);
        this.currentDrone = this.drone(55, 0, { gain: 0.16, dur: 22 });
        for (let i = 0; i < 10; i++) {
          this.later(() => this.drum(0, { gain: 0.3 + Math.random() * 0.25, freq: 56 + Math.random() * 30 }), i * 620);
        }
        this.noiseSwell(0, { gain: 0.22, dur: 7, from: 1200, to: 3400, q: 0.4 });
        break;
      case 'retreat':
        set(1200, 0.09);
        this.currentDrone = this.drone(65.4, 0, { gain: 0.13, dur: 18 });
        [0, 900, 1900, 3100].forEach((ms) => this.later(() => this.drum(0, { gain: 0.26, freq: 52 }), ms));
        break;
      case 'aftermath':
        set(380, 0.035);
        this.currentDrone = this.drone(87.31, 0, { gain: 0.09, dur: 22 });
        [600, 3000, 5600].forEach((ms, i) => this.later(() => this.pluck(PENT[[2, 4, 1][i]], 0, { gain: 0.17, dur: 5 }), ms));
        break;
      case 'end':
        set(200, 0.02);
        this.gong(0, { gain: 0.45 });
        this.later(() => this.pluck(PENT[0], 0, { gain: 0.2, dur: 6 }), 2600);
        break;
      default:
        set(500, 0.04);
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.1);
  }

  reset() {
    this.clearTimers();
    if (this.currentDrone) { this.currentDrone.stop(); this.currentDrone = null; }
    this.cue = null;
  }

  /** The audio track the recorder muxes into the video file. */
  get track() {
    return this.streamDest ? this.streamDest.stream.getAudioTracks()[0] : null;
  }
}
