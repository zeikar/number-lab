import { RECORD, FINISHED, UNSOLVED, ON_276, SURVEY_DIGITS, EDGES, binOf, parseNumber } from './aliquot.js';
import { createChart } from './chart.js';
import { createGrid } from './grid.js';

const $ = id => document.getElementById(id);
const form = $('entry');
const input = $('number');
const hint = $('hint');
const verdict = $('verdict');
const status = $('follow-status');
const stopKey = $('stop');
const tape = $('tape');
const readout = $('path-readout');
const machine = document.querySelector('.machine');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const HINT = hint.textContent;
const READOUT = readout.textContent;
const fmt = n => BigInt(n).toLocaleString('en');
const plural = (k, word) => `${fmt(k)} ${word}${k === 1 ? '' : 's'}`;
const and = list => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : String(list[0] ?? ''));
// Long numbers may wrap, but only between digit groups.
const breakable = n => fmt(n).replaceAll(',', ',<wbr>');
// Screen readers read a bare <sup> flat, so 2⁵ would come out as "25".
const factorText = factors =>
  factors.length === 1 && factors[0][1] === 1
    ? 'prime'
    : factors.map(([p, e]) => (e > 1 ? `${breakable(p)}<sup><span class="visually-hidden">to the power </span>${e}</sup>` : breakable(p))).join(' · ');

const worker = () => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

// The machine: follow one start

const chart = createChart({
  canvas: $('path'),
  onHover(s) {
    if (s === null) return (readout.textContent = READOUT);
    const term = terms[s];
    const factors = factorsOf[s];
    const end = term === '0' ? ', the end' : factors ? ` = ${factorText(factors)}` : '';
    readout.innerHTML = `Step ${fmt(s)}: ${breakable(term)}${end}.`;
  },
});

// The worker races ahead; the page shows its steps at a pace you can follow, slow at first
// and quickening, then step by step as they land once the worker is the slower of the two.
const FIRST_MS = 70;
const LAST_MS = 10;
const EASE_STEPS = 25; // how quickly the pace picks up
const pause = step => LAST_MS + (FIRST_MS - LAST_MS) * Math.exp(-step / EASE_STEPS);

let follower = null; // the worker, while it's still working
let following = false; // a run is on screen, being shown or waited on
let paced = true;
let start = 0n;
let terms = []; // the steps shown so far
let factorsOf = [];
let rows = [];
let arrived = []; // steps the worker has sent that aren't shown yet
let pending = new Map(); // factors for steps not shown yet
let ending = null; // how it ends, once the worker knows
let nextAt = 0; // when the next step is due on screen
let lastAt = 0; // when the latest message came in
let timer = 0;
let frame = 0;

function describe(end, loopStart) {
  const n = fmt(start);
  const steps = terms.length - 1;
  if (end === 'zero') {
    if (start === 1n) return '1 has no divisors below itself, so it goes straight to 0.';
    if (steps === 2) return `${n} is prime: its only divisor below itself is 1, which goes to 0.`;
    const peak = terms.reduce((a, b) => (BigInt(b) > BigInt(a) ? b : a));
    const climb = BigInt(peak) > start ? ` On the way it climbs as high as ${fmt(peak)}, at step ${fmt(terms.indexOf(peak))}.` : '';
    return `${n} reaches 0 after ${plural(steps, 'step')}.${climb}`;
  }
  const loop = terms.slice(loopStart, -1).map(fmt);
  const after = `after ${plural(loopStart, 'step')}`;
  if (loop.length === 1) {
    return loopStart ? `${n} lands on ${loop[0]}, a perfect number, ${after}, and stays there.` : `${n} is perfect: its divisors add up to itself, so it stays put.`;
  }
  if (loop.length === 2) {
    return loopStart
      ? `${n} falls into the amicable pair ${loop[0]} and ${loop[1]} ${after}, and they swap forever.`
      : `${loop[0]} and ${loop[1]} are amicable: each one's divisors add up to the other, so they swap forever.`;
  }
  return loopStart
    ? `${n} falls into a loop of ${loop.length} numbers ${after}.`
    : `${n} is sociable: it goes round a loop of ${loop.length} numbers and comes back to itself.`;
}

function stoppedText() {
  if (!terms.length) return 'Stopped before the first step.';
  const last = terms.at(-1);
  const s = Number(start);
  let text = `Stopped at step ${fmt(terms.length - 1)}, a ${last.length}-digit number.`;
  if (UNSOLVED.includes(s)) text += ' Nobody knows if it ever ends.';
  if (ON_276.includes(s)) text += ` Computers have followed 276 for ${fmt(RECORD.steps)} steps, to a ${RECORD.digits}-digit number. The next step needs a ${RECORD.stuck}-digit number factored, and nobody has managed it yet.`;
  if (FINISHED[s]) text += ` It does come back down: it reaches 0 after ${fmt(FINISHED[s])} steps.`;
  return text;
}

