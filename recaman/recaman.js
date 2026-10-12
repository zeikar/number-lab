// Recamán's sequence: start at 0; on step n, jump back n if that lands on a new number above
// 0, otherwise jump forward n.

export const WALK_STEPS = 10_000_000; // how far the browser walks
export const GRID = 2000; // numbers 0..1999 in the grid of gaps
export const MAX_DRAWN = 400; // most steps the arcs view draws
// The biggest number the walk reaches in WALK_STEPS steps; nothing above it can be found.
export const MAX_REACHED = 61_998_984;

// A walker that remembers every number it has landed on, in a bitset that grows as needed.
export function createWalker() {
  let words = new Uint32Array(1 << 12);
  let n = 0;
  let value = 0;
  const has = v => v >>> 5 < words.length && (words[v >>> 5] >>> (v & 31)) & 1;
  const add = v => {
    if (v >>> 5 >= words.length) {
      let size = words.length;
      while (v >>> 5 >= size) size *= 2;
      const grown = new Uint32Array(size);
      grown.set(words);
      words = grown;
    }
    words[v >>> 5] |= 1 << (v & 31);
  };
  add(0);
  return {
    // Takes one step; returns true if it landed somewhere new.
    step() {
      n++;
      const back = value - n;
      value = back > 0 && !has(back) ? back : value + n;
      if (has(value)) return false;
      add(value);
      return true;
    },
    has: v => Boolean(has(v)),
    get n() {
      return n;
    },
    get value() {
      return value;
    },
  };
}

// The first `count` + 1 terms, a(0) to a(count).
export function terms(count) {
  const walker = createWalker();
  const list = [0];
  for (let i = 0; i < count; i++) {
    walker.step();
    list.push(walker.value);
  }
  return list;
}

// The step that first lands on target and where it jumped from, or null if it isn't
// reached within `limit` steps.
export function landing(target, limit = WALK_STEPS) {
  if (target === 0) return { step: 0, from: 0 };
  const walker = createWalker();
  while (walker.n < limit) {
    const from = walker.value;
    walker.step();
    if (walker.value === target) return { step: walker.n, from };
  }
  return null;
}

export const firstStep = (target, limit) => landing(target, limit)?.step ?? -1;

// Parses a typed whole number, commas allowed, or null.
export function parseNumber(text) {
  const trimmed = text.trim().replace(/,/g, '');
  return /^\d{1,9}$/.test(trimmed) ? Number(trimmed) : null;
}
