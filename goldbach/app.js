import { LIMIT, sieve, primesOf, pairs, parseNumber } from './goldbach.js';
import { createFold } from './fold.js';
import { createComet } from './comet.js';

const TAPE_LINES = 12; // ways printed before the tape says how many more
const PRINT_MS = 45;

const $ = id => document.getElementById(id);
const form = $('entry');
const input = $('number');
const hint = $('hint');
const verdict = $('verdict');
const tape = $('tape');
const tapeSlot = $('tape-slot');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const HINT = hint.textContent;

const isPrime = sieve();
const primes = primesOf(isPrime);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const fmt = n => n.toLocaleString('en');
const plural = (count, word) => `${fmt(count)} ${word}${count === 1 ? '' : 's'}`;
const sum = (n, p) => `${fmt(p)} + ${fmt(n - p)}`;

function describe(n, found) {
  if (n === 2) return "2 would have to be 1 + 1, and 1 isn't prime. That's why the conjecture starts at 4.";
  if (n % 2) {
    return found.length
      ? `${fmt(n)} = ${sum(n, 2)}. An odd sum of two primes has to use the one even prime, 2, so that's the only way.`
      : `${fmt(n)} can't be done. An odd sum of two primes has to use the one even prime, 2, and ${fmt(n - 2)} isn't prime.`;
  }
  if (n === 4) return '4 = 2 + 2, the only way, and the only even number that can use the prime 2.';
  if (found.length === 1) return `${fmt(n)} = ${sum(n, found[0])}, and that's the only way.`;
  if (found.length === 2) return `${fmt(n)} = ${sum(n, found[0])} = ${sum(n, found[1])}: two ways.`;
  return `${fmt(n)} is a sum of two primes in ${plural(found.length, 'way')}, from ${sum(n, found[0])} to ${sum(n, found.at(-1))}.`;
}

function printLine(text, className) {
  const line = document.createElement('li');
  line.textContent = text;
  if (className) line.className = className;
  tape.append(line);
}

let runId = 0;

async function run(n) {
  const id = ++runId;
  const live = () => id === runId;
  const found = pairs(n, isPrime);

  input.value = n;
  input.removeAttribute('aria-invalid');
  if (hint.classList.contains('is-error')) {
    hint.textContent = HINT;
    hint.classList.remove('is-error');
  }
  history.replaceState(null, '', `#n=${n}`);
  comet.mark(n);
  tape.replaceChildren();
  tapeSlot.hidden = true;
  verdict.textContent = '';

  if (!(await fold.show(n, isPrime, { animate: !reducedMotion.matches, live }))) return;

  if (found.length) {
    tapeSlot.hidden = false;
    for (const p of found.slice(0, TAPE_LINES)) {
      printLine(sum(n, p));
      if (!reducedMotion.matches) await wait(PRINT_MS);
      if (!live()) return;
    }
    if (found.length > TAPE_LINES) printLine(`… and ${fmt(found.length - TAPE_LINES)} more`, 'tape-more');
  }
  verdict.textContent = describe(n, found);
}

// Entry

input.addEventListener('input', () => {
  const cleaned = input.value.replace(/[^\d,]/g, '');
  if (cleaned !== input.value) input.value = cleaned;
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const n = parseNumber(input.value);
  if (n === null) {
    hint.textContent = 'Type a whole number from 2 to 100,000, like 100.';
    hint.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  run(n);
});

// Small enough that the fold has room to show its numbers or its ticks clearly.
$('random').addEventListener('click', () => run(2 * (2 + Math.floor(Math.random() * 499))));

function runFromHash() {
  const match = location.hash.match(/^#n=(\d{1,6})$/);
  const n = match && parseNumber(match[1]);
  if (n) run(n);
}

window.addEventListener('hashchange', runFromHash);

// The comet

const countButton = $('count-all');
const status = $('comet-status');
const announce = $('comet-announce');
const readout = $('comet-readout');
const READOUT = readout.textContent;
const machine = document.querySelector('.machine');

const fold = createFold({ canvas: $('fold') });
const comet = createComet({
  canvas: $('comet'),
  isPrime,
  primes,
  onHover(n, ways) {
    readout.textContent = n === null ? READOUT : `${fmt(n)}: ${plural(ways, 'way')}. Tap to fold it.`;
  },
  onPick(n) {
    run(n);
    const box = machine.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) machine.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  },
});

// aria-disabled rather than disabled, so the button keeps keyboard focus while it runs.
countButton.addEventListener('click', async () => {
  if (comet.running) return;
  countButton.setAttribute('aria-disabled', 'true');
  // The progress line changes every frame, so only the start and the end are announced.
  announce.textContent = 'Counting the ways for every even number from 4 to 100,000.';
  let missing = null;
  const done = await comet.run((reached, firstMissing) => {
    missing = firstMissing;
    status.textContent =
      missing === null
        ? `Counted up to ${fmt(reached)}. Every one so far is a sum of two primes.`
        : `${fmt(missing)} isn't a sum of two primes. That would be news.`;
  });
  countButton.removeAttribute('aria-disabled');
  if (!done) return;
  let evens = 0;
  for (let n = 4; n <= LIMIT; n += 2) evens++;
  countButton.textContent = 'Check them again';
  if (missing === null) status.textContent = `All ${fmt(evens)} are sums of two primes: the same range Nils Pipping checked by hand in 1938.`;
  announce.textContent = status.textContent;
});

fold.show(28, isPrime, { animate: false });
runFromHash();
