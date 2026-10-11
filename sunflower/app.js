import { GOLDEN, MIN_SEEDS, MAX_SEEDS, place, neighbours, convergents, parseTurn, isGolden } from './sunflower.js';
import { createHead } from './head.js';

const $ = id => document.getElementById(id);
const form = $('entry');
const input = $('turn');
const hint = $('hint');
const slider = $('turn-slider');
const seedSlider = $('seeds');
const seedCount = $('seed-count');
const growButton = $('grow');
const verdict = $('verdict');
const canvas = $('head');
const out = {
  turn: $('out-turn'),
  arms: $('out-arms'),
  gap: $('out-gap'),
  meter: $('gap-meter'),
  fractions: $('out-fractions'),
};
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const HINT = hint.textContent;

const head = createHead({ canvas });
const fmt = n => n.toLocaleString('en');
const and = list => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : String(list[0] ?? ''));
const ordinal = n => {
  const tens = n % 100;
  const suffix = tens > 10 && tens < 14 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${fmt(n)}${suffix}`;
};

let turn = GOLDEN;
let label = 'φ';
let count = 1000;

// The fraction the turn is exactly, if it is one with no more than `count` in the denominator.
function exactFraction() {
  const last = convergents(turn, count).at(-1);
  return last && Math.abs(last[0] / last[1] - turn) < 1e-12 ? last : null;
}

function describe(arms) {
  if (turn === 0) return 'No turn at all: every seed goes the same way, in one straight line.';
  if (isGolden(turn)) {
    const spirals = arms.length ? `, with ${and(arms)} spirals at the edge` : '';
    return `The golden turn. No fraction is close enough to win, so the seeds fill the head evenly at every size${spirals}.`;
  }
  if (!arms.length) return 'No clear arms at the edge.';
  if (arms.length === 1 && arms[0] === 1) return 'So close to no turn, or a whole one, that the seeds trail out in a single arm.';
  // A fraction p/q only shows as q arms once there are seeds enough to repeat.
  const exact = exactFraction();
  if (exact && arms.includes(exact[1])) {
    const [p, q] = exact;
    return `${p}/${q} of a turn brings every ${ordinal(q)} seed back to the same direction, so the seeds line up in ${fmt(q)} straight arms.`;
  }
  const near = convergents(turn, count).filter(([, q]) => q > 1 && arms.includes(q)).at(-1);
  return near
    ? `${and(arms.map(fmt))} arms at the edge, because this turn is close to ${near[0]}/${near[1]}.`
    : `${and(arms.map(fmt))} arms at the edge.`;
}

// Redraws everything for the current turn and seed count. `settled` is false while a
// slider is being dragged, so screen readers only hear the result once.
function update({ settled = true, record = true } = {}) {
  const golden = isGolden(turn);
  const placed = place(turn, count);
  head.set(turn, count, { golden, placed });
  const { gap, arms } = neighbours(turn, count, placed);
  const degrees = (turn * 360).toFixed(1);
  out.turn.textContent = `${turn.toFixed(6)} of a turn (${degrees}°)`;
  out.arms.textContent = arms.length ? and(arms.map(fmt)) : 'none clear';
  out.gap.textContent = `${Math.round(gap * 100)}% of a honeycomb gap`;
  out.meter.style.width = `${Math.min(100, gap * 100)}%`;
  const fractions = convergents(turn, count)
    .filter(([, q]) => q > 1)
    .map(([p, q]) => `${p}/${q}`);
  out.fractions.textContent = fractions.length > 6 ? `${fractions.slice(0, 4).join(', ')}, …, ${fractions.slice(-2).join(', ')}` : fractions.join(', ') || 'none';
  slider.value = turn;
  seedSlider.value = count;
  seedCount.textContent = `${fmt(count)} seeds`;
  canvas.setAttribute(
    'aria-label',
    `${fmt(count)} seeds, each ${turn.toFixed(6)} of a turn round from the last and a little further out. ${arms.length ? `${and(arms.map(fmt))} arms at the edge; ` : ''}the closest two seeds are ${Math.round(gap * 100)}% of a honeycomb gap apart.`,
  );
  if (settled) verdict.textContent = describe(arms);
  if (settled && record) history.replaceState(null, '', `#t=${encodeURIComponent(label)}&n=${count}`);
}

function setTurn(value, name) {
  turn = value;
  label = name;
  input.value = name;
  input.removeAttribute('aria-invalid');
  if (hint.classList.contains('is-error')) {
    hint.textContent = HINT;
    hint.classList.remove('is-error');
  }
  growButton.removeAttribute('aria-disabled');
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const parsed = parseTurn(input.value);
  if (!parsed) {
    hint.textContent = 'Type a decimal like 0.618, a fraction like 2/5, or pi, e, phi or √2.';
    hint.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  setTurn(parsed.turn, parsed.label);
  update();
});

for (const key of document.querySelectorAll('[data-turn]')) {
  key.addEventListener('click', () => {
    const parsed = parseTurn(key.dataset.turn);
    setTurn(parsed.turn, parsed.label);
    update();
  });
}

const fromSlider = () => {
  const value = Number(slider.value);
  setTurn(value, String(value));
};
slider.addEventListener('input', () => {
  fromSlider();
  update({ settled: false });
});
slider.addEventListener('change', () => {
  fromSlider();
  update();
});

seedSlider.addEventListener('input', () => {
  count = Number(seedSlider.value);
  update({ settled: false });
});
seedSlider.addEventListener('change', () => update());

// aria-disabled rather than disabled, so the button keeps keyboard focus while it runs.
let grows = 0;
growButton.addEventListener('click', async () => {
  if (head.growing) return;
  if (reducedMotion.matches) {
    update();
    return;
  }
  const id = ++grows;
  growButton.setAttribute('aria-disabled', 'true');
  await head.grow();
  if (id === grows) growButton.removeAttribute('aria-disabled');
});

// A link like #t=pi&n=3000 sets the turn and the seeds.
// A link sets them; a plain visit leaves the address alone.
function fromHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const parsed = params.has('t') && parseTurn(params.get('t'));
  const n = Number(params.get('n'));
  if (parsed) setTurn(parsed.turn, parsed.label);
  else setTurn(turn, label);
  // Onto the seed slider's steps of 50.
  if (Number.isFinite(n) && n > 0) count = Math.min(MAX_SEEDS, Math.max(MIN_SEEDS, Math.round(n / 50) * 50));
  update({ record: false });
}

window.addEventListener('hashchange', fromHash);
fromHash();
