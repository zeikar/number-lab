import { KAPREKAR, pad, step, route, roundsTable, nextTable, parseDigits } from './kaprekar.js';
import { createMap } from './map.js';

const SORT_MS = 520;
const PRINT_MS = 420;
const HOLD_MS = 380;
const LIFT_MS = 480;

const $ = id => document.getElementById(id);
const form = $('entry');
const input = $('digits');
const hint = $('hint');
const verdict = $('verdict');
const works = $('works');
const tape = $('tape');
const tapeSlot = $('tape-slot');
const runAllButton = $('run-all');
const collapseStatus = $('collapse-status');
const rows = Object.fromEntries([...works.querySelectorAll('.row')].map(row => [row.dataset.row, row]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const HINT = hint.textContent;
const COLLAPSE_IDLE = collapseStatus.textContent;

const rounds = roundsTable();
const next = nextTable();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Digit tiles. Each row keeps four tiles; --slot is where a tile sits, so sorting
// only changes slots and the CSS transition slides the tiles into place.

for (const row of Object.values(rows)) {
  for (let i = 0; i < 4; i++) {
    const tile = document.createElement('span');
    tile.className = 'tile';
    row.append(tile);
  }
}

const tilesOf = row => [...row.querySelectorAll('.tile')];

function setRow(row, n, { hidden = false } = {}) {
  works.classList.add('is-still');
  pad(n).split('').forEach((digit, i) => {
    const tile = tilesOf(row)[i];
    tile.textContent = digit;
    tile.style.setProperty('--slot', i);
    tile.style.opacity = hidden ? 0 : 1;
    tile.classList.toggle('is-kaprekar', row === rows.next && n === KAPREKAR);
  });
  works.offsetWidth; // apply the jump before transitions come back
  works.classList.remove('is-still');
}

function sortRow(row, direction) {
  const tiles = tilesOf(row);
  const order = tiles
    .map((tile, i) => ({ tile, i, digit: Number(tile.textContent) }))
    .sort((a, b) => (direction === 'down' ? b.digit - a.digit : a.digit - b.digit) || a.i - b.i);
  order.forEach(({ tile }, slot) => tile.style.setProperty('--slot', slot));
}

function printRow(n) {
  setRow(rows.next, n, { hidden: true });
  tilesOf(rows.next).forEach((tile, i) => {
    tile.style.opacity = 1;
    tile.animate([{ translate: '0 -14px', opacity: 0 }, { translate: '0 0', opacity: 1 }], {
      duration: 240,
      delay: i * 50,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
      fill: 'backwards',
    });
  });
}

// The answer moves up and becomes the next number to sort.
function lift(n) {
  const dy = rows.next.offsetTop - rows.big.offsetTop;
  setRow(rows.big, n);
  setRow(rows.small, n);
  setRow(rows.next, n, { hidden: true });
  rows.big.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
    duration: LIFT_MS,
    easing: 'cubic-bezier(0.3, 0, 0.2, 1)',
  });
  rows.small.animate([{ opacity: 0 }, { opacity: 1 }], { duration: LIFT_MS });
}

function showRound({ big, small, next: n }) {
  setRow(rows.big, big);
  setRow(rows.small, small);
  setRow(rows.next, n);
}

function printTape({ big, small, next: n }) {
  const line = document.createElement('li');
  const result = document.createElement('span');
  result.textContent = pad(n);
  if (n === KAPREKAR) result.className = 'is-kaprekar';
  line.append(`${pad(big)} − ${pad(small)} = `, result);
  tape.append(line);
}

function describe(n) {
  const r = rounds[n];
  if (r < 0) return `${pad(n)} has four identical digits, so it drops to 0000 and stays. Try digits that aren't all the same.`;
  if (r === 0) return '6174 comes straight back as 6174. This is the end of the line.';
  if (r === 7) return `${pad(n)} reaches 6174 in 7 rounds, the most any number needs.`;
  return `${pad(n)} reaches 6174 in ${r} round${r > 1 ? 's' : ''}.`;
}

let runId = 0;

