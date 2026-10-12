// The first thousand: one square per start, filled in once its sequence reaches 0 or a
// loop, as if all thousand were walking together one step at a time.
import { SURVEY, binOf } from './aliquot.js';

const COLUMNS = 40;
const ROWS = SURVEY / COLUMNS;
const DECADE_MS = 1000; // the shared step count grows tenfold each second

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const readColors = () => ({
  paper: token('--paper'),
  ink: token('--ink'),
  soft: token('--ink-soft'),
  red: token('--red'),
  ramp: [1, 2, 3, 4, 5, 6].map(i => token(`--r${i}`)),
});

// The step at which a start is settled: when it reaches 0, or first reaches its loop.
const settledAt = r => (r.end === 'zero' ? r.steps : r.end === 'loop' ? r.loopStart : Infinity);

export function createGrid({ canvas, onHover, onPick }) {
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let colors = readColors();
  let results = null;
  let step = -1; // how far the walk has got; Infinity once it's over
  let hovered = null;
  let runId = 0;

  const size = () => canvas.clientWidth / COLUMNS;

  function draw() {
    const w = canvas.clientWidth;
    const s = size();
    const dpr = canvas.width / w || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, w, s * ROWS);
    const gap = s > 8 ? 1.5 : 0.75;
    for (let i = 0; i < SURVEY; i++) {
      const x = (i % COLUMNS) * s + gap / 2;
      const y = Math.floor(i / COLUMNS) * s + gap / 2;
      const r = results?.[i];
      const done = r?.end && settledAt(r) <= step;
      ctx.globalAlpha = done ? 1 : 0.07;
      ctx.fillStyle = !done ? colors.ink : r.end === 'zero' ? colors.ramp[binOf(r.steps)] : colors.ink;
      ctx.fillRect(x, y, s - gap, s - gap);
      ctx.globalAlpha = 1;
      if (!r || r.end || step !== Infinity) continue;
      // Past 25 digits: the twelve nobody has finished get a red ring, 840 a stripe.
      if (r.joins) {
        ctx.strokeStyle = colors.red;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, s - gap - 2, s - gap - 2);
      } else {
        ctx.strokeStyle = colors.soft;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + s - gap - 2);
        ctx.lineTo(x + s - gap - 2, y + 2);
        ctx.stroke();
      }
    }
    if (hovered !== null) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect((hovered % COLUMNS) * s + 0.75, Math.floor(hovered / COLUMNS) * s + 0.75, s - 1.5, s - 1.5);
    }
  }

  function cellAt(event) {
    const box = canvas.getBoundingClientRect();
    const s = size();
    const col = Math.floor((event.clientX - box.left) / s);
    const row = Math.floor((event.clientY - box.top) / s);
    return col >= 0 && col < COLUMNS && row >= 0 && row < ROWS ? row * COLUMNS + col : null;
  }

  function hover(i) {
    if (i === hovered) return;
    hovered = i;
    draw();
    const r = results?.[i];
    onHover(i === null ? null : i + 1, r && (step === Infinity || (r.end && settledAt(r) <= step)) ? r : null);
  }

  canvas.addEventListener('pointermove', event => event.pointerType === 'mouse' && hover(cellAt(event)));
  canvas.addEventListener('pointerleave', event => event.pointerType === 'mouse' && hover(null));
  canvas.addEventListener('click', event => {
    const i = cellAt(event);
    if (i === null) return;
    hover(i);
    onPick(i + 1);
  });

  // Fills the squares in as the shared step count grows; onProgress(step, settled) each frame.
  function run(all, onProgress) {
    const id = ++runId;
    results = all;
    const last = Math.max(...all.map(settledAt).filter(Number.isFinite));
    const count = () => all.filter(r => settledAt(r) <= step).length;
    if (reducedMotion.matches) {
      step = Infinity;
      draw();
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      const started = performance.now();
      const frame = now => {
        if (id !== runId) return resolve(false);
        step = Math.floor(10 ** ((now - started) / DECADE_MS)) - 1;
        if (step >= last) step = Infinity;
        draw();
        onProgress(Math.min(step, last), count());
        if (step === Infinity) return resolve(true);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    draw();
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    colors = readColors();
    draw();
  });
  new ResizeObserver(resize).observe(canvas);

  return {
    run,
    get running() {
      return step !== Infinity && step >= 0;
    },
  };
}