function row(step, term) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="tape-step"><span class="visually-hidden">Step </span>${fmt(step)}<span class="visually-hidden">:</span></span><span class="term">${breakable(term)}</span><span class="factors"></span>`;
  return li;
}

function setFactors(step, factors) {
  factorsOf[step] = factors;
  rows[step].lastChild.innerHTML = `<span class="visually-hidden">= </span>${factorText(factors)}`;
}

// Shows every step that's due, once a frame.
function reveal(now) {
  frame = 0;
  // Don't burst through a backlog that built up while the page wasn't drawing.
  nextAt = paced ? Math.max(nextAt, now - 50) : now;
  const fresh = [];
  const added = document.createDocumentFragment();
  const atBottom = tape.scrollHeight - tape.scrollTop - tape.clientHeight < 24;
  while (arrived.length && nextAt <= now) {
    const { step, term } = arrived.shift();
    terms.push(term);
    fresh.push(term);
    rows.push(row(step, term));
    added.append(rows.at(-1));
    if (paced) nextAt += pause(step);
  }
  tape.append(added);
  for (const [step, factors] of pending) {
    if (step >= rows.length) continue;
    setFactors(step, factors);
    pending.delete(step);
  }
  if (atBottom) tape.scrollTop = tape.scrollHeight;
  if (fresh.length) chart.add(fresh);
  if (ending && !arrived.length) return finish();
  tick();
  if (arrived.length) frame = requestAnimationFrame(reveal);
}

const schedule = () => (frame ||= requestAnimationFrame(reveal));

function tick() {
  if (!following || !terms.length) return;
  const k = terms.length - 1;
  const waiting = performance.now() - lastAt;
  status.textContent =
    factorsOf[k] || arrived.length || waiting < 400
      ? `Step ${fmt(k)}: a ${terms[k].length}-digit number.`
      : `Step ${fmt(k)}: factoring a ${terms[k].length}-digit number… ${Math.floor(waiting / 1000)} s`;
}

// Ends the run on screen. The Stop key hides, so keyboard focus on it moves to the entry
// rather than dropping out of the page; a tap leaves focus alone, so no keyboard pops up.
function halt() {
  follower?.terminate();
  follower = null;
  following = false;
  clearInterval(timer);
  cancelAnimationFrame(frame);
  frame = 0;
  if (stopKey.matches(':focus-visible')) input.focus();
  stopKey.hidden = true;
  status.textContent = '';
}

function finish() {
  halt();
  chart.finish(ending.end, ending.loopStart);
  verdict.textContent = describe(ending.end, ending.loopStart);
}

function follow(n, { write = true, animate = true } = {}) {
  halt();
  start = n;
  terms = [];
  factorsOf = [];
  rows = [];
  arrived = [];
  pending = new Map();
  ending = null;
  paced = animate && !reducedMotion.matches;
  tape.replaceChildren();
  chart.reset();
  readout.textContent = READOUT;
  input.value = n;
  input.removeAttribute('aria-invalid');
  if (hint.classList.contains('is-error')) {
    hint.textContent = HINT;
    hint.classList.remove('is-error');
  }
  if (write) history.replaceState(null, '', `#n=${n}`);
  verdict.textContent = `Following ${fmt(n)}…`;
  let w;
  try {
    w = follower = worker();
  } catch (error) {
    // Older browsers can't run a module worker.
    console.error(error);
    verdict.textContent = "Your browser can't run the machine.";
    return;
  }
  following = true;
  stopKey.hidden = false;
  nextAt = lastAt = performance.now();
  // Terminated workers go quiet, but a message already on its way could still land.
  w.addEventListener('message', ({ data }) => {
    if (follower !== w) return;
    lastAt = performance.now();
    if (data.end) {
      ending = data;
      follower.terminate();
      follower = null;
    } else if (data.term !== undefined) {
      // Pace credit only builds up while frames are behind, not while waiting on the worker.
      if (!arrived.length) nextAt = Math.max(nextAt, performance.now());
      arrived.push(data);
    } else if (data.step < rows.length) {
      // Its row is already on the tape, so show the factors now: a Stop before the next
      // frame shouldn't lose what took seconds to find.
      setFactors(data.step, data.factors);
    } else pending.set(data.step, data.factors);
    schedule();
  });
  w.addEventListener('error', event => {
    event.preventDefault();
    if (follower !== w) return;
    halt();
    verdict.textContent = "Your browser can't run the machine.";
  });
  w.postMessage({ follow: n.toString() });
  timer = setInterval(tick, 250);
}

