import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrime, PROVEN_BELOW, RANDOM_BASES, factor, next, follow, survey, binOf, EDGES, OPEN, UNSOLVED, ON_276, parseNumber } from '../aliquot/aliquot.js';

const big = list => list.map(BigInt);

test('factor splits numbers with big prime factors', () => {
  const show = n => [...factor(n)].map(([p, e]) => `${p}^${e}`).join(' ');
  assert.equal(show(276n), '2^2 3^1 23^1');
  // Cole, 1903: 2^67 − 1 = 193,707,721 × 761,838,257,287.
  assert.equal(show(2n ** 67n - 1n), '193707721^1 761838257287^1');
  assert.equal(show(2n ** 64n + 1n), '274177^1 67280421310721^1');
  assert.equal(show(1000000007n * 998244353n * 1000000009n), '998244353^1 1000000007^1 1000000009^1');
  assert.equal(isPrime(561n), false); // a Carmichael number
  assert.equal(isPrime(2n ** 61n - 1n), true);
});

// ψ13, the smallest composite that passes Miller–Rabin for every prime base up to 41
// (OEIS A014233), and a 25-digit number, so it's inside the grid's range.
test('isPrime catches 3,317,044,064,679,887,385,961,981, which fools the primes to 41', () => {
  const psi13 = 3_317_044_064_679_887_385_961_981n;
  const powMod = (b, e, m) => {
    let r = 1n;
    for (b %= m; e; e >>= 1n, b = (b * b) % m) if (e & 1n) r = (r * b) % m;
    return r;
  };
  const passes = a => {
    let d = psi13 - 1n;
    let s = 0;
    for (; !(d & 1n); s++) d >>= 1n;
    let x = powMod(a, d, psi13);
    for (let i = 0; i < s; i++, x = (x * x) % psi13) if (x === psi13 - 1n || (i === 0 && x === 1n)) return true;
    return false;
  };
  assert.ok(big([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41]).every(passes));
  assert.equal(PROVEN_BELOW, psi13);
  assert.equal(isPrime(psi13), false);
  // From there up, 20 random rounds: each lets a composite through at most a quarter of the time.
  assert.equal(RANDOM_BASES, 20);
  assert.ok(0.25 ** RANDOM_BASES < 1e-12);
  assert.deepEqual([...factor(psi13)], [[1287836182261n, 1], [2575672364521n, 1]]);
  // Primes past it still come out prime.
  assert.equal(isPrime(2n ** 89n - 1n), true);
  assert.equal(isPrime(2n ** 127n - 1n), true);
});

test('next adds up the divisors below n', () => {
  assert.deepEqual(big([1, 2, 6, 12, 28, 220, 284]).map(n => next(n)), big([0, 1, 6, 16, 28, 284, 220]));
});

test('12 reaches 0 in 7 steps, through the prime 3', () => {
  assert.deepEqual(follow(12), { terms: big([12, 16, 15, 9, 4, 3, 1, 0]), end: 'zero' });
});

test('95 lands on the perfect number 6 after 2 steps', () => {
  assert.deepEqual(follow(95), { terms: big([95, 25, 6, 6]), end: 'loop', loopStart: 2 });
});

test('the two smallest amicable pairs are 220 and 284, and 1,184 and 1,210', () => {
  const pairs = [];
  for (let a = 2n; pairs.length < 2; a++) {
    const b = next(a);
    if (b > a && next(b) === a) pairs.push([a, b]);
  }
  assert.deepEqual(pairs, [[220n, 284n], [1184n, 1210n]]);
});

test('12,496 goes round a loop of 5, and 14,316 a loop of 28', () => {
  assert.deepEqual(follow(12496).terms, big([12496, 14288, 15472, 14536, 14264, 12496]));
  const long = follow(14316);
  assert.equal(long.terms.length - 1 - long.loopStart, 28);
  assert.equal(long.loopStart, 0);
});

