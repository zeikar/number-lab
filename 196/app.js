import { LIMIT, step, route, stepsTable, parseNumber } from './lychrel.js';
import { createPrintout } from './printout.js';

const REVERSE_MS = 560;
const COLUMN_MS = 90;
const HOLD_MS = 420;
const LIFT_MS = 460;

const $ = id => document.getElementById(id);
const form = $('entry');
const input = $('number');
const hint = $('hint');
const verdict = $('verdict');
const works = $('works');
const carryRow = $('carries');
const tape = $('tape');
const tapeSlot = $('tape-slot');
const rows = Object.fromEntries([...works.querySelectorAll('.row')].map(row => [row.dataset.row, row]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const HINT = hint.textContent;

const table = stepsTable();
const MOST = Math.max(...table); // 24, for 89 and 98
const holdouts = [...table.keys()].filter(n => table[n] < 0);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const group = text => BigInt(text).toLocaleString('en');
const plural = (count, word) => `${count.toLocaleString('en')} ${word}${count === 1 ? '' : 's'}`;

// Digit tiles sit in slots counted from the ones column, so a reverse is slot p to
// slot length - 1 - p, and the CSS transition slides the tiles across.

function tiles(row, count) {
  while (row.children.length < count) {
    const tile = document.createElement('span');
    tile.className = 'tile';
    row.append(tile);
  }
  while (row.children.length > count) row.lastChild.remove();
  return [...row.children];
}

// Changes made inside still() jump instead of sliding.
function still(change) {
  works.classList.add('is-still');
  change();
  works.offsetWidth;
  works.classList.remove('is-still');
}

function setRow(row, text, { hidden = false, answer = false } = {}) {
  still(() => {
    tiles(row, text.length).forEach((tile, i) => {
      tile.textContent = text[i];
      tile.style.setProperty('--slot', text.length - 1 - i);
      tile.style.opacity = hidden ? 0 : 1;
      tile.classList.toggle('is-answer', answer);
    });
  });
}

function setCarries(carries, shown = carries.length) {
  const marks = tiles(carryRow, carries.length);
  marks.forEach((mark, p) => {
    mark.className = 'carry';
    mark.textContent = '1';
    mark.style.setProperty('--slot', p);
    mark.style.opacity = carries[p] && p < shown ? 1 : 0;
  });
}

// Room for this step's sum, which may be a digit longer than the number.
function setSlots(count) {
  works.style.setProperty('--slots', count);
}

function showStep({ number, reversed, carries, sum }, answer) {
  still(() => setSlots(sum.length));
  setRow(rows.number, number);
  setRow(rows.reversed, reversed);
  setRow(rows.sum, sum, { answer });
  setCarries(carries);
}

function drop(tile, ms) {
  tile.style.opacity = 1;
  tile.animate([{ translate: '0 -12px', opacity: 0 }, { translate: '0 0', opacity: 1 }], {
    duration: ms,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    fill: 'backwards',
  });
}

function printTape(index, sum, answer) {
  const line = document.createElement('li');
  const count = document.createElement('span');
  count.className = 'tape-step';
  count.textContent = index;
  const result = document.createElement('span');
  result.textContent = sum;
  if (answer) result.className = 'is-answer';
  line.append(count, result);
  tape.append(line);
}

// The tape's last line when the run stops without a palindrome.
const more = () => Object.assign(document.createElement('li'), { className: 'tape-more', textContent: '…' });

function describe(n) {
  const steps = table[n];
  if (steps === 0) return `${n} already reads the same both ways, so there's nothing to add.`;
  // Below 10,000, a number with no palindrome by step 24 has none by step 1,000 either.
  if (steps < 0) {
    const smallest = n === holdouts[0] ? ` ${n} is the smallest, and the printout takes it further.` : '';
    return `No palindrome in ${MOST} steps, which makes ${n} one of the ${holdouts.length} holdouts below 10,000: none of them has one after ${LIMIT.toLocaleString('en')} steps.${smallest}`;
  }
  const most = steps === MOST ? `, the most of any number below 10,000 that gets one within ${LIMIT.toLocaleString('en')}` : '';
  return `${n} becomes a palindrome in ${plural(steps, 'step')}${most}: ${group(route(n).at(-1).sum)}.`;
}

let runId = 0;

async function run(n) {
  const id = ++runId;
  const live = () => id === runId;
  const steps = route(n, MOST);
  const answerAt = table[n] >= 0 ? steps.length - 1 : -1;

  works.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  input.value = n;
  input.removeAttribute('aria-invalid');
  if (hint.classList.contains('is-error')) {
    hint.textContent = HINT;
    hint.classList.remove('is-error');
  }
  history.replaceState(null, '', `#n=${n}`);
  tape.replaceChildren();
  tapeSlot.hidden = steps.length === 0;
  verdict.textContent = '';

  if (steps.length === 0) {
    const text = String(n);
    still(() => setSlots(text.length));
    setRow(rows.number, text, { answer: true });
    setRow(rows.reversed, text, { hidden: true });
    setRow(rows.sum, text, { hidden: true });
    setCarries([]);
    verdict.textContent = describe(n);
    return;
  }

  if (reducedMotion.matches) {
    steps.forEach((s, i) => printTape(i + 1, s.sum, i === answerAt));
    if (answerAt < 0) tape.append(more());
    showStep(steps.at(-1), answerAt >= 0);
    verdict.textContent = describe(n);
    return;
  }

  for (const [i, s] of steps.entries()) {
    // Early steps go slowly enough to follow; later ones speed up so 24 steps don't drag.
    const pace = Math.max(0.16, 0.8 ** i);
    works.style.setProperty('--move-ms', `${Math.round(REVERSE_MS * pace)}ms`);
    const grows = String(works.style.getPropertyValue('--slots')) !== String(s.sum.length);

    if (i === 0) {
      still(() => setSlots(s.sum.length));
      setRow(rows.number, s.number);
    }
    setRow(rows.reversed, s.number);
    setRow(rows.sum, s.sum, { hidden: true });
    setCarries(s.carries, 0);
    // After the jumps above, so the tiles shrink with transitions on.
    if (grows && i > 0) setSlots(s.sum.length);
    await wait((i === 0 ? 160 : 60) + (grows && i > 0 ? REVERSE_MS * pace : 0));
    if (!live()) return;

    // Reverse: each tile in the copy slides to its mirror slot.
    tiles(rows.reversed, s.number.length).forEach(tile => {
      tile.style.setProperty('--slot', s.number.length - 1 - Number(tile.style.getPropertyValue('--slot')));
    });
    await wait(REVERSE_MS * pace + 80);
    if (!live()) return;

    // Add, from the ones column up, writing each carry over the next column.
    const sumTiles = tiles(rows.sum, s.sum.length).reverse();
    const marks = [...carryRow.children];
    for (let p = 0; p < s.sum.length; p++) {
      drop(sumTiles[p], 220 * Math.max(pace, 0.5));
      if (s.carries[p + 1]) marks[p + 1].style.opacity = 1;
      await wait(COLUMN_MS * pace);
      if (!live()) return;
    }

    const answer = i === answerAt;
    if (answer) sumTiles.forEach(tile => tile.classList.add('is-answer'));
    printTape(i + 1, s.sum, answer);
    if (i === steps.length - 1) break;
    await wait(HOLD_MS * pace);
    if (!live()) return;

    // The sum moves up and becomes the next number.
    const dy = rows.sum.offsetTop - rows.number.offsetTop;
    setRow(rows.number, s.sum);
    setRow(rows.reversed, s.sum, { hidden: true });
    setRow(rows.sum, s.sum, { hidden: true });
    setCarries([]);
    rows.number.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
      duration: LIFT_MS * pace,
      easing: 'cubic-bezier(0.3, 0, 0.2, 1)',
    });
    await wait(LIFT_MS * pace);
    if (!live()) return;
  }
  if (answerAt < 0) tape.append(more());
  verdict.textContent = describe(n);
}