stopKey.addEventListener('click', () => {
  halt();
  verdict.textContent = stoppedText();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const n = parseNumber(input.value);
  if (n === null) {
    hint.textContent = 'Type a whole number from 1 up to 15 digits, like 276.';
    hint.classList.add('is-error');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  follow(n);
});

for (const key of document.querySelectorAll('[data-n]')) key.addEventListener('click', () => follow(BigInt(key.dataset.n)));

// The grid: the first thousand starts

const walkButton = $('walk');
const walkStatus = $('walk-status');
const announce = $('walk-announce');
const gridReadout = $('grid-readout');
const GRID_READOUT = gridReadout.textContent;
const legendCounts = [...document.querySelectorAll('.legend [data-count]')];
let survey = null;

function story(n, r) {
  if (!r) return `${fmt(n)}: still walking.`;
  if (r.end === 'zero') {
    if (r.steps === 2 && n > 1) return `${fmt(n)} is prime: it goes to 1, then 0.`;
    const climb = BigInt(r.peak) > BigInt(n) ? `, climbing as high as ${fmt(r.peak)} on the way` : '';
    return `${fmt(n)} reaches 0 after ${plural(r.steps, 'step')}${climb}.`;
  }
  if (r.end === 'loop') {
    const [a, b] = r.loop.map(fmt);
    if (r.loop.length === 1) return r.loopStart ? `${fmt(n)} lands on the perfect number ${a} after ${plural(r.loopStart, 'step')}.` : `${fmt(n)} is perfect: it stays put.`;
    return r.loopStart ? `${fmt(n)} falls into the amicable pair ${a} and ${b} after ${plural(r.loopStart, 'step')}.` : `${fmt(n)} is amicable: it swaps with ${b} forever.`;
  }
  if (!r.joins) return `${fmt(n)} climbs past ${SURVEY_DIGITS} digits, too slow to follow here. Computers have: it reaches 0 after ${fmt(FINISHED[n])} steps.`;
  const { open, at, into } = r.joins;
  if (String(n) === open) return `Nobody knows where ${fmt(n)} ends.${n === 276 ? ` Computers have followed it for ${fmt(RECORD.steps)} steps.` : ''}`;
  if (at === 0) return `${fmt(n)} is step ${into} of ${fmt(open)}'s sequence, so nobody knows where it ends either.`;
  return `${fmt(n)} runs into ${fmt(open)}'s sequence after ${plural(at, 'step')}, so nobody knows where it ends either.`;
}

const grid = createGrid({
  canvas: $('grid'),
  onHover(n, r) {
    if (n === null) gridReadout.textContent = GRID_READOUT;
    else gridReadout.textContent = survey ? story(n, r) : `${fmt(n)}: tap to follow it.`;
  },
  onPick(n) {
    follow(BigInt(n));
    const box = machine.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) machine.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  },
});

function surveyed() {
  if (survey) return Promise.resolve(survey);
  return new Promise((resolve, reject) => {
    const w = worker();
    w.addEventListener('message', ({ data }) => {
      w.terminate();
      resolve((survey = data.survey));
    });
    w.addEventListener('error', event => {
      event.preventDefault();
      w.terminate();
      reject(new Error(event.message));
    });
    w.postMessage({ survey: true });
  });
}

walkButton.addEventListener('click', async () => {
  if (walkButton.getAttribute('aria-disabled') === 'true') return;
  walkButton.setAttribute('aria-disabled', 'true');
  legendCounts.forEach(count => (count.textContent = ''));
  walkStatus.textContent = 'Following all 1,000…';
  announce.textContent = walkStatus.textContent;
  let all;
  try {
    all = await surveyed();
  } catch (error) {
    console.error(error);
    walkStatus.textContent = "Your browser can't run the walk.";
    walkButton.removeAttribute('aria-disabled');
    return;
  }
  await grid.run(all, (step, settled) => {
    walkStatus.textContent = `Step ${fmt(step)}: ${fmt(settled)} of 1,000 have reached 0 or a loop.`;
  });
  walkButton.removeAttribute('aria-disabled');
  walkButton.textContent = 'Follow them again';
  const counts = EDGES.map(() => 0);
  for (const r of all) if (r.end === 'zero') counts[binOf(r.steps)]++;
  const loops = all.filter(r => r.end === 'loop').length;
  const high = all.filter(r => !r.end).length;
  const unsolved = all.filter(r => r.joins).length;
  legendCounts.forEach(count => {
    const key = count.dataset.count;
    count.textContent = fmt(key === 'loop' ? loops : key === 'open' ? unsolved : key === 'high' ? high - unsolved : counts[key]);
  });
  const back = all.filter(r => !r.end && !r.joins).map(r => fmt(r.n));
  walkStatus.textContent = `${fmt(all.length - loops - high)} reach 0 and ${loops} fall into a loop. ${high} climb past ${SURVEY_DIGITS} digits: ${and(back)} ${back.length === 1 ? 'comes' : 'come'} back down later, but nobody knows where the other ${unsolved} end.`;
  announce.textContent = walkStatus.textContent;
});

function fromHash() {
  const n = parseNumber(location.hash.match(/^#n=(\d+)$/)?.[1] ?? '');
  if (n !== null) follow(n);
  return n !== null;
}

window.addEventListener('hashchange', fromHash);
if (!fromHash()) follow(138n, { write: false, animate: false });
