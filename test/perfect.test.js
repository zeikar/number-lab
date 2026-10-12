import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX, divisors, classify, isPrime, euclid, euclidExponent, lucasLehmer, mersenneDigits, HISTORY, RECORD, parseNumber } from '../perfect/perfect.js';
import { clock } from '../perfect/hunt.js';

test('divisors below n, biggest first', () => {
  assert.deepEqual(divisors(28), [14, 7, 4, 2, 1]);
  assert.deepEqual(divisors(36), [18, 12, 9, 6, 4, 3, 2, 1]);
  assert.deepEqual(divisors(13), [1]);
  assert.deepEqual(divisors(1), []);
});

test('28 is perfect, 12 abundant by 4, 10 deficient by 2, and 1 adds up to 0', () => {
  assert.deepEqual(classify(28), { parts: [14, 7, 4, 2, 1], sum: 28, kind: 'perfect' });
  assert.deepEqual(classify(12), { parts: [6, 4, 3, 2, 1], sum: 16, kind: 'abundant' });
  assert.deepEqual(classify(10), { parts: [5, 2, 1], sum: 8, kind: 'deficient' });
  assert.deepEqual(classify(1), { parts: [], sum: 0, kind: 'deficient' });
});

test('6, 28, 496 and 8128 are the only perfect numbers below 10,000', () => {
  const perfect = [];
  for (let n = 1; n < 10_000; n++) if (classify(n).kind === 'perfect') perfect.push(n);
  assert.deepEqual(perfect, [6, 28, 496, 8128]);
});

// Euler: every even perfect number is Euclid's. Ochem and Rao: an odd one would be above 10^1500.
test('seven perfect numbers fit in the machine, from p = 2, 3, 5, 7, 13, 17 and 19', () => {
  const fits = [];
  for (let p = 2; euclid(p) <= BigInt(MAX); p++) if (isPrime(p) && lucasLehmer(p)) fits.push(p);
  assert.deepEqual(fits, [2, 3, 5, 7, 13, 17, 19]);
  const numbers = fits.map(p => Number(euclid(p)));
  assert.deepEqual(numbers, [6, 28, 496, 8128, 33_550_336, 8_589_869_056, 137_438_691_328]);
  for (const [i, n] of numbers.entries()) {
    assert.equal(classify(n).kind, 'perfect');
    assert.equal(euclidExponent(n), fits[i]);
    // In binary: p ones, then p − 1 zeros.
    assert.equal(n.toString(2), '1'.repeat(fits[i]) + '0'.repeat(fits[i] - 1));
  }
  assert.ok(euclid(23) > BigInt(MAX));
  assert.equal(euclidExponent(12), null);
});

test('945 is the smallest odd abundant number', () => {
  for (let n = 1; n < 945; n += 2) assert.notEqual(classify(n).kind, 'abundant');
  assert.equal(classify(945).sum, 975);
  assert.equal(classify(945).kind, 'abundant');
});

test('every power of 2 falls short by exactly 1', () => {
  for (let k = 0; 2 ** k <= MAX; k++) assert.equal(classify(2 ** k).sum, 2 ** k - 1);
});

test('Lucas–Lehmer agrees with trial division up to 2^31 − 1, and 2^11 − 1 = 23 × 89', () => {
  for (let p = 2; p <= 31; p++) if (isPrime(p)) assert.equal(lucasLehmer(p), isPrime(2 ** p - 1), `p = ${p}`);
  assert.equal(2 ** 11 - 1, 23 * 89);
  assert.equal(lucasLehmer(11), false);
});

test("Mersenne's 1644 list was wrong about 67 and 257, and missed 61, 89 and 107", () => {
  for (const p of [67, 257]) assert.equal(lucasLehmer(p), false);
  for (const p of [61, 89, 107]) assert.equal(lucasLehmer(p), true);
});

test("Euclid's first three: 2 × 3 = 6, 4 × 7 = 28, 16 × 31 = 496", () => {
  assert.deepEqual([2, 3, 5].map(euclid), [6n, 28n, 496n]);
});

test('a hunt over every prime p below 4,500 finds the first 20 Mersenne primes', () => {
  const found = [];
  for (let p = 2; p < 4500; p++) if (isPrime(p) && lucasLehmer(p)) found.push(p);
  assert.deepEqual(found, HISTORY.slice(0, 20).map(([p]) => p));
});

// The rest of the history takes seconds each, so it rests on GIMPS and the digit counts below.
test('the 21st to 23rd pass, and the primes either side of them fail', () => {
  const nextPrime = (p, step) => {
    do p += step;
    while (!isPrime(p));
    return p;
  };
  for (const [p] of HISTORY.slice(20, 23)) {
    assert.ok(lucasLehmer(p), `p = ${p}`);
    for (const q of [nextPrime(p, -1), nextPrime(p, 1)]) assert.equal(lucasLehmer(q), q === 9689 || q === 9941, `p = ${q}`);
  }
});

test('digit counts match GIMPS, up to the record with 41,024,320 digits', () => {
  const gimps = [1, 1, 2, 3, 4, 6, 6, 10, 19, 27, 33, 39, 157, 183, 386, 664, 687, 969, 1281, 1332, 2917, 2993, 3376, 6002, 6533, 6987, 13395];
  assert.deepEqual(HISTORY.map(([p]) => mersenneDigits(p)), gimps);
  for (const [p] of HISTORY) assert.equal(((1n << BigInt(p)) - 1n).toString().length, mersenneDigits(p));
  assert.equal(mersenneDigits(RECORD.p), 41_024_320);
});

test('parseNumber accepts 1 to 999,999,999,999', () => {
  assert.equal(parseNumber('28'), 28);
  assert.equal(parseNumber(' 8,128 '), 8128);
  assert.equal(parseNumber('999,999,999,999'), MAX);
  for (const input of ['', '0', '-6', '1.5', 'x', '1000000000000']) assert.equal(parseNumber(input), null);
});

test('the hunt clock rounds before it picks a unit', () => {
  assert.deepEqual([28.4, 999.6, 1340, 59_960, 125_000].map(clock), ['28 ms', '1.0 s', '1.3 s', '1 min 00 s', '2 min 05 s']);
});
