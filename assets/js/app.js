import { Engine, fmt } from './engine.js';
import { TIMELINE, RUNTIME, META } from './film.js';
import { Score } from './audio.js';
import { Recorder, download, isSupported, humanSize, pickMimeType } from './export.js';
import * as P from './portraits.js';

const $ = (s) => document.querySelector(s);

const engine = new Engine($('#stage'), { width: 1280, height: 720 });
const score = new Score();

const state = {
  time: 0,
  playing: false,
  lastTick: 0,
  recording: false,
  shotId: null,
};

/* ------------------------------- playback -------------------------------- */

function frame(now) {
  if (state.playing) {
    const dt = Math.min(0.1, (now - state.lastTick) / 1000);
    state.lastTick = now;
    state.time += dt;
    if (state.time >= RUNTIME) {
      state.time = RUNTIME - 0.001;
      draw();
      stop();
      if (state.recording) finishRecording();
      return;
    }
  }
  draw();
  requestAnimationFrame(frame);
}

function draw() {
  const shot = engine.render(state.time);
  if (shot.id !== state.shotId) {
    state.shotId = shot.id;
    score.setCue(shot.cue || 'drone', shot.dur);
    markShot(shot.id);
    $('#slug').textContent = shot.slug || '';
    $('#action').textContent = shot.action || '';
  }
  $('#clock').textContent = `${fmt(state.time)} / ${fmt(RUNTIME)}`;
  $('#scrub').value = String((state.time / RUNTIME) * 1000);
  $('#progress').style.setProperty('--p', `${(state.time / RUNTIME) * 100}%`);
}

async function play() {
  await score.ensure();
  score.reset();
  state.shotId = null;         // force the cue to re-fire for the current shot
  state.playing = true;
  state.lastTick = performance.now();
  $('#play').textContent = '❚❚';
  $('#play').setAttribute('aria-label', 'Pause');
}

function stop() {
  state.playing = false;
  score.reset();
  $('#play').textContent = '▶';
  $('#play').setAttribute('aria-label', 'Play');
}

function seek(t) {
  state.time = Math.max(0, Math.min(RUNTIME - 0.001, t));
  state.shotId = null;
  draw();
}

/* ------------------------------- shot list -------------------------------- */

function buildShotList() {
  $('#shotlist').innerHTML = TIMELINE.map((s) => `
    <li class="shot" data-id="${s.id}" data-start="${s.start}">
      <span class="shot-n">${String(s.id).padStart(2, '0')}</span>
      <span class="shot-body">
        <span class="shot-slug">${esc(s.slug || '')}</span>
        <span class="shot-action">${esc(s.action || '')}</span>
        ${s.line ? `<span class="shot-line">${esc(s.speaker || '')} — ${esc(s.line)}</span>` : ''}
      </span>
      <span class="shot-dur">${s.dur.toFixed(1)}s</span>
    </li>`).join('');

  $('#shotlist').querySelectorAll('.shot').forEach((el) => {
    el.addEventListener('click', () => seek(Number(el.dataset.start) + 0.01));
  });
}

