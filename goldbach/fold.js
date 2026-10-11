// The fold: the number line from 0 to n, folded in half at n/2 so every number k sits
// over its partner n − k. A column with a prime at both ends is a way to write n as p + q.

const PAD = 14; // CSS px at each end of the line
const GAP = 64; // CSS px between the two rows once folded
const TICK = 14;
const GLYPH_PX = 10; // smallest numeral worth printing; below it, primes are ticks
const FAINT = 0.3;
const HOLD_MS = 380;
const FOLD_MS = 760;
const SPREAD_MS = 520;
const MATCH_MS = 760;

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const readColors = () => ({ ink: token('--ink'), soft: token('--ink-soft'), red: token('--red'), paper: token('--paper') });

export function createFold({ canvas }) {
  const ctx = canvas.getContext('2d');
  let colors = readColors();
  let n = 0;
  let isPrime = null;
  let isPair = new Uint8Array(0); // isPair[p] for the smaller prime of each pair
  let pairList = [];
  let fold = 1; // 0 = flat line, 1 = folded
  let spread = 1; // 0 = folded strip half as wide, 1 = full width
  let match = 1; // how far the red columns have been revealed
  let hovered = null;

  const size = () => [canvas.clientWidth, canvas.clientHeight];
  const half = () => Math.floor(n / 2); // the top row runs 0..half once folded

  // Where number k sits, and which way its marks face: 1 is up, -1 is down. n/2 itself
  // belongs to both rows, so `bottom` picks which one.
  function place(k, bottom = k > n / 2) {
    const [w, h] = size();
    const length = w - 2 * PAD;
    const mid = PAD + length / 2;
    let x = PAD + (k / n) * length;
    let y;
    let facing = 1;
    if (!bottom) {
      y = h / 2 - (GAP / 2) * fold;
    } else {
      facing = Math.cos(Math.PI * fold);
      x = mid + (x - mid) * facing;
      y = h / 2 + (GAP / 2) * fold;
    }
    return [PAD + (x - PAD) * (1 + spread), y, facing];
  }

  function draw() {
    const [w, h] = size();
    const dpr = canvas.width / w || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, w, h);
    if (!n) return;

    const cell = ((w - 2 * PAD) / n) * (1 + spread);
    // Courier is 0.6em a digit, so the widest numeral still fits its column.
    const fontSize = Math.min(17, cell * 0.62, (1.4 * cell) / String(n).length);
    // All numerals or all ticks: a blend of the two at one size reads as neither.
    const glyphs = fontSize >= GLYPH_PX ? 1 : 0;
    const ticks = 1 - glyphs;
    const line = Math.max(1 / dpr, Math.min(1.5, cell * 0.8));

    // The two halves of the line: 0..n/2 on top, n/2..n swinging underneath.
    ctx.lineCap = 'round';
    ctx.strokeStyle = colors.ink;
    ctx.globalAlpha = ticks;
    ctx.lineWidth = 2;
    for (const [from, to, bottom] of [[0, n / 2, false], [n / 2, n, true]]) {
      const [x0, y0] = place(from, bottom);
      const [x1, y1] = place(to, bottom);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // Prime ticks, or numerals when there's room for them. For even n, n/2 sits in both
    // rows: its column is n/2 + n/2.
    const pairShown = p => isPair[p] === 1 && match >= revealAt(p);
    const red = k => (k <= n / 2 ? pairShown(k) : pairShown(n - k));
    const marks = [];
    for (let k = 0; k <= n; k++) marks.push([k, k > n / 2]);
    if (n % 2 === 0) marks.push([n / 2, true]);
    ctx.lineWidth = line;
    ctx.globalAlpha = ticks;
    for (const lit of [false, true]) {
      ctx.strokeStyle = lit ? colors.red : colors.ink;
      ctx.beginPath();
      for (const [k, bottom] of marks) {
        if (!isPrime[k] || red(k) !== lit) continue;
        const [x, y, facing] = place(k, bottom);
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - TICK * facing);
      }
      ctx.stroke();
    }
    if (glyphs > 0) {
      ctx.font = `700 ${fontSize}px 'Courier Prime', 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const [k, bottom] of marks) {
        const [x, y, facing] = place(k, bottom);
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, Math.abs(facing) || 0.001); // the bottom row flips over like a card
        ctx.globalAlpha = glyphs * (isPrime[k] ? 1 : FAINT);
        ctx.fillStyle = red(k) ? colors.red : colors.ink;
        ctx.fillText(k, 0, 0);
        ctx.restore();
      }
    }

    // Red columns join the two primes of each pair.
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.red;
    ctx.lineWidth = Math.max(1 / dpr, Math.min(3, cell * 0.35));
    for (const p of pairList) {
      if (!pairShown(p)) continue;
      const [x, y0] = place(p, false);
      const [, y1] = place(n - p, true);
      ctx.beginPath();
      ctx.moveTo(x, y0 + 3 + 8 * glyphs);
      ctx.lineTo(x, y1 - 3 - 8 * glyphs);
      ctx.stroke();
    }

    drawLabels(glyphs);
    if (hovered !== null && fold === 1 && spread === 1) drawHover(hovered);
    ctx.globalAlpha = 1;
  }

  // Pairs light up left to right.
  const revealAt = p => (p / (n / 2)) * 0.75;

  function label(text, x, y, align) {
    ctx.font = `400 12px 'Courier Prime', 'Courier New', monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = colors.paper;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = colors.soft;
    ctx.fillText(text, x, y);
  }

  // The ends of the line, and the fold. Flat, they sit under the line; folded, in the gap.
  function drawLabels(glyphs) {
    ctx.globalAlpha = 1 - glyphs;
    if (ctx.globalAlpha <= 0) return;
    const [w, h] = size();
    const fmt = v => (Number.isInteger(v) ? v.toLocaleString('en') : v.toFixed(1));
    const folded = fold > 0.5;
    const [x0, y0] = place(0);
    const [xEnd, yEnd] = place(n);
    const [xMid, yMid] = place(n / 2, false);
    if (fold < 1) {
      ctx.save();
      ctx.globalAlpha *= 1 - fold;
      ctx.strokeStyle = colors.soft;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(xMid, yMid - TICK - 6);
      ctx.lineTo(xMid, yMid + 8);
      ctx.stroke();
      ctx.restore();
    }
    label('0', x0, y0 + 14, 'left');
    // The labels that move with the fold fade out while it's edge-on.
    ctx.globalAlpha *= Math.abs(Math.cos(Math.PI * fold));
    label(fmt(n), xEnd, folded ? yEnd - 14 : yEnd + 14, folded ? 'left' : 'right');
    if (folded) label(fmt(n / 2), xMid - 8, h / 2, 'right'); // clear of an n/2 + n/2 column
    else label(fmt(n / 2), xMid, yMid + 14, 'center');
  }

  function drawHover(k) {
    const [x, y0] = place(k, false);
    const [, y1] = place(n - k, true);
    const pair = isPair[k];
    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y0 - TICK - 4);
    ctx.lineTo(x, y1 + TICK + 4);
    ctx.stroke();
    ctx.setLineDash([]);
    const [w] = size();
    const text = `${k.toLocaleString('en')} + ${(n - k).toLocaleString('en')}`;
    ctx.font = `700 13px 'Courier Prime', 'Courier New', monospace`;
    const room = ctx.measureText(text).width / 2 + 4;
    const tx = clamp(x, room, w - room);
    ctx.lineWidth = 4;
    ctx.strokeStyle = colors.paper;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(text, tx, y0 - TICK - 12);
    ctx.fillStyle = pair ? colors.red : colors.ink;
    ctx.fillText(text, tx, y0 - TICK - 12);
  }

  // The column under the pointer, snapping to a pair within a few pixels.
  function columnAt(event) {
    const box = canvas.getBoundingClientRect();
    const [w] = size();
    const perPx = n / 2 / (w - 2 * PAD);
    const k = Math.round((event.clientX - box.left - PAD) * perPx);
    if (k < 0 || k > half()) return null;
    const reach = Math.round(6 * perPx);
    for (let d = 0; d <= reach; d++) {
      if (isPair[k - d]) return k - d;
      if (isPair[k + d] && k + d <= half()) return k + d;
    }
    return k;
  }

  // A mouse labels the column under it; a tap labels the tapped column until the next tap.
  const point = event => {
    if (!n) return;
    const k = columnAt(event);
    if (k === hovered) return;
    hovered = k;
    draw();
  };
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') point(event);
  });
  canvas.addEventListener('pointerdown', point);
  canvas.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = null;
    draw();
  });

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const [w, h] = size();
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    draw();
  }

  function tween(ms, set, live) {
    return new Promise(resolve => {
      const start = performance.now();
      const frame = now => {
        if (!live()) return resolve(false);
        const t = clamp((now - start) / ms);
        set(t);
        draw();
        if (t < 1) requestAnimationFrame(frame);
        else resolve(true);
      };
      requestAnimationFrame(frame);
    });
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  // Lays out n; animated, it folds the line, spreads it and lights the pairs in turn.
  async function show(number, primeTable, { animate = true, live = () => true } = {}) {
    n = number;
    isPrime = primeTable;
    isPair = new Uint8Array(half() + 2);
    pairList = [];
    for (let p = 2; p <= n - p; p++) {
      if (isPrime[p] && isPrime[n - p]) {
        isPair[p] = 1;
        pairList.push(p);
      }
    }
    hovered = null;
    canvas.setAttribute(
      'aria-label',
      `The number line from 0 to ${n.toLocaleString('en')}, folded at ${(n / 2).toLocaleString('en')} so each number sits over the one that adds up to ${n.toLocaleString('en')} with it. Primes are marked, and ${pairList.length.toLocaleString('en')} column${pairList.length === 1 ? ' has' : 's have'} a prime at both ends.`,
    );
    if (!animate) {
      fold = spread = match = 1;
      draw();
      return true;
    }
    fold = spread = match = 0;
    draw();
    await wait(HOLD_MS);
    if (!live()) return false;
    if (!(await tween(FOLD_MS, t => (fold = ease(t)), live))) return false;
    if (!(await tween(SPREAD_MS, t => (spread = ease(t)), live))) return false;
    return tween(MATCH_MS, t => (match = t), live);
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    colors = readColors();
    draw();
  });
  new ResizeObserver(resize).observe(canvas);
  document.fonts.load(`700 16px 'Courier Prime'`).then(draw);

  return { show };
}
