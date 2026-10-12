import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WALK_STEPS, GRID, MAX_REACHED, createWalker, terms, firstStep, parseNumber } from '../recaman/recaman.js';
import { EDGES, binOf } from '../recaman/gaps.js';

test('the sequence starts 0, 1, 3, 6, 2, 7, 13, 20, 12, 21, 11', () => {
  assert.deepEqual(terms(10), [0, 1, 3, 6, 2, 7, 13, 20, 12, 21, 11]);
});

test('42 is the first number it lands on twice, at steps 20 and 24', () => {
  const list = terms(30);
  const seen = new Map();
  let repeat = null;
  for (const [n, v] of list.entries()) {
    if (seen.has(v) && !repeat) repeat = [v, seen.get(v), n];
    if (!seen.has(v)) seen.set(v, n);
  }
  assert.deepEqual(repeat, [42, 20, 24]);
});

test('first landings: 42 at step 20, 19 at 99,734, 61 at 181,653, 879 at 328,002', () => {
  assert.equal(firstStep(42), 20);
  assert.equal(firstStep(19), 99734);
  assert.equal(firstStep(61), 181653);
  assert.equal(firstStep(879), 328002);
  assert.equal(firstStep(0), 0);
});

// The walk the page runs: every number below 2,000 that it lands on in 10 million steps,
// how long each took, and the smallest number still waiting at each point.
const firsts = new Int32Array(GRID).fill(-1);
firsts[0] = 0;
const records = [];
let highest = 0;
{
  const walker = createWalker();
  let smallest = 1;
  while (walker.n < WALK_STEPS) {
    walker.step();
    highest = Math.max(highest, walker.value);
    if (walker.value < GRID && firsts[walker.value] < 0) firsts[walker.value] = walker.n;
    if (walker.value === smallest) {
      while (walker.has(smallest)) smallest++;
      records.push([walker.n, smallest]);
    }
  }
}

test('the smallest number still missing goes 2, 4, 19, 61, 879, 1,355, then sticks for 10 million steps', () => {
  assert.deepEqual(records, [[1, 2], [4, 4], [131, 19], [99734, 61], [181653, 879], [328002, 1355]]);
});

test('after 10 million steps, 1,355, 1,643 and 1,814 are the only numbers below 2,000 still missing', () => {
  assert.deepEqual([...firsts.keys()].filter(v => firsts[v] < 0), [1355, 1643, 1814]);
});

test('below 2,000, landings by number of steps: 11, 81, 662, 1,079, 159 and 5 per power of ten', () => {
  const bins = EDGES.map(() => 0);
  for (const step of firsts) if (step >= 0) bins[binOf(step)]++;
  assert.deepEqual(bins, [11, 81, 662, 1079, 159, 5]);
});

test('the walk never goes past 61,998,984 in 10 million steps, so bigger numbers need no search', () => {
  assert.equal(highest, MAX_REACHED);
});

test('parseNumber accepts up to nine digits', () => {
  assert.equal(parseNumber('42'), 42);
  assert.equal(parseNumber(' 852,655 '), 852655);
  assert.equal(parseNumber('0'), 0);
  for (const input of ['', '-1', '1.5', 'x', '1234567890']) assert.equal(parseNumber(input), null);
});