function markShot(id) {
  const list = $('#shotlist');
  list.querySelectorAll('.shot.is-on').forEach((e) => e.classList.remove('is-on'));
  const el = list.querySelector(`.shot[data-id="${id}"]`);
  if (el) {
    el.classList.add('is-on');
    const r = el.getBoundingClientRect();
    const p = list.getBoundingClientRect();
    if (r.top < p.top || r.bottom > p.bottom) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* -------------------------------- export ---------------------------------- */

let recorder = null;

async function startRecording() {
  if (!isSupported()) {
    setStatus('This browser cannot record canvas video. Chrome or Edge will work.', true);
    return;
  }
  await score.ensure();
  seek(0);
  recorder = new Recorder($('#stage'), { fps: 30, audioTrack: score.track });
  let mime;
  try {
    mime = recorder.start();
  } catch (err) {
    setStatus(err.message, true);
    return;
  }
  state.recording = true;
  document.body.classList.add('is-recording');
  $('#export').disabled = true;
  setStatus(`Recording ${mime.split(';')[0]} in real time — ${fmt(RUNTIME)} to go. Leave this tab visible.`);
  await play();
}

async function finishRecording() {
  if (!recorder) return;
  try {
    const blob = await recorder.stop();
    const name = `red-cliffs-animatic-${new Date().toISOString().slice(0, 10)}.webm`;
    download(blob, name);
    setStatus(`Done — ${name} (${humanSize(blob.size)}) saved to your downloads.`);
  } catch (err) {
    setStatus(`Recording failed: ${err.message}`, true);
  } finally {
    state.recording = false;
    document.body.classList.remove('is-recording');
    $('#export').disabled = false;
    recorder = null;
  }
}

function setStatus(msg, isError = false) {
  const el = $('#status');
  el.textContent = msg;
  el.classList.toggle('is-error', isError);
}

/* ---------------------------------- cast ---------------------------------- */

function buildCastList() {
  const keys = Object.keys(P.CAST);
  $('#cast-list').innerHTML = keys.map((k) => {
    const c = P.CAST[k];
    const loaded = P.has(k);
    const src = loaded ? P.info(k).source : '未载入';
    return `
      <li class="cast-row" data-key="${k}">
        <span class="cast-name">${esc(c.zh)}<span class="dim"> ${esc(c.en)}</span></span>
        <span class="cast-src ${loaded ? '' : 'is-missing'}">${esc(src)}</span>
        <label class="cast-swap">
          换图<input type="file" accept="image/*" data-key="${k}" hidden>
        </label>
        <button class="cast-goto" data-key="${k}">跳转</button>
      </li>`;
  }).join('');

  $('#cast-count').textContent = `— ${keys.filter((k) => P.has(k)).length}/${keys.length}`;

  $('#cast-list').querySelectorAll('input[type=file]').forEach((inp) => {
    inp.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const key = e.target.dataset.key;
      try {
        await P.setOverride(key, file);
        buildCastList();
        draw();
        setStatus(`已替换 ${P.CAST[key].zh} 的人物图（仅本机，不会上传）。`);
      } catch (err) {
        setStatus(`图片载入失败：${err.message}`, true);
      }
    });
  });

  $('#cast-list').querySelectorAll('.cast-goto').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const plate = TIMELINE.find((s) => s.scene === 'characterPlate' && s.portrait === key);
      if (plate) { stop(); seek(plate.start + 1.2); }
    });
  });
}

/* ------------------------------ frame grabber ------------------------------ */

/**
 * Pull a portrait straight out of a video file.
 *
 * Better than hunting for stills: full resolution, you choose the exact
 * expression, and nothing leaves the machine. The file is read through a blob
 * URL, so it is same-origin and the frame canvas stays untainted — a
 * cross-origin frame would kill the film's own export.
 */
const grab = { url: null, video: null };

function openGrabber(file) {
  const v = $('#grab-video');
  if (grab.url) URL.revokeObjectURL(grab.url);
  grab.url = URL.createObjectURL(file);
  v.src = grab.url;
  grab.video = v;

  $('#grab-who').innerHTML = Object.entries(P.CAST)
    .map(([k, c]) => `<option value="${k}">${esc(c.zh.replace(/\s/g, ''))} · ${esc(c.en)}</option>`).join('');
  $('#grab-status').textContent = '';
  $('#grabber').showModal();

  v.onloadedmetadata = () => {
    $('#grab-scrub').value = '0';
    $('#grab-clock').textContent = `${fmt(0)} / ${fmt(v.duration || 0)}`;
  };
  v.ontimeupdate = () => {
    if (!v.duration) return;
    $('#grab-scrub').value = String((v.currentTime / v.duration) * 1000);
    $('#grab-clock').textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
  };
}

function grabFrame() {
  const v = grab.video;
  if (!v || !v.videoWidth) return null;
  const c = document.createElement('canvas');
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0);
  return c;
}