async function run(n) {
  const id = ++runId;
  const live = () => id === runId;
  // 6174 needs no rounds; show the one that proves it stays put.
  const shown = n === KAPREKAR ? [step(KAPREKAR)] : route(n);

  works.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  input.value = pad(n);
  input.removeAttribute('aria-invalid');
  if (hint.classList.contains('is-error')) {
    hint.textContent = HINT;
    hint.classList.remove('is-error');
  }
  history.replaceState(null, '', `#n=${pad(n)}`);
  map.pick(n); // also ends a 10,000 run
  resetCollapseButton();
  tape.replaceChildren();
  tapeSlot.hidden = false;
  verdict.textContent = '';

  if (reducedMotion.matches) {
    shown.forEach(printTape);
    showRound(shown.at(-1));
    verdict.textContent = describe(n);
    return;
  }

  setRow(rows.big, n);
  setRow(rows.small, n);
  setRow(rows.next, n, { hidden: true });

  for (const [i, round] of shown.entries()) {
    await wait(120);
    if (!live()) return;
    sortRow(rows.big, 'down');
    sortRow(rows.small, 'up');
    await wait(SORT_MS + 60);
    if (!live()) return;
    printRow(round.next);
    await wait(PRINT_MS);
    if (!live()) return;
    printTape(round);
    if (i === shown.length - 1) break;
    await wait(HOLD_MS);
    if (!live()) return;
    lift(round.next);
    await wait(LIFT_MS);
    if (!live()) return;
  }
  verdict.textContent = describe(n);
}

// The map and its legend

const map = createMap({
  canvas: $('map'),
  tip: $('map-tip'),
  rounds,
  next,
  onPick: run,
});

const counts = Array(8).fill(0);
for (const r of rounds) if (r >= 0) counts[r]++;
const tallest = Math.max(...counts);

$('bars').innerHTML = counts
  .map((count, r) => {
    const color = r === 0 ? '--red' : `--r${r}`;
    const label = `${r} round${r === 1 ? '' : 's'}: ${count.toLocaleString('en')} number${count === 1 ? '' : 's'}`;
    return `<li><button type="button" data-rounds="${r}" aria-label="${label}">
      <span class="value">${count.toLocaleString('en')}</span>
      <span class="bar" style="--h: ${(count / tallest) * 100}; --c: var(${color})"></span>
    </button></li>`;
  })
  .join('');

for (const button of $('bars').querySelectorAll('button')) {
  const on = () => map.setHighlight(Number(button.dataset.rounds));
  const off = () => map.setHighlight(null);
  button.addEventListener('mouseenter', on);
  button.addEventListener('focus', on);
  button.addEventListener('mouseleave', off);
  button.addEventListener('blur', off);
}

// aria-disabled rather than disabled, so the button keeps keyboard focus while it runs.
function resetCollapseButton() {
  runAllButton.removeAttribute('aria-disabled');
  runAllButton.textContent = 'Run all 10,000';
  collapseStatus.textContent = COLLAPSE_IDLE;
}

runAllButton.addEventListener('click', async () => {
  if (map.collapsed) {
    map.stopCollapse();
    resetCollapseButton();
    return;
  }
  if (map.collapsing) return;
  runAllButton.setAttribute('aria-disabled', 'true');
  collapseStatus.textContent = 'Round 1 of 7…';
  await map.runAll((round, tally) => {
    const at6174 = (tally.get(KAPREKAR) ?? 0).toLocaleString('en');
    collapseStatus.textContent =
      round < 7
        ? `After round ${round}: ${tally.size} values left, and ${at6174} numbers already on 6174.`
        : `After round 7: two values left. ${at6174} numbers on 6174, and the ten repdigits on 0000.`;
  });
  if (map.collapsed) {
    runAllButton.removeAttribute('aria-disabled');
    runAllButton.textContent = 'Show the map again';
  }
});

// Entry

input.addEventListener('input', () => {
  const digits = input.value.replace(/\D/g, '');
  if (digits !== input.value) input.value = digits;
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const n = parseDigits(input.value);
  if (n === null) {
    hint.textContent = 'Type one to four digits, like 3524.';
    hint.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  run(n);
});

$('random').addEventListener('click', () => {
  let n;
  do n = Math.floor(Math.random() * 10000);
  while (rounds[n] < 1);
  run(n);
});

// A link like #n=3524 runs that number.

function runFromHash() {
  const match = location.hash.match(/^#n=(\d{1,4})$/);
  if (match) run(Number(match[1]));
}

window.addEventListener('hashchange', runFromHash);

showRound(step(KAPREKAR));
runFromHash();