test('138 climbs to 179,931,895,322 at step 117 and reaches 0 after 178 steps', () => {
  const { terms, end } = follow(138);
  assert.equal(end, 'zero');
  assert.equal(terms.length - 1, 178);
  const peak = terms.reduce((a, b) => (b > a ? b : a));
  assert.equal(peak, 179_931_895_322n);
  assert.equal(terms.indexOf(peak), 117);
});

test("276's sequence starts as OEIS A008892 does", () => {
  assert.deepEqual(follow(276, { maxSteps: 12 }).terms, big([276, 396, 696, 1104, 1872, 3770, 3790, 3050, 2716, 2772, 5964, 10164, 19628]));
});

// The bound is exact: a composite m with s(m) = n has a prime factor p ≤ √m, so
// n ≥ 1 + m/p ≥ 1 + √m, and m ≤ (n − 1)²; a prime m gives 1.
test('nothing leads to 276: it is one of the untouchable numbers 2, 5, 52, 88, 96, …', () => {
  const N = 275 ** 2;
  const s = new Float64Array(N + 1);
  for (let d = 1; d <= N / 2; d++) for (let m = 2 * d; m <= N; m += d) s[m] += d;
  const reached = new Set(s);
  const untouchable = [];
  for (let n = 2; n <= 276; n++) if (!reached.has(n)) untouchable.push(n);
  assert.deepEqual(untouchable.slice(0, 5), [2, 5, 52, 88, 96]);
  assert.equal(untouchable.at(-1), 276);
});

const results = survey();

test('from 1 to 1,000: 965 reach 0, 22 fall into a loop, 13 pass 25 digits', () => {
  const count = end => results.filter(r => r.end === end).length;
  assert.deepEqual([count('zero'), count('loop'), count(null)], [965, 22, 13]);
  assert.deepEqual(
    results.filter(r => !r.end).map(r => r.n),
    [276, 306, 396, 552, 564, 660, 696, 780, 828, 840, 888, 966, 996],
  );
});

test('the loops below 1,000 are 6, 28, 496 and the pair 220 and 284', () => {
  const loops = new Map();
  for (const r of results.filter(r => r.end === 'loop')) {
    const key = [...r.loop].sort((a, b) => (a < b ? -1 : 1)).join('/');
    loops.set(key, (loops.get(key) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(loops), { 6: 13, 28: 1, '220/284': 3, 496: 5 });
});

test('OEIS: seven more starts below 1,000 run into the open five', () => {
  const joins = Object.fromEntries(results.filter(r => !r.end && r.joins).map(r => [r.n, Number(r.joins.open)]));
  assert.deepEqual(joins, { 276: 276, 306: 276, 396: 276, 552: 552, 564: 564, 660: 660, 696: 276, 780: 564, 828: 660, 888: 552, 966: 966, 996: 660 });
  assert.deepEqual(OPEN, big([276, 552, 564, 660, 966]));
  assert.deepEqual(UNSOLVED, Object.keys(joins).map(Number));
  assert.deepEqual(ON_276, UNSOLVED.filter(n => joins[n] === 276));
  // 840 runs into none of them; it climbs past 25 digits and comes back down (FactorDB: 0 after 748 steps).
  assert.equal(results[839].joins, undefined);
});

test('steps to 0: 447, 242, 209, 43, 7 and 17 per bin, the longest 702 with 301', () => {
  const bins = EDGES.map(() => 0);
  for (const r of results.filter(r => r.end === 'zero')) bins[binOf(r.steps)]++;
  assert.deepEqual(bins, [447, 242, 209, 43, 7, 17]);
  const longest = results.filter(r => r.end === 'zero').reduce((a, b) => (b.steps > a.steps ? b : a));
  assert.deepEqual([longest.n, longest.steps], [702, 301]);
});

test('parseNumber accepts up to 15 digits', () => {
  assert.equal(parseNumber('276'), 276n);
  assert.equal(parseNumber('12,496'), 12496n);
  for (const input of ['', '0', '-1', '1.5', 'x', '1000000000000000']) assert.equal(parseNumber(input), null);
});
