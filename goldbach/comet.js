// Goldbach's comet: every even number up to 100,000, plotted by how many ways it is a sum
// of two primes. The counting runs live, left to right, when asked.
import { LIMIT, countPairs } from './goldbach.js';

const Y_MAX = 2200; // a little over the most ways below 100,000
const Y_TICKS = [0, 500, 1000, 1500, 2000];
const X_TICKS = [0, 25000, 50000, 75000, 100000];
const MARGIN = { left: 44, right: 12, top: 12, bottom: 26 }; // CSS px
const RUN_MS = 3200;
const BUDGET_MS = 10;
const DOT_ALPHA = 0.6;
const REACH = 14; // CSS px within which the pointer picks a dot

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const readColors = () => ({
  paper: token('--paper'),
  ink: token('--ink'),
  soft: token('--ink-soft'),
  three: token('--r6'), // multiples of 3 sit in the upper band
  rest: token('--r2'),
  font: token('--print'),
});

export function createComet({ canvas, isPrime, primes, onHover, onPick }) {
  const ctx = canvas.getContext('2d');
  const dots = document.createElement('canvas');
  const dctx = dots.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let colors = readColors();
  const counts = new Uint16Array(LIMIT + 1);
  let reached = 2; // every even number up to here has been counted
  let runId = 0;
  let marked = null;
  let hovered = null;

  const size = () => [canvas.clientWidth, canvas.clientHeight];
  const plot = () => {
    const [w, h] = size();
    return { w: w - MARGIN.left - MARGIN.right, h: h - MARGIN.top - MARGIN.bottom };
  };
  const xOf = n => MARGIN.left + (n / LIMIT) * plot().w;
  const yOf = c => MARGIN.top + plot().h * (1 - c / Y_MAX);
  const dpr = () => canvas.width / canvas.clientWidth || 1;
  const count = n => (n <= reached ? counts[n] : countPairs(n, primes, isPrime));

  function dot(n) {
    const s = Math.max(1, 1.1 * dpr());
    dctx.fillStyle = n % 3 === 0 ? colors.three : colors.rest;
    dctx.fillRect(xOf(n) * dpr() - s / 2, yOf(counts[n]) * dpr() - s / 2, s, s);
  }

  function redrawDots() {
    dctx.clearRect(0, 0, dots.width, dots.height);
    dctx.globalAlpha = DOT_ALPHA;
    for (let n = 4; n <= reached; n += 2) dot(n);
  }

  function axes() {
    const [w] = size();
    const { h } = plot();
    ctx.font = `400 11px ${colors.font}`;
    ctx.fillStyle = colors.soft;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (const c of Y_TICKS) {
      const y = Math.round(yOf(c)) + 0.5;
      ctx.globalAlpha = 0.16; // the same strength as --rule
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(w - MARGIN.right, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(c.toLocaleString('en'), MARGIN.left - 6, y);
    }
    ctx.textBaseline = 'top';
    // On a narrow comet the quarter marks would crowd the ends.
    for (const n of X_TICKS.filter(n => plot().w >= 380 || n % 50000 === 0)) {
      ctx.textAlign = n === 0 ? 'left' : n === LIMIT ? 'right' : 'center';
      ctx.fillText(n.toLocaleString('en'), xOf(n), MARGIN.top + h + 8);
    }
  }

  function ring(n, radius, fill) {
    const x = xOf(n);
    const y = yOf(count(n));
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = colors.paper;
    if (fill) {
      ctx.fillStyle = colors.ink;
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = colors.ink;
      ctx.stroke();
    }
    return [x, y];
  }

  function draw() {
    const [w, h] = size();
    ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, w, h);
    axes();
    ctx.drawImage(dots, 0, 0, w, h);
    if (reached < LIMIT && runId && reached > 2) {
      // The scan line, while the counting runs.
      const x = Math.round(xOf(reached)) + 0.5;
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plot().h);
      ctx.stroke();
    }
    if (marked !== null) {
      const [x, y] = ring(marked, 4, true);
      ctx.font = `700 12px ${colors.font}`;
      ctx.textBaseline = 'bottom';
      ctx.textAlign = x > w - 70 ? 'right' : 'left';
      ctx.lineWidth = 4;
      ctx.strokeStyle = colors.paper;
      const text = marked.toLocaleString('en');
      const tx = x + (x > w - 70 ? -6 : 6);
      ctx.strokeText(text, tx, y - 4);
      ctx.fillStyle = colors.ink;
      ctx.fillText(text, tx, y - 4);
    }
    if (hovered !== null && hovered !== marked) ring(hovered, 6, false);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const [w, h] = size();
    canvas.width = dots.width = Math.round(w * ratio);
    canvas.height = dots.height = Math.round(h * ratio);
    redrawDots();
    draw();
  }

  // Counts and plots every even number up to 100,000. onProgress gets how far it got and
  // the first even number with no way, if it ever finds one.
  function run(onProgress) {
    const id = ++runId;
    let missing = null;
    const tally = n => {
      counts[n] = countPairs(n, primes, isPrime);
      if (!counts[n] && missing === null) missing = n;
    };
    reached = 2;
    redrawDots();
    if (reducedMotion.matches) {
      for (let n = 4; n <= LIMIT; n += 2) tally(n);
      reached = LIMIT;
      redrawDots();
      draw();
      onProgress(reached, missing);
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      const start = performance.now();
      const frame = now => {
        if (id !== runId) return resolve(false);
        const target = Math.min(LIMIT, 2 + ((now - start) / RUN_MS) * LIMIT);
        const deadline = performance.now() + BUDGET_MS;
        dctx.globalAlpha = DOT_ALPHA;
        while (reached + 2 <= target && performance.now() < deadline) {
          reached += 2;
          tally(reached);
          dot(reached);
        }
        draw();
        onProgress(reached, missing);
        if (reached < LIMIT) requestAnimationFrame(frame);
        else resolve(true);
      };
      requestAnimationFrame(frame);
    });
  }

  function mark(n) {
    marked = n !== null && n % 2 === 0 && n >= 4 ? n : null;
    draw();
  }

  // The counted even number nearest the pointer, if one is close enough.
  function dotAt(event) {
    const box = canvas.getBoundingClientRect();
    const px = event.clientX - box.left;
    const py = event.clientY - box.top;
    const perPx = LIMIT / plot().w;
    const from = Math.max(4, 2 * Math.floor(((px - MARGIN.left - REACH) * perPx) / 2));
    const to = Math.min(reached, (px - MARGIN.left + REACH) * perPx);
    let best = null;
    let bestDistance = REACH * REACH;
    for (let n = from; n <= to; n += 2) {
      const d = (xOf(n) - px) ** 2 + (yOf(counts[n]) - py) ** 2;
      if (d < bestDistance) {
        best = n;
        bestDistance = d;
      }
    }
    return best;
  }

  // Mouse only: on touch, a tap goes straight to picking.
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const n = dotAt(event);
    if (n === hovered) return;
    hovered = n;
    onHover(n, n === null ? 0 : counts[n]);
    draw();
  });
  canvas.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = null;
    onHover(null, 0);
    draw();
  });
  canvas.addEventListener('click', event => {
    const n = dotAt(event);
    if (n !== null) onPick(n);
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    colors = readColors();
    redrawDots();
    draw();
  });
  new ResizeObserver(resize).observe(canvas);
  document.fonts.load(`400 12px 'Courier Prime'`).then(draw);

  return {
    run,
    mark,
    ways: n => counts[n],
    get running() {
      return runId > 0 && reached < LIMIT;
    },
    get done() {
      return reached === LIMIT;
    },
  };
}
