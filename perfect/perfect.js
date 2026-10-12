// Perfect numbers and Mersenne primes: divisor sums for the machine, and the Lucas–Lehmer
// test for the hunt. No DOM here, so the tests can import it.

// Trial division up to a million keeps every lookup instant.
export const MAX = 999_999_999_999;

// The divisors of n below n itself, biggest first.
export function divisors(n) {
  const small = [];
  const large = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d) continue;
    small.push(d);
    if (d * d !== n) large.push(n / d);
  }
  return [...large, ...small.reverse()].slice(1);
}

export function classify(n) {
  const parts = divisors(n);
  const sum = parts.reduce((a, b) => a + b, 0);
  return { parts, sum, kind: sum === n ? 'perfect' : sum > n ? 'abundant' : 'deficient' };
}

export function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

// Euclid: when 2^p − 1 is prime, 2^(p−1) × (2^p − 1) is perfect.
export const euclid = p => (1n << BigInt(p - 1)) * ((1n << BigInt(p)) - 1n);

// The p with n = 2^(p−1) × (2^p − 1), or null. Within MAX that's p up to 20.
export function euclidExponent(n) {
  for (let p = 2; p <= 20; p++) if (euclid(p) === BigInt(n)) return p;
  return null;
}

// Lucas–Lehmer: start at 4 and square and subtract 2, p − 2 times, keeping the remainder
// mod 2^p − 1. For odd prime p, 2^p − 1 is prime exactly when that ends at 0.
export function lucasLehmer(p) {
  if (p === 2) return true;
  const P = BigInt(p);
  const M = (1n << P) - 1n;
  let s = 4n;
  for (let i = 0; i < p - 2; i++) {
    s = s * s - 2n;
    // x mod 2^p − 1 by folding: the high bits wrap round onto the low ones.
    s = (s & M) + (s >> P);
    if (s >= M) s -= M;
  }
  return s === 0n;
}

// 2^p is never a power of 10, so 2^p − 1 has as many digits as 2^p.
export const mersenneDigits = p => Math.floor(p * Math.log10(2)) + 1;

// The Mersenne primes a browser can reach, and the one GIMPS records as first finding each,
// from mersenne.org/primes.
export const HISTORY = [
  [2, 'c. 500 BCE', 'Known to ancient Greek mathematicians'],
  [3, 'c. 500 BCE', 'Known to ancient Greek mathematicians'],
  [5, 'c. 275 BCE', 'Known to ancient Greek mathematicians'],
  [7, 'c. 275 BCE', 'Known to ancient Greek mathematicians'],
  [13, '1456', 'First recorded in 1456, by an unknown writer'],
  [17, '1588', 'Found by Pietro Cataldi in 1588'],
  [19, '1588', 'Found by Pietro Cataldi in 1588'],
  [31, '1772', 'Found by Leonhard Euler in 1772'],
  [61, '1883', 'Found by Ivan Pervushin in 1883'],
  [89, '1911', 'Found by R. E. Powers in 1911'],
  [107, '1914', 'Found by R. E. Powers in 1914'],
  [127, '1876', 'Found by Édouard Lucas in 1876'],
  [521, '1952', 'Found by Raphael Robinson on the SWAC computer in 1952'],
  [607, '1952', 'Found by Raphael Robinson on the SWAC computer in 1952'],
  [1279, '1952', 'Found by Raphael Robinson on the SWAC computer in 1952'],
  [2203, '1952', 'Found by Raphael Robinson on the SWAC computer in 1952'],
  [2281, '1952', 'Found by Raphael Robinson on the SWAC computer in 1952'],
  [3217, '1957', 'Found by Hans Riesel on the BESK computer in 1957'],
  [4253, '1961', 'Found by Alexander Hurwitz on an IBM 7090 in 1961'],
  [4423, '1961', 'Found by Alexander Hurwitz on an IBM 7090 in 1961'],
  [9689, '1963', 'Found by Donald Gillies on ILLIAC II in 1963'],
  [9941, '1963', 'Found by Donald Gillies on ILLIAC II in 1963'],
  [11213, '1963', 'Found by Donald Gillies on ILLIAC II in 1963'],
  [19937, '1971', 'Found by Bryant Tuckerman on an IBM 360/91 in 1971'],
  [21701, '1978', 'Found by Landon Curt Noll and Laura Nickel on a CDC Cyber 174 in 1978'],
  [23209, '1979', 'Found by Landon Curt Noll on a CDC Cyber 174 in 1979'],
  [44497, '1979', 'Found by Harry Nelson and David Slowinski on a Cray-1 in 1979'],
];

// GIMPS, 12 October 2024: the 52nd Mersenne prime known, and the largest known prime.
export const RECORD = { p: 136_279_841, rank: 52 };

export function parseNumber(text) {
  const clean = text.trim().replace(/,/g, '');
  if (!/^\d{1,12}$/.test(clean)) return null;
  const n = Number(clean);
  return n >= 1 ? n : null;
}
