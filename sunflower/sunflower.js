// The golden angle. Seeds go down one at a time, each a fixed fraction of a turn round
// from the last, with seed n at √n from the centre so every seed gets the same room
// (H. Vogel's 1979 model of a sunflower head).

export const PHI = (1 + Math.sqrt(5)) / 2;
export const GOLDEN = PHI - 1; // 0.618034… of a turn
export const MIN_SEEDS = 200; // below this, a few odd turns can out-pack the golden one
export const TURN_STEP = 0.0001; // the turn slider's step
export const MAX_SEEDS = 5000;
// The first few seeds crowd the centre whatever the turn, so packing is judged after them.
export const SKIP = 10;
// Neighbour spacing in a perfect honeycomb with the same room per seed (π, since seed n
// sits at radius √n).
export const HONEYCOMB = Math.sqrt((2 * Math.PI) / Math.sqrt(3));

// Seed n (1-based) at index n: x and y with radius √n.
export function place(turn, count) {
  const xs = new Float64Array(count + 1);
  const ys = new Float64Array(count + 1);
  for (let n = 1; n <= count; n++) {
    const angle = 2 * Math.PI * ((n * turn) % 1);
    const r = Math.sqrt(n);
    xs[n] = r * Math.cos(angle);
    ys[n] = r * Math.sin(angle);
  }
  return { xs, ys };
}

// For each seed from SKIP on, its nearest neighbour among those seeds. Returns the closest
// gap as a share of the honeycomb gap, and the arms you'd count at the edge: how many seeds
// apart the outer seeds' nearest neighbours are, for the differences that are common there.
export function neighbours(turn, count, { xs, ys } = place(turn, count)) {
  const size = 2.5; // grid cell, wider than any honeycomb gap
  const offset = Math.sqrt(count) + size;
  const cells = new Map();
  const cellOf = (x, y) => Math.floor((x + offset) / size) * 100000 + Math.floor((y + offset) / size);
  for (let n = SKIP; n <= count; n++) {
    const key = cellOf(xs[n], ys[n]);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(n);
  }

  let closest = size;
  const edge = Math.floor(count * 0.8);
  const steps = new Map();
  for (let n = SKIP; n <= count; n++) {
    let best = Infinity;
    let nearest = 0;
    const key = cellOf(xs[n], ys[n]);
    for (const dx of [-100000, 0, 100000]) {
      for (const dy of [-1, 0, 1]) {
        for (const m of cells.get(key + dx + dy) ?? []) {
          if (m === n) continue;
          const d = (xs[n] - xs[m]) ** 2 + (ys[n] - ys[m]) ** 2;
          if (d < best) {
            best = d;
            nearest = m;
          }
        }
      }
    }
    closest = Math.min(closest, Math.sqrt(best));
    if (n > edge && nearest) {
      const step = Math.abs(nearest - n);
      steps.set(step, (steps.get(step) ?? 0) + 1);
    }
  }
  const ring = count - edge;
  const arms = [...steps]
    .filter(([, times]) => times >= ring * 0.2)
    .map(([step]) => step)
    .sort((a, b) => a - b);
  return { gap: closest / HONEYCOMB, arms };
}

// The continued-fraction convergents p/q of x in [0, 1), up to a largest denominator.
export function convergents(x, largest) {
  const found = [];
  let [p0, q0, p1, q1] = [0, 1, 1, 0];
  let rest = x;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(rest);
    [p0, q0, p1, q1] = [p1, q1, a * p1 + p0, a * q1 + q0];
    if (q1 > largest) break;
    if (q1 > 0 && p1 > 0) found.push([p1, q1]);
    const fraction = rest - a;
    if (fraction < 1e-12 || Math.abs(p1 / q1 - x) < 1e-15) break;
    rest = 1 / fraction;
  }
  return found;
}

const NAMED = {
  pi: [Math.PI, 'π'],
  'π': [Math.PI, 'π'],
  e: [Math.E, 'e'],
  phi: [PHI, 'φ'],
  'φ': [PHI, 'φ'],
  golden: [PHI, 'φ'],
};

// Reads a typed turn: a decimal, a fraction like 2/5, pi, e, phi or a square root like √2.
// Only the part after the whole turns matters, so π turns act like 0.14159… of a turn.
export function parseTurn(text) {
  const t = text.trim().toLowerCase().replace(/\s+/g, '');
  let value = null;
  let label = t;
  if (NAMED[t]) [value, label] = NAMED[t];
  else if (/^\d*\.?\d+$/.test(t)) value = Number(t);
  else if (/^\d+\/\d+$/.test(t)) {
    const [p, q] = t.split('/').map(Number);
    if (q > 0) value = p / q;
  } else {
    const root = t.match(/^(?:√|sqrt)(?:(\d+(?:\.\d+)?)|\((\d+(?:\.\d+)?)\))$/);
    if (root) {
      const radicand = root[1] ?? root[2];
      value = Math.sqrt(Number(radicand));
      label = `√${radicand}`;
    }
  }
  if (value === null || !Number.isFinite(value)) return null;
  return { turn: value - Math.floor(value), label };
}

export const isGolden = turn => Math.abs(turn - GOLDEN) < 1e-9 || Math.abs(turn - (1 - GOLDEN)) < 1e-9;