function bindGrabber() {
  $('#grab-file').addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) openGrabber(f);
    e.target.value = '';
  });

  $('#grab-play').addEventListener('click', () => {
    const v = grab.video;
    if (!v) return;
    if (v.paused) { v.play(); $('#grab-play').textContent = '❚❚'; }
    else { v.pause(); $('#grab-play').textContent = '▶'; }
  });

  $('#grab-scrub').addEventListener('input', (e) => {
    const v = grab.video;
    if (!v?.duration) return;
    v.pause();
    $('#grab-play').textContent = '▶';
    v.currentTime = (Number(e.target.value) / 1000) * v.duration;
  });

  // Roughly a frame at 25fps — enough to land on the expression you want.
  $('#grab-back').addEventListener('click', () => { if (grab.video) { grab.video.pause(); grab.video.currentTime = Math.max(0, grab.video.currentTime - 0.04); } });
  $('#grab-fwd').addEventListener('click', () => { if (grab.video) { grab.video.pause(); grab.video.currentTime += 0.04; } });

  $('#grab-take').addEventListener('click', async () => {
    const c = grabFrame();
    if (!c) { $('#grab-status').textContent = '这一帧还没解码出来，稍等一下再试。'; return; }
    const key = $('#grab-who').value;
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.94));
    await P.setOverride(key, new File([blob], `${key}.jpg`, { type: 'image/jpeg' }));
    buildCastList();
    draw();
    $('#grab-status').textContent = `已用作 ${P.CAST[key].zh.replace(/\s/g, '')} 的人物图（${c.width}×${c.height}）。`;
    setStatus(`已从视频截取 ${P.CAST[key].zh.replace(/\s/g, '')} 的人物图 — 仅本机。`);
  });

  $('#grab-save').addEventListener('click', async () => {
    const c = grabFrame();
    if (!c) return;
    const key = $('#grab-who').value;
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.94));
    download(blob, `${key}.jpg`);
    $('#grab-status').textContent = `已下载 ${key}.jpg — 放进 characters/ 目录即可长期生效。`;
  });

  $('#grab-close').addEventListener('click', () => {
    grab.video?.pause();
    $('#grab-play').textContent = '▶';
    $('#grabber').close();
  });

  // Dropping an image anywhere on the page assigns it to the character whose
  // plate is currently on screen — the fastest possible swap.
  document.addEventListener('dragover', (e) => { e.preventDefault(); });
  document.addEventListener('drop', async (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    e.preventDefault();
    if (f.type.startsWith('video/')) { openGrabber(f); return; }
    if (!f.type.startsWith('image/')) return;
    const shot = TIMELINE.find((s) => s.id === state.shotId);
    const key = shot?.portrait || Object.keys(P.CAST)[0];
    await P.setOverride(key, f);
    buildCastList();
    draw();
    setStatus(`已替换 ${P.CAST[key].zh.replace(/\s/g, '')} 的人物图（拖放）— 仅本机。`);
  });
}

/* --------------------------------- wiring --------------------------------- */

function bind() {
  $('#play').addEventListener('click', () => (state.playing ? stop() : play()));
  $('#restart').addEventListener('click', () => { seek(0); play(); });
  $('#export').addEventListener('click', startRecording);

  $('#scrub').addEventListener('input', (e) => {
    if (state.recording) return;
    stop();
    seek((Number(e.target.value) / 1000) * RUNTIME);
  });

  $('#slate').addEventListener('change', (e) => { engine.showSlate = e.target.checked; draw(); });
  $('#sound').addEventListener('change', (e) => score.setEnabled(e.target.checked));

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); state.playing ? stop() : play(); }
    if (e.code === 'ArrowRight') { stop(); seek(state.time + 5); }
    if (e.code === 'ArrowLeft') { stop(); seek(state.time - 5); }
  });
}

/* ---------------------------------- init ---------------------------------- */

async function init() {
  $('#film-title').textContent = META.title;
  $('#film-title-zh').textContent = META.titleZh;
  $('#film-source').textContent = META.source;
  $('#runtime').textContent = fmt(RUNTIME);
  $('#shot-count').textContent = String(TIMELINE.length);

  buildShotList();
  bind();
  bindGrabber();
  draw();

  // Portraits load asynchronously; the film is watchable before they arrive
  // and simply gains the faces once they do.
  try {
    await Promise.all([P.loadCast(), P.loadPlates()]);
  } catch { /* plates fall back to name-only */ }
  buildCastList();
  draw();

  if (!isSupported()) {
    $('#export').disabled = true;
    $('#export').title = 'Canvas recording unavailable in this browser';
    setStatus('Playback works everywhere. Video export needs Chrome or Edge.', true);
  } else {
    setStatus(`Press play. Export writes a real .webm — it records in real time (${fmt(RUNTIME)}).`);
  }

  requestAnimationFrame(frame);
}

init();
