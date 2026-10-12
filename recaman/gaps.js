// The grid of gaps: the numbers 0 to 1,999, each filled in when the walk first lands on it
// and shaded by how many steps that took. The walk runs 10 million steps, faster and faster.
import { WALK_STEPS, GRID, createWalker } from './recaman.js';

const COLUMNS = 50;
const ROWS = GRID / COLUMNS;
const DECADE_MS = 1000; // each power of ten of steps takes about this long
const BUDGET_MS = 12; // walking per frame, so a slow phone falls behind rather than stalls
export const EDGES = [10, 100, 1000, 10000, 100000, 1000000]; // shade bins, in steps

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const readColors = () => ({
  paper: token('--paper'),
  ink: token('--ink'),
  rule: token('--ink-soft'),
  red: token('--red'),
  ramp: [1, 2, 3, 4, 5, 6].map(i => token(`--r${i}`)),
});

export const binOf = step => EDGES.findIndex(edge => step <= edge);

export function createGaps({ canvas, onHover, onPick }) {
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let colors = readColors();
  const firsts = new Int32Array(GRID).fill(-1);
  let walker = null;
  let smallest = 1;
  let runId = 0;
  let hovered = null;

  const cell = () => canvas.clientWidth / COLUMNS;

  function draw() {
    const w = canvas.clientWidth;
    const size = cell();
    const dpr = canvas.width / w || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, w, size * ROWS);
    const gap = size > 6 ? 1 : 0.5;
    for (let v = 0; v < GRID; v++) {
      // Numbers not reached yet stay as faint empty squares.
      const reached = firsts[v] >= 0;
      ctx.globalAlpha = reached ? 1 : 0.07;
      ctx.fillStyle = reached ? colors.ramp[binOf(firsts[v])] : colors.ink;
      ctx.fillRect((v % COLUMNS) * size + gap / 2, Math.floor(v / COLUMNS) * size + gap / 2, size - gap, size - gap);
    }
    ctx.globalAlpha = 1;
    if (walker && smallest < GRID) {
      ctx.strokeStyle = colors.red;
      ctx.lineWidth = 2;
      ctx.strokeRect((smallest % COLUMNS) * size + 1, Math.floor(smallest / COLUMNS) * size + 1, size - 2, size - 2);
    }
    if (hovered !== null) {
      ctx.strokeStyle = colors.rule;
      ctx.lineWidth = 1.5;
      ctx.strokeRect((hovered % COLUMNS) * size + 0.75, Math.floor(hovered / COLUMNS) * size + 0.75, size - 1.5, size - 1.5);
    }
  }

  function walkTo(target, deadline = Infinity) {
    while (walker.n < target) {
      if ((walker.n & 0xffff) === 0 && performance.now() > deadline) return;
      walker.step();
      const v = walker.value;
      if (v < GRID && firsts[v] < 0) firsts[v] = walker.n;
      if (v === smallest) while (walker.has(smallest)) smallest++;
    }
  }

  // Walks 10 million steps; onProgress(steps, smallest) after each frame.
  function run(onProgress) {
    const id = ++runId;
    firsts.fill(-1);
    firsts[0] = 0;
    walker = createWalker();
    smallest = 1;
    if (reducedMotion.matches) {
      walkTo(WALK_STEPS);
      draw();
      onProgress(walker.n, smallest);
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      const start = performance.now();
      const frame = now => {
        if (id !== runId) return resolve(false);
        const target = Math.min(WALK_STEPS, Math.floor(10 ** ((now - start) / DECADE_MS)));
        walkTo(target, performance.now() + BUDGET_MS);
        draw();
        onProgress(walker.n, smallest);
        if (hovered !== null) onHover(hovered, firsts[hovered]); // it may have just been reached
        if (walker.n < WALK_STEPS) requestAnimationFrame(frame);
        else resolve(true);
      };
      requestAnimationFrame(frame);
    });
  }

  function cellAt(event) {
    const box = canvas.getBoundingClientRect();
    const col = Math.floor(((event.clientX - box.left) / box.width) * COLUMNS);
    const row = Math.floor(((event.clientY - box.top) / box.height) * ROWS);
    if (col < 0 || row < 0 || col >= COLUMNS || row >= ROWS) return null;
    return row * COLUMNS + col;
  }

  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const v = cellAt(event);
    if (v === hovered) return;
    hovered = v;
    onHover(v, v === null ? -1 : firsts[v]);
    draw();
  });
  canvas.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = null;
    onHover(null, -1);
    draw();
  });
  canvas.addEventListener('click', event => {
    const v = cellAt(event);
    if (v !== null) onPick(v);
  });

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
    counts() {
      const bins = EDGES.map(() => 0);
      for (const step of firsts) if (step >= 0) bins[binOf(step)]++;
      return bins;
    },
    missing: () => [...firsts.keys()].filter(v => firsts[v] < 0),
    get running() {
      return runId > 0 && walker !== null && walker.n < WALK_STEPS;
    },
  };
}
