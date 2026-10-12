import { MAX, classify, euclid, euclidExponent, parseNumber } from './perfect.js';
import { createScale } from './scale.js';
import { createHunt, plural, power } from './hunt.js';

const $ = id => document.getElementById(id);
const form = $('entry');
const input = $('number');
const hint = $('hint');
const verdict = $('verdict');
const sumLine = $('sum');
const scaleRoot = $('scale');
const machine = document.querySelector('.machine');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const HINT = hint.textContent;
const fmt = n => n.toLocaleString('en');
const and = list => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : String(list[0] ?? ''));

const scale = createScale(scaleRoot);

// Long lists keep their biggest and smallest few.
function written({ parts, sum }) {
  if (!parts.length) return 'No divisors: 0';
  const shown = parts.length > 9 ? [...parts.slice(0, 5).map(fmt), '…', ...parts.slice(-3).map(fmt)] : parts.map(fmt);
  return `${shown.join(' + ')} = ${fmt(sum)}`;
}

function describe(n, { parts, sum, kind }) {
  if (n === 1) return '1 has no divisors below itself, so they add up to 0.';
  if (kind === 'perfect') {
    const p = euclidExponent(n);
    return `${fmt(n)} is perfect: its divisors add up to exactly ${fmt(n)}. It's ${power(p - 1)} × (${power(p)} − 1), and in binary it reads <span class="binary">${n.toString(2)}</span>: ${plural(p, 'one')}, then ${plural(p - 1, 'zero')}.`;
  }
  if (kind === 'abundant') {
    const odd = n === 945 ? " It's the smallest odd number that overshoots." : '';
    return `${fmt(n)} is abundant: its divisors add up to ${fmt(sum)}, which is ${fmt(sum - n)} too many.${odd}`;
  }
  if (parts.length === 1) return `${fmt(n)} is prime, so its only divisor below itself is 1, and it falls ${fmt(n - 1)} short.`;
  if (/^10*$/.test(n.toString(2))) return `${fmt(n)} is deficient: its divisors add up to ${fmt(sum)}, just 1 short. Every power of 2 misses by exactly 1.`;
  return `${fmt(n)} is deficient: its divisors add up to ${fmt(sum)}, which is ${fmt(n - sum)} short.`;
}

function label(n, { parts, sum }) {
  const listed =
    parts.length === 1 ? 'one divisor, 1,' : parts.length > 9 ? `${fmt(parts.length)} divisors, from ${fmt(parts[0])} down to 1,` : `divisors, ${and(parts.map(fmt))},`;
  const end = sum === n ? 'reach exactly to the end' : sum > n ? `run ${fmt(sum - n)} past the end` : `fall ${fmt(n - sum)} short of the end`;
  return n === 1 ? 'A bar 1 long, with no divisors below it.' : `A bar ${fmt(n)} long, with its ${listed} laid end to end beneath it. They ${end}.`;
}

let showId = 0;

async function show(n, { animate = true } = {}) {
  const id = ++showId;
  const result = classify(n);
  input.value = n;
  scaleRoot.setAttribute('aria-label', label(n, result));
  sumLine.textContent = written(result);
  verdict.textContent = `Adding up the divisors of ${fmt(n)}…`;
  if (!(await scale.show(n, result, { animate })) || id !== showId) return;
  verdict.innerHTML = describe(n, result);
}

function find(n) {
  input.removeAttribute('aria-invalid');
  if (hint.classList.contains('is-error')) {
    hint.textContent = HINT;
    hint.classList.remove('is-error');
  }
  history.replaceState(null, '', `#n=${n}`);
  show(n);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const n = parseNumber(input.value);
  if (n === null) {
    hint.textContent = `Type a whole number from 1 to ${fmt(MAX)}, like 28.`;
    hint.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  find(n);
});

for (const key of document.querySelectorAll('[data-n]')) key.addEventListener('click', () => find(Number(key.dataset.n)));

createHunt({
  button: $('hunt'),
  status: $('hunt-status'),
  announce: $('hunt-announce'),
  table: $('finds'),
  print: $('newest'),
  onPick(p) {
    find(Number(euclid(p)));
    const box = machine.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) machine.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  },
});

function fromHash() {
  const n = parseNumber(location.hash.match(/^#n=(\d+)$/)?.[1] ?? '');
  if (n !== null) find(n);
  return n !== null;
}

window.addEventListener('hashchange', fromHash);
if (!fromHash()) show(28, { animate: false });