// Entry

input.addEventListener('input', () => {
  const digits = input.value.replace(/\D/g, '');
  if (digits !== input.value) input.value = digits;
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const n = parseNumber(input.value);
  if (n === null) {
    hint.textContent = 'Type one to four digits, like 89.';
    hint.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  run(n);
});

const pick = list => list[Math.floor(Math.random() * list.length)];
const notPalindromes = [...table.keys()].filter(n => table[n] !== 0);
$('random').addEventListener('click', () => run(pick(notPalindromes)));

function runFromHash() {
  const match = location.hash.match(/^#n=(\d{1,4})$/);
  if (match) run(Number(match[1]));
}

window.addEventListener('hashchange', runFromHash);

// The histogram: one bar per step count, then the holdouts. A bar runs one of its numbers.

const byCount = new Map();
for (const n of table.keys()) {
  const key = table[n];
  if (!byCount.has(key)) byCount.set(key, []);
  byCount.get(key).push(n);
}
const columns = [...Array(MOST + 1).keys(), -1];
const tallest = Math.max(...columns.map(c => byCount.get(c)?.length ?? 0));
const readout = $('bars-readout');

function summary(c) {
  const numbers = byCount.get(c) ?? [];
  if (!numbers.length) return `No number takes ${plural(c, 'step')}.`;
  if (c < 0) return `${plural(numbers.length, 'number')} with no palindrome after ${LIMIT.toLocaleString('en')} steps, starting with ${numbers[0]}.`;
  if (c === 0) return `${plural(numbers.length, 'number')} that already read the same both ways.`;
  const which = numbers.length <= 3 ? numbers.join(', ').replace(/, (\d+)$/, ' and $1') : plural(numbers.length, 'number');
  return `${plural(c, 'step')}: ${which}.`;
}

$('bars').innerHTML = columns
  .map(c => {
    const count = byCount.get(c)?.length ?? 0;
    const color = c === 0 ? '--red' : c < 0 ? '--ink' : '--r4';
    const place = c < 0 ? ' style="grid-column: 27"' : '';
    const label = summary(c) + (count ? ' Run one.' : '');
    return `<li${place}><button type="button" data-steps="${c}" aria-label="${label}"${count ? '' : ' disabled'}>
      <span class="bar" style="--h: ${(count / tallest) * 100}; --c: var(${color})"></span>
    </button></li>`;
  })
  .join('');

const READOUT = readout.textContent;
for (const button of $('bars').querySelectorAll('button')) {
  const c = Number(button.dataset.steps);
  const on = () => (readout.textContent = summary(c));
  const off = () => (readout.textContent = READOUT);
  button.addEventListener('mouseenter', on);
  button.addEventListener('focus', on);
  button.addEventListener('mouseleave', off);
  button.addEventListener('blur', off);
  button.addEventListener('click', () => {
    run(pick(byCount.get(c)));
    const box = works.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) works.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
}

// The printout

const runButton = $('run-196');
const restart = $('restart');
const odoStep = $('odo-step');
const odoDigits = $('odo-digits');
const status = $('printout-status');

const printout = createPrintout({
  canvas: $('sheet'),
  onStep(steps, digits) {
    odoStep.textContent = steps.toLocaleString('en');
    odoDigits.textContent = digits.toLocaleString('en');
  },
  onPalindrome(steps) {
    runButton.textContent = 'Run 196';
    status.textContent = `Step ${steps.toLocaleString('en')} reads the same both ways. That would be news.`;
  },
});

runButton.addEventListener('click', () => {
  if (printout.running) {
    printout.pause();
    runButton.textContent = 'Keep going';
    restart.hidden = false;
    status.textContent = `Paused at step ${printout.steps.toLocaleString('en')}, with ${plural(printout.digits, 'digit')} and no palindrome yet.`;
  } else {
    printout.start();
    runButton.textContent = 'Pause';
    restart.hidden = true;
    status.textContent = 'Running. Every line is a new sum, worked out as you watch.';
  }
});

restart.addEventListener('click', () => {
  printout.reset();
  runButton.textContent = 'Run 196';
  restart.hidden = true;
  status.textContent = 'Back to 196.';
  runButton.focus();
});

showStep(step('196'));
runFromHash();
