// The path: each term of the sequence by step, on a log scale so a 40-digit number and a
// 2-digit one fit on the same chart. 0 sits on a floor of its own below 1.

const PAD = { left: 74, right: 14, top: 14, bottom: 30 }; // CSS px
const FLOOR = -0.6; // where 0 is drawn, in powers of ten
const DOTS = 80; // up to this many steps, every term gets a dot

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const readColors = () => ({ paper: token('--paper'), ink: token('--ink'), soft: token('--ink-soft'), red: token('--red'), font: token('--print') });
const fmt = n => n.toLocaleString('en');

// log10 of a decimal string, good to about 15 significant digits.
export function log10(term) {
  if (term === '0') return FLOOR;
  const lead = Number(`${term.slice(0, 1)}.${term.slice(1, 16) || '0'}`);
  return term.length - 1 + Math.log10(lead);
}

// Round steps for an axis: 1, 2 or 5 times a power of ten, so about `count` ticks fit.
function tickStep(range, count) {
  const raw = range / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map(m => m * power).find(s => s >= raw);
}

// Short ranges mark each power of ten as a number; long ones mark round digit counts,
// where d digits starts at 10^(d − 1).
function yTicks(top) {
  if (top <= 6) return Array.from({ length: top + 1 }, (_, k) => [k, fmt(10 ** k)]);
  const every = tickStep(top, 4);
  const ticks = [[0, '1']];
  for (let d = every; d - 1 <= top; d += every) ticks.push([d - 1, `${d} digits`]);
  return ticks;
}

export function createChart({ canvas, onHover }) {
  const ctx = canvas.getContext('2d');
  let colors = readColors();
  let logs = []; // log10 of each term
  let end = null; // 'zero' or 'loop' once the sequence finishes
  let loopStart = 0;
  let hovered = null;

  function geometry() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const steps = Math.max(8, logs.length - 1);
    const top = Math.max(1, Math.ceil(Math.max(...logs, 0)));
    const x = s => PAD.left + (s / steps) * (w - PAD.left - PAD.right);
    const y = v => h - PAD.bottom - ((v - FLOOR) / (top - FLOOR)) * (h - PAD.top - PAD.bottom);
    return { w, h, steps, top, x, y };
  }

  function draw() {
    const g = geometry();
    const dpr = canvas.width / g.w || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, g.w, g.h);

    // Axes: powers of ten across, steps along the bottom.
    ctx.font = `400 11px ${colors.font}`;
    ctx.fillStyle = colors.soft;
    ctx.strokeStyle = colors.soft;
    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    // 0's floor sits just under 1; on a tall chart the two labels would collide.
    const rows = [[FLOOR, '0'], ...yTicks(g.top).filter(([k]) => k > 0 || g.y(FLOOR) - g.y(0) >= 12)];
    for (const [v, label] of rows) {
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(PAD.left, g.y(v));
      ctx.lineTo(g.w - PAD.right, g.y(v));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillText(label, PAD.left - 8, g.y(v));
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const stride = tickStep(g.steps, 5);
    for (let s = 0; s <= g.steps; s += stride) ctx.fillText(fmt(s), g.x(s), g.h - PAD.bottom + 8);

    if (!logs.length) return;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    logs.forEach((v, s) => (s ? ctx.lineTo(g.x(s), g.y(v)) : ctx.moveTo(g.x(s), g.y(v))));
    ctx.stroke();
    if (logs.length - 1 <= DOTS) {
      ctx.fillStyle = colors.ink;
      logs.forEach((v, s) => dot(g.x(s), g.y(v), 2.5));
    }
    // Where it ends: 0, or the numbers it loops through.
    if (end) {
      ctx.fillStyle = colors.red;
      const from = end === 'loop' ? loopStart : logs.length - 1;
      for (let s = from; s < logs.length; s++) dot(g.x(s), g.y(logs[s]), 4);
    }
    if (hovered !== null) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(g.x(hovered), g.y(logs[hovered]), 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function dot(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function stepAt(event) {
    const box = canvas.getBoundingClientRect();
    const g = geometry();
    const s = Math.round(((event.clientX - box.left - PAD.left) / (g.w - PAD.left - PAD.right)) * g.steps);
    return logs.length ? Math.max(0, Math.min(logs.length - 1, s)) : null;
  }

  function hover(s) {
    if (s === hovered) return;
    hovered = s;
    draw();
    onHover(s);
  }

  canvas.addEventListener('pointermove', event => event.pointerType === 'mouse' && hover(stepAt(event)));
  canvas.addEventListener('pointerdown', event => event.pointerType !== 'mouse' && hover(stepAt(event)));
  canvas.addEventListener('pointerleave', event => event.pointerType === 'mouse' && hover(null));

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
    reset() {
      logs = [];
      end = null;
      hovered = null;
      draw();
    },
    // Terms arrive faster than frames, so the page batches them and draws once.
    add(terms) {
      logs.push(...terms.map(log10));
      draw();
    },
    finish(how, start = 0) {
      end = how;
      loopStart = start;
      draw();
    },
  };
}
