import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHI, GOLDEN, MIN_SEEDS, MAX_SEEDS, TURN_STEP, place, neighbours, convergents, parseTurn, isGolden } from '../sunflower/sunflower.js';

test('the golden turn is 0.618034 of a turn, and the golden angle is 137.5°', () => {
  assert.equal(GOLDEN.toFixed(6), '0.618034');
  assert.equal((360 * (1 - GOLDEN)).toFixed(1), '137.5');
  assert.ok(Math.abs(1 / PHI - GOLDEN) < 1e-15);
});

test('seed n sits at radius √n', () => {
  const { xs, ys } = place(GOLDEN, 100);
  for (const n of [1, 4, 50, 100]) assert.ok(Math.abs(Math.hypot(xs[n], ys[n]) - Math.sqrt(n)) < 1e-12);
});

test('a simple fraction p/q makes q arms', () => {
  assert.deepEqual(neighbours(1 / 2, 1000).arms, [2]);
  assert.deepEqual(neighbours(1 / 3, 1000).arms, [3]);
  assert.deepEqual(neighbours(2 / 5, 1000).arms, [5]);
});

test("π's turn makes 7 arms with 300 seeds and 113 with 3,000", () => {
  assert.deepEqual(neighbours(Math.PI - 3, 300).arms, [7]);
  assert.deepEqual(neighbours(Math.PI - 3, 3000).arms, [113]);
});

test('the golden head shows Fibonacci arms: 55 and 89 at the edge of 1,000 seeds', () => {
  assert.deepEqual(neighbours(GOLDEN, 1000).arms, [55, 89]);
});

test('the golden turn keeps its closest gap at 88% of a honeycomb for every seed count the slider allows', () => {
  const gaps = new Set();
  for (let count = MIN_SEEDS; count <= MAX_SEEDS; count += 50) gaps.add(neighbours(GOLDEN, count).gap.toFixed(6));
  assert.equal(gaps.size, 1);
  assert.equal(neighbours(GOLDEN, MIN_SEEDS).gap.toFixed(2), '0.88');
});

test('0.618 is 309/500, closer to 55/89 than the golden turn, and its 89 arms open gaps by 3,000 seeds', () => {
  assert.ok(Math.abs(0.618 - 55 / 89) < Math.abs(GOLDEN - 55 / 89));
  assert.equal(neighbours(0.618, 500).gap.toFixed(2), '0.84');
  assert.equal(neighbours(0.618, 3000).gap.toFixed(2), '0.56');
  assert.deepEqual(neighbours(0.618, 3000).arms, [89]);
});

// Adding seeds never moves the ones already down, so a turn's closest gap can only shrink
// as the count grows, while the golden turn's stays put (above). Beating it at the fewest
// seeds is the only chance, and a turn t packs exactly like 1 - t, its mirror image.
test('no setting of the turn slider packs the seeds as well as the golden turn', () => {
  const golden = neighbours(GOLDEN, MIN_SEEDS).gap;
  let best = 0;
  for (let k = 0; k * TURN_STEP <= 0.5; k++) best = Math.max(best, neighbours(k * TURN_STEP, MIN_SEEDS).gap);
  assert.ok(best < golden, `${best} vs ${golden}`);
  for (const t of [0.1234, 0.3, 0.4142]) assert.ok(Math.abs(neighbours(t, 500).gap - neighbours(1 - t, 500).gap) < 1e-9);
});

test('convergents: Fibonacci ratios for the golden turn, 1/7 then 16/113 for π', () => {
  assert.deepEqual(convergents(GOLDEN, 100), [[1, 1], [1, 2], [2, 3], [3, 5], [5, 8], [8, 13], [13, 21], [21, 34], [34, 55], [55, 89]]);
  assert.deepEqual(convergents(Math.PI - 3, 1000), [[1, 7], [15, 106], [16, 113]]);
  assert.deepEqual(convergents(0.4, 1000), [[1, 2], [2, 5]]);
  assert.deepEqual(convergents(0.618, 1000), [[1, 1], [1, 2], [2, 3], [3, 5], [5, 8], [8, 13], [13, 21], [21, 34], [34, 55], [55, 89], [309, 500]]);
});

test('parseTurn keeps the part after whole turns', () => {
  assert.deepEqual(parseTurn('0.618'), { turn: 0.618, label: '0.618' });
  assert.deepEqual(parseTurn('2/5'), { turn: 0.4, label: '2/5' });
  assert.equal(parseTurn('pi').label, 'π');
  assert.ok(Math.abs(parseTurn('π').turn - (Math.PI - 3)) < 1e-15);
  assert.ok(isGolden(parseTurn('phi').turn));
  assert.ok(Math.abs(parseTurn('√2').turn - (Math.SQRT2 - 1)) < 1e-15);
  assert.equal(parseTurn('sqrt(2)').label, '√2');
  assert.equal(parseTurn('sqrt(2'), null);
  for (const input of ['', 'abc', '1/0', '-1', '2/']) assert.equal(parseTurn(input), null);
});

test('isGolden accepts the golden turn either way round', () => {
  assert.ok(isGolden(GOLDEN));
  assert.ok(isGolden(1 - GOLDEN));
  assert.ok(!isGolden(0.618));
  assert.ok(!isGolden(0.61803));
});
