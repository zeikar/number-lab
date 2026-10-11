// Goldbach: write a number as a sum of two primes, p + q with p ≤ q, every way it can be done.

export const LIMIT = 100000;

// isPrime[k] is 1 when k is prime, for 0 ≤ k ≤ limit.
export function sieve(limit = LIMIT) {
  const isPrime = new Uint8Array(limit + 1).fill(1);
  isPrime[0] = isPrime[1] = 0;
  for (let i = 2; i * i <= limit; i++) {
    if (isPrime[i]) for (let j = i * i; j <= limit; j += i) isPrime[j] = 0;
  }
  return isPrime;
}

export const primesOf = isPrime => isPrime.reduce((list, flag, k) => (flag ? (list.push(k), list) : list), []);

// The smaller prime of every pair, so n = p + (n - p).
export function pairs(n, isPrime) {
  const found = [];
  for (let p = 2; p <= n - p; p++) if (isPrime[p] && isPrime[n - p]) found.push(p);
  return found;
}

// The number of pairs for n, counted over a list of primes; quicker than pairs() for big n.
export function countPairs(n, primes, isPrime) {
  let count = 0;
  for (const p of primes) {
    if (p > n - p) break;
    count += isPrime[n - p];
  }
  return count;
}

// Pairs for every even number up to limit; odd entries stay 0.
export function countsTable(isPrime, limit = LIMIT) {
  const primes = primesOf(isPrime);
  const counts = new Uint16Array(limit + 1);
  for (let n = 4; n <= limit; n += 2) counts[n] = countPairs(n, primes, isPrime);
  return counts;
}

// Parses a typed whole number from 2 to LIMIT, or null.
export function parseNumber(text) {
  const trimmed = text.trim().replace(/,/g, '');
  if (!/^\d{1,6}$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= 2 && n <= LIMIT ? n : null;
}
