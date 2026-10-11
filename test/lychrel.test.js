import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMIT,
  isPalindrome,
  step,
  route,
  reverseAddInto,
  digitsPalindrome,
  stepsTable,
  parseNumber,
} from '../196/lychrel.js';

const sums = n => route(n).map(s => s.sum);

test('step adds the reverse column by column and keeps the carries', () => {
  assert.deepEqual(step('89'), { number: '89', reversed: '98', carries: [0, 1, 1], sum: '187' });
  assert.deepEqual(step('196'), { number: '196', reversed: '691', carries: [0, 0, 1], sum: '887' });
  assert.deepEqual(step('123'), { number: '123', reversed: '321', carries: [0, 0, 0], sum: '444' });
});

test('a trailing zero reverses into a leading zero', () => {
  assert.deepEqual(step('10'), { number: '10', reversed: '01', carries: [0, 0], sum: '11' });
});

test('route stops at the first palindrome', () => {
  assert.deepEqual(sums(57), ['132', '363']);
  assert.deepEqual(sums(196).slice(0, 3), ['887', '1675', '7436']);
  for (const n of [0, 7, 11, 121, 9999]) assert.deepEqual(route(n), []);
});

test('89 takes 24 steps to reach 8,813,200,023,188', () => {
  const steps = sums(89);
  assert.equal(steps.length, 24);
  assert.equal(steps.at(-1), '8813200023188');
  assert.ok(steps.slice(0, -1).every(s => !isPalindrome(s)));
});

test('route gives up after the cap', () => {
  assert.equal(route(196, 24).length, 24);
  assert.equal(route(196, 24).at(-1).sum, '1800098901007');
});

const table = stepsTable();

test('stepsTable agrees with route for every number below 10,000', () => {
  for (let n = 0; n < 10000; n++) {
    const steps = route(n, 25);
    const palindrome = steps.length === 0 || isPalindrome(steps.at(-1).sum);
    // Nothing needs 25 steps, so route's cap of 25 tells the two kinds apart.
    assert.equal(table[n], palindrome ? steps.length : -1, n);
  }
  const holdout = route(196);
  assert.equal(holdout.length, LIMIT);
  assert.ok(!isPalindrome(holdout.at(-1).sum));
});

test('below 10,000: 199 palindromes, at most 24 steps, and 246 holdouts after 1,000', () => {
  const counts = new Map();
  for (const steps of table) counts.set(steps, (counts.get(steps) ?? 0) + 1);
  assert.deepEqual(
    [...counts].sort(([a], [b]) => a - b),
    [
      [-1, 246], [0, 199], [1, 2789], [2, 2829], [3, 1341], [4, 896], [5, 415], [6, 399],
      [7, 244], [8, 57], [9, 63], [10, 12], [11, 49], [12, 110], [13, 67], [14, 3], [15, 82],
      [16, 58], [17, 13], [18, 27], [20, 26], [21, 64], [22, 2], [23, 7], [24, 2],
    ],
  );
  assert.equal(LIMIT, 1000);
  assert.deepEqual([...table.keys()].filter(n => table[n] === 24), [89, 98]);
  // "Most need one or two steps": 2,789 + 2,829 of 10,000.
  assert.ok(counts.get(1) + counts.get(2) > 5000);
});

test('a number below 10,000 with no palindrome by step 24 has none by step 1,000', () => {
  for (let n = 0; n < 10000; n++) {
    const steps = route(n, 24);
    if (steps.length === 24 && !isPalindrome(steps.at(-1).sum)) assert.equal(table[n], -1, n);
  }
});

test('196 is the smallest holdout, one of 13 below 1,000', () => {
  const holdouts = [...table.keys()].filter(n => table[n] === -1);
  assert.equal(holdouts[0], 196);
  assert.deepEqual(holdouts.filter(n => n < 1000), [196, 295, 394, 493, 592, 689, 691, 788, 790, 879, 887, 978, 986]);
});

test("887 is on 196's path, nine more land on it in one step, and 879 and 978 land on 1857, which it skips", () => {
  const path = new Set(['196', ...route(196, 50).map(s => s.sum)]);
  assert.equal(step('196').sum, '887');
  for (const n of [295, 394, 493, 592, 689, 691, 788, 790, 986]) assert.ok(path.has(step(String(n)).sum), n);
  assert.equal(step('295').sum, '887');
  assert.equal(step('879').sum, '1857');
  assert.equal(step('978').sum, '1857');
  // The path only climbs, and jumps from 1675 straight to 7436.
  assert.deepEqual(sums(196).slice(1, 3), ['1675', '7436']);
});

test('reverseAddInto matches step on 196 for 500 steps, and finds no palindrome', () => {
  let a = new Uint8Array(1024);
  let b = new Uint8Array(1024);
  a.set([6, 9, 1]);
  let length = 3;
  let text = '196';
  for (let i = 0; i < 500; i++) {
    length = reverseAddInto(a, length, b);
    [a, b] = [b, a];
    text = step(text).sum;
    assert.equal(Array.from(a.subarray(0, length)).reverse().join(''), text);
    assert.equal(digitsPalindrome(a, length), false);
  }
});

test('196 has 4,159 digits after 10,000 steps', () => {
  let a = new Uint8Array(8192);
  let b = new Uint8Array(8192);
  a.set([6, 9, 1]);
  let length = 3;
  for (let i = 0; i < 10000; i++) {
    length = reverseAddInto(a, length, b);
    [a, b] = [b, a];
  }
  assert.equal(length, 4159);
});

test('in base 2, 10110 (22) falls into the repeating pattern that proves it never reaches one', () => {
  let n = 0b10110n;
  const reverse = x => BigInt('0b' + [...x.toString(2)].reverse().join(''));
  assert.equal((n + reverse(n)).toString(2), '100011');
  for (let i = 1; i <= 400; i++) {
    n += reverse(n);
    assert.ok(!isPalindrome(n.toString(2)));
    // Every fourth step it reads 10, k + 1 ones, 01, k + 1 zeros.
    if (i % 4 === 0) {
      const k = i / 4;
      assert.equal(n.toString(2), `10${'1'.repeat(k + 1)}01${'0'.repeat(k + 1)}`);
    }
  }
});

test('parseNumber accepts one to four digits', () => {
  assert.equal(parseNumber('196'), 196);
  assert.equal(parseNumber(' 0089 '), 89);
  assert.equal(parseNumber('0'), 0);
  for (const input of ['', '12345', '19a', '-1', '1.5']) assert.equal(parseNumber(input), null);
});
