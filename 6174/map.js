// The 100 x 100 map of every four-digit number: hover routes, highlights, and the
// run where all 10,000 numbers take their rounds at once.
import { COUNT, KAPREKAR, pad, route } from './kaprekar.js';

const SIDE = 100;
const FLIGHT_MS = 950;
const SPREAD_MS = 320;
const REST_MS = 650;

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function readColors() {
  return {
    paper: token('--paper'),
    ink: token('--ink'),
    red: token('--red'),
    rep: token('--rep'),
    ramp: [1, 2, 3, 4, 5, 6, 7].map(i => token(`--r${i}`)),
  };
}

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function createMap({ canvas, tip, rounds, next, onPick }) {
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let colors = readColors();
  let size = 0; // canvas pixels per side, a multiple of 100
  let cell = 0;
  let base = null; // 100 x 100 image of the shaded map
  let highlight = null; // rounds value whose cells stay bright
  let picked = null; // number whose route is drawn
  let hovered = null;
  let collapse = null; // { id } while the 10,000 run is going or showing its end

  const colorOf = n => {
    const r = rounds[n];
    if (r < 0) return colors.rep;
    return r === 0 ? colors.red : colors.ramp[r - 1];
  };

  function paintBase() {
    const image = new ImageData(SIDE, SIDE);
    const paper = rgb(colors.paper);
    for (let n = 0; n < COUNT; n++) {
      const [r, g, b] = rgb(colorOf(n));
      const dim = highlight !== null && rounds[n] !== highlight;
      const k = dim ? 0.16 : 1;
      image.data.set([r * k + paper[0] * (1 - k), g * k + paper[1] * (1 - k), b * k + paper[2] * (1 - k), 255], n * 4);
    }
    base = document.createElement('canvas');
    base.width = base.height = SIDE;
    base.getContext('2d').putImageData(image, 0, 0);
  }

  const center = n => [((n % SIDE) + 0.5) * cell, (Math.floor(n / SIDE) + 0.5) * cell];

  // Canvas pixels per CSS pixel.
  const scale = () => size / canvas.clientWidth || 1;

  // r is in CSS pixels; the paper ring keeps dots legible where they cross the line.
  function dot(x, y, fill, r) {
    const dpr = scale();
    ctx.beginPath();
    ctx.arc(x, y, r * dpr, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = colors.paper;
    ctx.stroke();
  }

  function drawRoute(n) {
    const dpr = scale();
    const stops = [n, ...route(n).map(r => r.next)];
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.beginPath();
    stops.forEach((s, i) => ctx[i ? 'lineTo' : 'moveTo'](...center(s)));
    ctx.strokeStyle = colors.paper;
    ctx.lineWidth = 6 * dpr;
    ctx.stroke();
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();
    stops.forEach((s, i) => dot(...center(s), s === KAPREKAR ? colors.red : colors.ink, i === 0 ? 6 : 4.5));
  }

  function drawOutline(n) {
    const dpr = scale();
    const x = (n % SIDE) * cell;
    const y = Math.floor(n / SIDE) * cell;
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = colors.ink;
    ctx.strokeRect(x - dpr, y - dpr, cell + 2 * dpr, cell + 2 * dpr);
  }

  function draw() {
    if (collapse) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(base, 0, 0, size, size);
    if (picked !== null) drawRoute(picked);
    if (hovered !== null && hovered !== picked) drawOutline(hovered);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    size = SIDE * Math.max(1, Math.round((canvas.clientWidth * dpr) / SIDE));
    if (canvas.width !== size) canvas.width = canvas.height = size;
    cell = size / SIDE;
    if (collapse?.frame) collapse.frame();
    else draw();
  }

  // Tooltip

  function describe(n) {
    const r = rounds[n];
    const stops = [n, ...route(n).map(s => s.next)].map(pad).join(' → ');
    if (r < 0) return `<strong>${pad(n)}</strong> falls to 0000 and stays.`;
    if (r === 0) return `<strong>6174</strong> is already there.`;
    return `<strong>${pad(n)}</strong> takes ${r} round${r > 1 ? 's' : ''}.<span class="route">${stops}</span>`;
  }

  function placeTip(n) {
    tip.innerHTML = describe(n);
    tip.hidden = false;
    const [x, y] = center(n).map(v => (v / size) * canvas.clientWidth);
    const frame = canvas.parentElement;
    const top = canvas.offsetTop + y;
    const left = canvas.offsetLeft + x;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    tip.style.left = `${Math.min(Math.max(0, left - w / 2), frame.clientWidth - w)}px`;
    tip.style.top = `${top - h - 14 < 0 ? top + 16 : top - h - 14}px`;
  }

  function cellAt(event) {
    const box = canvas.getBoundingClientRect();
    const col = Math.floor(((event.clientX - box.left) / box.width) * SIDE);
    const row = Math.floor(((event.clientY - box.top) / box.height) * SIDE);
    if (col < 0 || row < 0 || col >= SIDE || row >= SIDE) return null;
    return row * SIDE + col;
  }

  canvas.addEventListener('pointermove', event => {
    if (collapse || event.pointerType !== 'mouse') return;
    const n = cellAt(event);
    if (n === hovered) return;
    hovered = n;
    if (n === null) tip.hidden = picked === null;
    else placeTip(n);
    draw();
  });

  canvas.addEventListener('pointerleave', () => {
    hovered = null;
    if (picked !== null && !collapse) placeTip(picked);
    else tip.hidden = true;
    draw();
  });

  canvas.addEventListener('click', event => {
    const n = cellAt(event);
    if (n !== null) onPick(n);
  });

  // The 10,000 run

  // Round 1 flies every number from its own square; after that, every number on the
  // same value goes to the same place, so whole piles fly as discs and merge.
  async function runAll(onRound) {
    const id = Symbol('collapse');
    collapse = { id };
    tip.hidden = true;
    const still = reducedMotion.matches;
    const live = () => collapse?.id === id;

    const delays = Float32Array.from({ length: COUNT }, () => Math.random() * SPREAD_MS);
    // Grouped by colour so each frame sets fillStyle a few times, not 10,000.
    const groups = new Map();
    for (let n = 0; n < COUNT; n++) {
      if (!groups.has(rounds[n])) groups.set(rounds[n], { sample: n, members: [] });
      groups.get(rounds[n]).members.push(n);
    }

    const radius = count => cell * 0.6 + size * 0.085 * Math.sqrt(count / COUNT);
    const progress = (elapsed, delay) => ease(Math.min(1, Math.max(0, (elapsed - delay) / FLIGHT_MS)));
    const lerp = (a, b, t) => {
      const [ax, ay] = center(a);
      const [bx, by] = center(b);
      return [ax + (bx - ax) * t, ay + (by - ay) * t];
    };

    const backdrop = () => {
      ctx.fillStyle = colors.paper;
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 0.1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(base, 0, 0, size, size);
      ctx.globalAlpha = 1;
    };

    const disc = (x, y, count, red) => {
      ctx.beginPath();
      ctx.arc(x, y, radius(count), 0, Math.PI * 2);
      ctx.fillStyle = red ? colors.red : colors.ink;
      ctx.fill();
      ctx.lineWidth = 2 * scale();
      ctx.strokeStyle = colors.paper;
      ctx.stroke();
    };

    const label = (v, count, text) => {
      const dpr = scale();
      ctx.font = `600 ${13 * dpr}px ${token('--font')}`;
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const [x, cy] = center(v);
      const y = Math.max(cy, 10 * dpr); // 0000 sits on the top edge
      const gap = radius(count) + 6 * dpr;
      const right = x + gap + ctx.measureText(text).width < size;
      ctx.textAlign = right ? 'left' : 'right';
      const tx = right ? x + gap : x - gap;
      ctx.lineWidth = 4 * dpr;
      ctx.strokeStyle = colors.paper;
      ctx.strokeText(text, tx, y);
      ctx.fillStyle = colors.ink;
      ctx.fillText(text, tx, y);
    };

    const bySize = tally => [...tally].sort((p, q) => q[1] - p[1]);

    const paintScatter = elapsed => {
      backdrop();
      const s = Math.max(cell, 2);
      for (const { sample, members } of groups.values()) {
        ctx.fillStyle = colorOf(sample); // read per frame, so a theme switch applies mid-flight
        for (const n of members) {
          const [x, y] = lerp(n, next[n], progress(elapsed, delays[n]));
          ctx.fillRect(x - cell / 2, y - cell / 2, s, s);
        }
      }
    };

    const paintFlight = (tally, elapsed) => {
      backdrop();
      for (const [v, count] of bySize(tally)) {
        const t = progress(elapsed, delays[v]);
        disc(...lerp(v, next[v], t), count, v === KAPREKAR || (t === 1 && next[v] === KAPREKAR));
      }
      if (tally.has(KAPREKAR)) label(KAPREKAR, tally.get(KAPREKAR), `6174: ${tally.get(KAPREKAR).toLocaleString('en')}`);
    };

    const paintRest = (tally, final) => {
      backdrop();
      for (const [v, count] of bySize(tally)) disc(...center(v), count, v === KAPREKAR);
      if (tally.has(KAPREKAR)) label(KAPREKAR, tally.get(KAPREKAR), `6174: ${tally.get(KAPREKAR).toLocaleString('en')}`);
      if (final && tally.has(0)) label(0, tally.get(0), `0000: ${tally.get(0)}`);
    };

    let tally = null; // value -> how many numbers sit on it
    for (let round = 1; round <= 7 && live(); round++) {
      if (!still) {
        const from = tally;
        const paint = elapsed => (from ? paintFlight(from, elapsed) : paintScatter(elapsed));
        const start = performance.now();
        collapse.frame = () => paint(performance.now() - start);
        await new Promise(resolve => {
          const frame = () => {
            if (!live()) return resolve();
            const elapsed = performance.now() - start;
            paint(elapsed);
            if (elapsed < FLIGHT_MS + SPREAD_MS) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
      }
      if (!live()) return;
      const landed = new Map();
      for (const [v, count] of tally ?? Array.from({ length: COUNT }, (_, n) => [n, 1])) {
        landed.set(next[v], (landed.get(next[v]) ?? 0) + count);
      }
      tally = landed;
      const final = round === 7;
      collapse.frame = () => paintRest(landed, final);
      collapse.frame();
      onRound(round, landed);
      await sleep(still ? 900 : REST_MS);
    }
    if (live()) collapse.done = true;
  }

  function stopCollapse() {
    if (!collapse) return;
    collapse = null;
    draw();
    if (picked !== null) placeTip(picked);
  }

  function setHighlight(value) {
    highlight = value;
    paintBase();
    draw();
  }

  function pick(n) {
    stopCollapse();
    picked = n;
    hovered = null;
    draw();
    placeTip(n);
  }

  function refresh() {
    colors = readColors();
    paintBase();
    if (collapse?.frame) collapse.frame();
    else draw();
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh);
  new ResizeObserver(() => {
    resize();
    if (picked !== null && !tip.hidden && !collapse) placeTip(picked);
  }).observe(canvas);

  paintBase();
  resize();

  return {
    pick,
    runAll,
    stopCollapse,
    setHighlight,
    get collapsing() {
      return collapse !== null && !collapse.done;
    },
    get collapsed() {
      return collapse?.done === true;
    },
  };
}
