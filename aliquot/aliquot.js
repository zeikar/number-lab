// Aliquot sequences: replace a number by the sum of its divisors below itself, and repeat.
// Terms outgrow 2^53 fast, so everything is BigInt, and big terms are factored by Pollard's
// rho. No DOM here, so the tests can import it.

const SIEVE = 1 << 16;
const SMALL = [];
{
  const composite = new Uint8Array(SIEVE);
  for (let i = 2; i < SIEVE; i++) {
    if (composite[i]) continue;
    SMALL.push(BigInt(i));
    for (let j = i * i; j < SIEVE; j += i) composite[j] = 1;
  }
}
const BASES = SMALL.slice(0, 13); // Miller–Rabin with the primes to 41 is exact below 3.3 × 10^24

function powMod(base, exp, mod) {
  let result = 1n;
  base %= mod;
  for (; exp; exp >>= 1n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
  }
  return result;
}

export function isPrime(n) {
  if (n < 2n) return false;
  for (const p of BASES) if (n % p === 0n) return n === p;
  let d = n - 1n;
  let s = 0;
  for (; !(d & 1n); s++) d >>= 1n;
  for (const a of BASES) {
    let x = powMod(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let i = 1;
    for (; i < s && x !== n - 1n; i++) x = (x * x) % n;
    if (x !== n - 1n) return false;
  }
  return true;
}

const gcd = (a, b) => {
  while (b) [a, b] = [b, a % b];
  return a;
};

// Pollard's rho with Brent's cycle finding: some factor of a composite n, found by
// walking x → x² + c mod n until two points agree modulo a hidden prime.
function rho(n) {
  for (let c = 1n; ; c++) {
    const f = v => (v * v + c) % n;
    let y = 2n;
    let x = y;
    let g = 1n;
    let q = 1n;
    let saved = y;
    for (let r = 1; g === 1n; r *= 2) {
      x = y;
      for (let i = 0; i < r; i++) y = f(y);
      for (let k = 0; k < r && g === 1n; k += 128) {
        saved = y;
        for (let i = 0; i < Math.min(128, r - k); i++) {
          y = f(y);
          q = (q * (x > y ? x - y : y - x)) % n;
        }
        g = gcd(q, n);
      }
    }
    // The batch overshot: step back through it one at a time.
    if (g === n) {
      do {
        saved = f(saved);
        g = gcd(x > saved ? x - saved : saved - x, n);
      } while (g === 1n);
    }
    if (g !== n) return g;
  }
}

// Prime factors of n with their powers, smallest first.
export function factor(n) {
  const found = new Map();
  const add = p => found.set(p, (found.get(p) ?? 0) + 1);
  for (const p of SMALL) {
    if (p * p > n) break;
    while (n % p === 0n) {
      add(p);
      n /= p;
    }
  }
  const stack = n > 1n ? [n] : [];
  while (stack.length) {
    const m = stack.pop();
    if (isPrime(m)) {
      add(m);
      continue;
    }
    const d = rho(m);
    stack.push(d, m / d);
  }
  return new Map([...found].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
}

// The sum of the divisors of n below n itself: σ(n) − n, with σ from the factors.
export function next(n, factors = factor(n)) {
  if (n <= 1n) return 0n;
  let sigma = 1n;
  for (const [p, e] of factors) sigma *= (p ** BigInt(e + 1) - 1n) / (p - 1n);
  return sigma - n;
}

// Follows n until it reaches 0 or repeats. Returns the terms, and for a repeat the step
// the loop starts at, or null if it ran out of steps or digits first.
export function follow(start, { maxSteps = Infinity, maxDigits = Infinity } = {}) {
  const terms = [BigInt(start)];
  const seen = new Map([[terms[0], 0]]);
  while (terms.length - 1 < maxSteps) {
    const n = next(terms.at(-1));
    if (n.toString().length > maxDigits) return { terms, end: null };
    terms.push(n);
    if (n === 0n) return { terms, end: 'zero' };
    if (seen.has(n)) return { terms, end: 'loop', loopStart: seen.get(n) };
    seen.set(n, terms.length - 1);
  }
  return { terms, end: null };
}

export function parseNumber(text) {
  const clean = text.trim().replace(/,/g, '');
  if (!/^\d{1,15}$/.test(clean)) return null;
  const n = BigInt(clean);
  return n >= 1n ? n : null;
}

// The five starts below 1,000 that nobody has followed to an end (the Lehmer five).
// Seven more below 1,000 run into one of them (OEIS A098007).
export const OPEN = [276n, 552n, 564n, 660n, 966n];
export const UNSOLVED = [276, 306, 396, 552, 564, 660, 696, 780, 828, 888, 966, 996];
export const ON_276 = [276, 306, 396, 696];
// As far as computers have taken 276: FactorDB, October 2026. The next step needs a
// 210-digit number factored.
export const RECORD = { steps: 2162, digits: 215, stuck: 210 };
// 840 climbs past what the page follows but comes back down (OEIS A098007).
export const FINISHED = { 840: 749 };
export const SURVEY = 1000; // starts in the grid
export const SURVEY_DIGITS = 25; // where the grid stops following; factoring stays quick below this

// Every start from 1 to limit, followed until it ends, loops or passes maxDigits. A start
// that passes maxDigits records which of the open five it ran into, if any, and where.
export function survey(limit = SURVEY, maxDigits = SURVEY_DIGITS) {
  const open = OPEN.map(start => follow(start, { maxDigits }).terms);
  const results = [];
  for (let n = 1; n <= limit; n++) {
    const { terms, end, loopStart } = follow(n, { maxDigits });
    let peak = 0n;
    let peakAt = 0;
    terms.forEach((t, i) => {
      if (t > peak) [peak, peakAt] = [t, i];
    });
    const result = { n, end, steps: terms.length - 1, peak, peakAt };
    if (end === 'loop') Object.assign(result, { loop: terms.slice(loopStart, -1), loopStart });
    if (!end) {
      for (const [i, path] of open.entries()) {
        const at = terms.findIndex(t => path.includes(t));
        if (at >= 0) {
          result.joins = { open: OPEN[i], at, into: path.indexOf(terms[at]) };
          break;
        }
      }
    }
    results.push(result);
  }
  return results;
}

// Bins for how many steps a start takes to reach 0.
export const EDGES = [5, 10, 20, 50, 100, Infinity];
export const binOf = steps => EDGES.findIndex(edge => steps <= edge);
