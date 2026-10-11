import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMIT, sieve, primesOf, pairs, countPairs, countsTable, parseNumber } from '../goldbach/goldbach.js';

const isPrime = sieve();
const counts = countsTable(isPrime);
const evens = [];
for (let n = 4; n <= LIMIT; n += 2) evens.push(n);

test('the sieve finds the primes', () => {
  assert.deepEqual(primesOf(sieve(30)), [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  assert.equal(primesOf(isPrime).length, 9592);
});

test('pairs lists the smaller prime of every way', () => {
  assert.deepEqual(pairs(4, isPrime), [2]);
  assert.deepEqual(pairs(28, isPrime), [5, 11]);
  assert.deepEqual(pairs(100, isPrime), [3, 11, 17, 29, 41, 47]);
});

test('an odd number can only use the even prime 2', () => {
  assert.deepEqual(pairs(99, isPrime), [2]);
  assert.deepEqual(pairs(5, isPrime), [2]);
  assert.deepEqual(pairs(27, isPrime), []);
  assert.deepEqual(pairs(2, isPrime), []);
  assert.deepEqual(pairs(3, isPrime), []);
});

test('countPairs agrees with pairs', () => {
  const primes = primesOf(isPrime);
  for (const n of [4, 6, 28, 100, 210, 9998, 30030, 99330, LIMIT]) assert.equal(countPairs(n, primes, isPrime), pairs(n, isPrime).length, n);
});

test('all 49,999 even numbers from 4 to 100,000 are sums of two primes', () => {
  assert.equal(evens.length, 49999);
  assert.ok(evens.every(n => counts[n] > 0));
});

test('4, 6, 8 and 12 have one way each, and 68 is the last with two or fewer', () => {
  assert.deepEqual(evens.filter(n => counts[n] === 1), [4, 6, 8, 12]);
  assert.equal(evens.filter(n => counts[n] <= 2).at(-1), 68);
});

test('99,330 has the most ways below 100,000: 2,168', () => {
  const most = Math.max(...evens.map(n => counts[n]));
  assert.equal(most, 2168);
  assert.deepEqual(evens.filter(n => counts[n] === most), [99330]);
});

// Average ways for even multiples of p over the rest, from 50,000 to 100,000.
function ratio(p) {
  const upper = evens.filter(n => n >= 50000);
  const mean = list => list.reduce((sum, n) => sum + counts[n], 0) / list.length;
  return mean(upper.filter(n => n % p === 0)) / mean(upper.filter(n => n % p !== 0));
}

test('multiples of 3 have twice as many ways, 5 a third more, 7 a fifth more', () => {
  assert.ok(Math.abs(ratio(3) - 2) < 0.02, ratio(3));
  assert.ok(Math.abs(ratio(5) - 4 / 3) < 0.02, ratio(5));
  assert.ok(Math.abs(ratio(7) - 6 / 5) < 0.02, ratio(7));
});

test('about half the primes above 3 are one more than a multiple of 3, half one less', () => {
  const above3 = primesOf(isPrime).filter(p => p > 3);
  const oneMore = above3.filter(p => p % 3 === 1).length;
  const oneLess = above3.filter(p => p % 3 === 2).length;
  assert.equal(oneMore + oneLess, above3.length);
  assert.deepEqual([oneMore, oneLess], [4784, 4806]);
});

test('parseNumber accepts 2 to 100,000', () => {
  assert.equal(parseNumber('28'), 28);
  assert.equal(parseNumber(' 100,000 '), 100000);
  assert.equal(parseNumber('2'), 2);
  for (const input of ['', '1', '0', '100001', '12a', '-4', '4.5', '1234567']) assert.equal(parseNumber(input), null);
});
