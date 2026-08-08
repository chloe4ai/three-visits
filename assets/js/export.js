/**
 * export.js — writes the film to an actual video file.
 *
 * canvas.captureStream() + the synthesised audio track, muxed by MediaRecorder
 * into WebM. The result is a real .webm you can play anywhere, not a
 * screenshot sequence.
 *
 * Honest limitation: MediaRecorder timestamps frames against the wall clock,
 * so capture happens in real time. Exporting a three-and-a-half minute film
 * takes three and a half minutes. Pushing frames faster (captureStream(0) plus
 * requestFrame) records them with compressed timestamps and yields a
 * sped-up file, so it is not a shortcut — it is a different, broken video.
 */

const CANDIDATE_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return CANDIDATE_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || null;
}

export function isSupported() {
  return Boolean(
    typeof MediaRecorder !== 'undefined' &&
    HTMLCanvasElement.prototype.captureStream &&
    pickMimeType(),
  );
}

export class Recorder {
  // 4.5 Mbps. Ink-wash frames are mostly large flat gradients, which VP9
  // compresses very efficiently — 8 Mbps produced a 110 MB file for three and
  // a half minutes with no visible benefit over this.
  constructor(canvas, { fps = 30, audioTrack = null, bitrate = 4_500_000 } = {}) {
    this.canvas = canvas;
    this.fps = fps;
    this.audioTrack = audioTrack;
    this.bitrate = bitrate;
    this.chunks = [];
    this.recorder = null;
    this.stream = null;
  }

  start() {
    const mime = pickMimeType();
    if (!mime) throw new Error('This browser cannot record WebM from a canvas.');

    this.stream = this.canvas.captureStream(this.fps);
    if (this.audioTrack) {
      try { this.stream.addTrack(this.audioTrack); } catch { /* video-only fallback */ }
    }

    const opts = { mimeType: mime, videoBitsPerSecond: this.bitrate };
    if (this.audioTrack) opts.audioBitsPerSecond = 128_000;

    this.recorder = new MediaRecorder(this.stream, opts);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
    this.recorder.start(1000);
    return mime;
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (!this.recorder) return reject(new Error('Not recording.'));
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        // Only stop the video track we created; the audio track belongs to the
        // score and must survive for the next playthrough.
        this.stream.getVideoTracks().forEach((t) => t.stop());
        resolve(blob);
      };
      this.recorder.onerror = (e) => reject(e.error || new Error('Recording failed.'));
      try { this.recorder.stop(); } catch (err) { reject(err); }
    });
  }

  get state() { return this.recorder ? this.recorder.state : 'inactive'; }
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const humanSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};
