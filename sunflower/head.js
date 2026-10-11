// The seed head: every seed drawn on a paper disc, or grown one at a time with the arm
// that turns between them.
import { HONEYCOMB, place } from './sunflower.js';

const MARGIN = 10; // CSS px between the disc and the canvas edge
const SLOW_SEEDS = 12; // seeds that go down slowly enough to follow the arm
const SLOW_MS = 260;
const FAST_MS = 4200; // for the rest, however many there are

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const readColors = () => ({ paper: token('--paper'), ink: token('--ink'), soft: token('--ink-soft'), red: token('--red') });

export function createHead({ canvas }) {
  const ctx = canvas.getContext('2d');
  let colors = readColors();
  let turn = 0;
  let count = 0;
  let red = false;
  let shown = 0; // seeds drawn so far; count when not growing
  let seeds = { xs: [], ys: [] };
  let growId = 0;

  function draw() {
    const w = canvas.clientWidth;
    const dpr = canvas.width / w || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, w);
    const c = w / 2;
    const radius = c - MARGIN;
    ctx.fillStyle = colors.paper;
    ctx.beginPath();
    ctx.arc(c, c, radius + MARGIN / 2, 0, Math.PI * 2);
    ctx.fill();
    if (!count) return;

    // Growing, the view stays zoomed on the seeds so far, so the first few are big enough
    // to follow and the head pulls back as it fills.
    const unit = (radius * 0.97) / Math.sqrt(shown < count ? Math.max(shown + 1, SLOW_SEEDS) : count);
    const dot = Math.max(0.8, Math.min(6, 0.33 * HONEYCOMB * unit));
    ctx.fillStyle = red ? colors.red : colors.ink;
    ctx.beginPath();
    for (let n = 1; n <= shown; n++) {
      const x = c + seeds.xs[n] * unit;
      const y = c - seeds.ys[n] * unit;
      ctx.moveTo(x + dot, y);
      ctx.arc(x, y, dot, 0, Math.PI * 2);
    }
    ctx.fill();

    if (shown < count) {
      // The arm, pointing where the next seed goes.
      const next = shown + 1;
      ctx.strokeStyle = colors.soft;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(c + seeds.xs[next] * unit, c - seeds.ys[next] * unit);
      ctx.stroke();
    }
  }

  function set(newTurn, newCount, { golden = false, placed = place(newTurn, newCount) } = {}) {
    growId++;
    turn = newTurn;
    count = newCount;
    red = golden;
    seeds = placed;
    shown = count;
    draw();
  }

  // Lays the seeds down one at a time, slowly at first. Resolves false if interrupted.
  function grow() {
    const id = ++growId;
    shown = 0;
    draw();
    return new Promise(resolve => {
      const start = performance.now();
      const slow = SLOW_SEEDS * SLOW_MS;
      const frame = now => {
        if (id !== growId) return resolve(false);
        const t = now - start;
        const target = t < slow ? Math.floor(t / SLOW_MS) : SLOW_SEEDS + ((t - slow) / FAST_MS) ** 2 * (count - SLOW_SEEDS);
        shown = Math.min(count, Math.max(shown, Math.floor(target)));
        draw();
        if (shown < count) requestAnimationFrame(frame);
        else resolve(true);
      };
      requestAnimationFrame(frame);
    });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    canvas.width = canvas.height = Math.round(w * ratio);
    draw();
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    colors = readColors();
    draw();
  });
  new ResizeObserver(resize).observe(canvas);

  return {
    set,
    grow,
    get growing() {
      return shown < count;
    },
  };
}
