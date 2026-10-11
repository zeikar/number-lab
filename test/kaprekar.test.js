import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pad, step, route, roundsTable, nextTable, parseDigits } from '../6174/kaprekar.js';

test('pad keeps four digits', () => {
  assert.equal(pad(21), '0021');
  assert.equal(pad(6174), '6174');
});

test('step subtracts the digits smallest first from the digits largest first', () => {
  assert.deepEqual(step(3524), { big: 5432, small: 2345, next: 3087 });
  assert.deepEqual(step(6174), { big: 7641, small: 1467, next: 6174 });
});

test('leading zeros count as digits', () => {
  assert.deepEqual(step(2111), { big: 2111, small: 1112, next: 999 });
  assert.deepEqual(route(2111).map(r => r.next), [999, 8991, 8082, 8532, 6174]);
});

test('route stops at 6174', () => {
  assert.deepEqual(route(3524).map(r => r.next), [3087, 8352, 6174]);
  assert.deepEqual(route(6174), []);
});

test('repdigits fall to 0000 in one round', () => {
  assert.deepEqual(route(7777), [{ big: 7777, small: 7777, next: 0 }]);
  assert.deepEqual(route(0), [{ big: 0, small: 0, next: 0 }]);
});

test('every number reaches 6174 within seven rounds, except the ten repdigits', () => {
  const counts = new Map();
  for (const rounds of roundsTable()) counts.set(rounds, (counts.get(rounds) ?? 0) + 1);
  assert.deepEqual(
    [...counts].sort(([a], [b]) => a - b),
    [[-1, 10], [0, 1], [1, 383], [2, 576], [3, 2400], [4, 1272], [5, 1518], [6, 1656], [7, 2184]],
  );
});

test('one round squeezes all 10,000 numbers onto 55 values, then down to two', () => {
  const next = nextTable();
  let values = Array.from(next.keys());
  const distinct = [];
  for (let round = 0; round < 7; round++) {
    values = values.map(v => next[v]);
    distinct.push(new Set(values).size);
  }
  assert.deepEqual(distinct, [55, 21, 15, 11, 8, 5, 2]);
});

test('parseDigits accepts one to four digits', () => {
  assert.equal(parseDigits('3524'), 3524);
  assert.equal(parseDigits(' 21 '), 21);
  assert.equal(parseDigits('0000'), 0);
  for (const input of ['', '12345', '12a4', '-1', '1.5']) assert.equal(parseDigits(input), null);
});
