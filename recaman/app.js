import { WALK_STEPS, MAX_DRAWN, MAX_REACHED, createWalker, terms, parseNumber } from './recaman.js';
import { createArcs } from './arcs.js';
import { createGaps } from './gaps.js';

// From OEIS A064227: far past what a browser walks.
const KNOWN = { 1355: '325,374,625,245', 2406: '394,178,473,633,984' };

const $ = id => document.getElementById(id);
const form = $('entry');
const input = $('number');
const hint = $('hint');
const verdict = $('verdict');
const stepSlider = $('steps');
const stepCount = $('step-count');
const playButton = $('play');
const soundButton = $('sound');
const machine = document.querySelector('.machine');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const HINT = hint.textContent;
const fmt = n => n.toLocaleString('en');
const and = list => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : String(list[0] ?? ''));

let steps = Number(stepSlider.value);
let marked = null; // the step whose arc is red

// Sound: each landing plays a note, higher for bigger numbers, wrapping every four octaves.
// The audio starts from the Sound button's click, since Safari only allows that.
let audio = null;
let soundOn = false;
function tone(value) {
  if (!soundOn || audio?.state !== 'running') return;
  const t = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 110 * 2 ** ((value % 48) / 12);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.45);
}

const arcCanvas = $('arcs');
const arcs = createArcs({ canvas: arcCanvas, onStep: (n, value) => tone(value) });

stepSlider.max = MAX_DRAWN;

function redraw() {
  stepSlider.value = steps;
  stepCount.textContent = `${fmt(steps)} steps`;
  arcs.show(terms(steps), { mark: marked !== null && marked <= steps ? marked : null });
  arcCanvas.setAttribute('aria-label', arcs.describe());
}

function describe(n, result) {
  if (n === 0) return '0 is where the walk starts.';
  if (result) {
    const { step, from } = result;
    const how = from > n ? `back ${fmt(step)} from ${fmt(from)}` : `forward ${fmt(step)} from ${fmt(from)}`;
    const far = step > MAX_DRAWN ? " That's too far along to draw here." : '';
    return `${fmt(n)}: first reached at step ${fmt(step)}, jumping ${how}.${far}`;
  }
  const notYet = `${fmt(n)} isn't reached in the first ${fmt(WALK_STEPS)} steps.`;
  if (KNOWN[n]) return `${notYet} It first turns up at step ${KNOWN[n]}.`;
  if (n === 852655) return `${notYet} Nobody has seen it turn up at all: it's still missing after 10⁶¹² steps.`;
  return notYet;
}

// Walks until it lands on n, half a million steps a frame so the page stays responsive.
// Results are kept, and a newer lookup cancels an older one.
const found = new Map([[0, { step: 0, from: 0 }]]);
let findId = 0;

function walkFor(n, id) {
  if (found.has(n)) return Promise.resolve(found.get(n));
  if (n > MAX_REACHED) return Promise.resolve(null);
  const walker = createWalker();
  return new Promise(resolve => {
    const chunk = () => {
      if (id !== findId) return resolve(undefined);
      const end = Math.min(WALK_STEPS, walker.n + 500_000);
      while (walker.n < end) {
        const from = walker.value;
        walker.step();
        if (walker.value === n) {
          found.set(n, { step: walker.n, from });
          return resolve(found.get(n));
        }
      }
      if (walker.n >= WALK_STEPS) {
        found.set(n, null);
        return resolve(null);
      }
      requestAnimationFrame(chunk);
    };
    chunk();
  });
}

async function find(n) {
  const id = ++findId;
  input.value = n;
  input.removeAttribute('aria-invalid');
  if (hint.classList.contains('is-error')) {
    hint.textContent = HINT;
    hint.classList.remove('is-error');
  }
  history.replaceState(null, '', `#n=${n}`);
  if (!found.has(n) && n <= MAX_REACHED) verdict.textContent = `Walking to find ${fmt(n)}…`;
  const result = await walkFor(n, id);
  if (result === undefined) return;
  marked = result && result.step > 0 ? result.step : null;
  if (marked !== null && marked <= MAX_DRAWN) steps = Math.max(steps, marked);
  redraw();
  verdict.textContent = describe(n, result);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const n = parseNumber(input.value);
  if (n === null) {
    hint.textContent = 'Type a whole number up to 999,999,999, like 42.';
    hint.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  find(n);
});

stepSlider.addEventListener('input', () => {
  steps = Number(stepSlider.value);
  redraw();
});

// aria-disabled rather than disabled, so the button keeps keyboard focus while it runs.
let plays = 0;
playButton.addEventListener('click', async () => {
  if (arcs.playing) return;
  const id = ++plays;
  playButton.setAttribute('aria-disabled', 'true');
  await arcs.play();
  if (id === plays) playButton.removeAttribute('aria-disabled');
});

soundButton.addEventListener('click', () => {
  soundOn = !soundOn;
  soundButton.setAttribute('aria-pressed', String(soundOn));
  if (soundOn) {
    audio ??= new AudioContext();
    audio.resume();
  }
});

function fromHash() {
  const match = location.hash.match(/^#n=(\d{1,9})$/);
  if (match) find(Number(match[1]));
}

window.addEventListener('hashchange', fromHash);

// The grid of gaps

const walkButton = $('walk');
const status = $('walk-status');
const announce = $('walk-announce');
const readout = $('gaps-readout');
const READOUT = readout.textContent;
const legendCounts = [...document.querySelectorAll('.legend [data-bin]')];

const gaps = createGaps({
  canvas: $('gaps'),
  onHover(v, step) {
    if (v === null) readout.textContent = READOUT;
    else if (step >= 0) readout.textContent = `${fmt(v)}: first reached at step ${fmt(step)}. Tap to look it up.`;
    else readout.textContent = `${fmt(v)}: not reached yet.`;
  },
  onPick(v) {
    find(v);
    const box = machine.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) machine.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  },
});

if (reducedMotion.matches) status.textContent = 'The walk takes all 10 million steps at once. Watch which squares stay empty.';

walkButton.addEventListener('click', async () => {
  if (gaps.running) return;
  walkButton.setAttribute('aria-disabled', 'true');
  legendCounts.forEach(count => (count.textContent = ''));
  announce.textContent = `Walking ${fmt(WALK_STEPS)} steps.`;
  const done = await gaps.run((n, smallest) => {
    status.textContent = `Step ${fmt(n)}. Smallest number not reached yet, outlined in red: ${fmt(smallest)}.`;
  });
  walkButton.removeAttribute('aria-disabled');
  if (!done) return;
  gaps.counts().forEach((count, i) => (legendCounts[i].textContent = fmt(count)));
  const missing = gaps.missing();
  walkButton.textContent = 'Walk it again';
  status.textContent = missing.length
    ? `After ${fmt(WALK_STEPS)} steps, ${and(missing.map(fmt))} ${missing.length === 1 ? 'is' : 'are'} still missing below 2,000.${KNOWN[missing[0]] ? ` ${fmt(missing[0])} first turns up at step ${KNOWN[missing[0]]}.` : ''}`
    : `After ${fmt(WALK_STEPS)} steps, every number below 2,000 has been reached.`;
  announce.textContent = status.textContent;
});

redraw();
fromHash();
