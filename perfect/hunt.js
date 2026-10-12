// The hunt's page side: starts and stops the worker, lists each Mersenne prime as it turns
// up with how long the browser took, and prints the newest perfect number in full.
import { MAX, HISTORY, RECORD, euclid, mersenneDigits } from './perfect.js';

const TICK_MS = 200; // status refresh while a long test runs
const MAX_FONT = 28; // px, for the first few perfect numbers, which are short
const QUIET_MS = 1000; // finds closer together than this aren't announced one by one

const fmt = n => n.toLocaleString('en');
export const plural = (k, word) => `${fmt(k)} ${word}${k === 1 ? '' : 's'}`;
// Screen readers read a bare <sup> flat, so 2^127 would come out as "2127".
export const power = exp => `2<sup><span class="visually-hidden">to the power </span>${exp}</sup>`;
const mersenne = p => `${power(fmt(p))} − 1`;
const ordinal = k => {
  const teen = k % 100 >= 11 && k % 100 <= 13;
  return `${k}${(!teen && ['th', 'st', 'nd', 'rd'][k % 10]) || 'th'}`;
};

// Rounded first, so 999.6 ms reads "1.0 s" rather than "1000 ms".
export function clock(ms) {
  if (Math.round(ms) < 1000) return `${Math.round(ms)} ms`;
  const tenths = Math.round(ms / 100);
  if (tenths < 600) return `${(tenths / 10).toFixed(1)} s`;
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`;
}

export function createHunt({ button, status, announce, table, print, onPick }) {
  const rows = table.querySelector('tbody');
  const caption = print.querySelector('figcaption');
  const digits = print.querySelector('.digits');
  let worker = null;
  let started = null; // set by the worker's first message, so its start-up isn't timed
  let testing = 2;
  let found = [];
  let timer = 0;

  const elapsed = () => (started === null ? 0 : performance.now() - started);

  function fit() {
    const box = digits.clientWidth * digits.clientHeight;
    if (!box) return;
    // Courier's digits are 0.6em wide, and lines are 1.25em apart.
    let size = Math.min(MAX_FONT, Math.sqrt(box / (digits.textContent.length * 0.6 * 1.25)));
    digits.style.fontSize = `${size}px`;
    // Lines break between whole digits, so shrink a little more until it all fits.
    while (digits.scrollHeight > digits.clientHeight && size > 1) {
      size *= 0.96;
      digits.style.fontSize = `${size}px`;
    }
  }

  function tick() {
    status.innerHTML = `<span>Testing ${mersenne(testing)}, a ${fmt(mersenneDigits(testing))}-digit number. ${found.length} found, ${clock(elapsed())} in.</span>`;
  }

  function add(p, perfect) {
    const ms = elapsed();
    const quiet = !found.length || ms - found.at(-1).ms < QUIET_MS;
    found.push({ p, ms, digits: perfect.length });
    const k = found.length;
    const year = HISTORY.find(([q]) => q === p)?.[1] ?? '–';
    const row = document.createElement('tr');
    row.innerHTML = `<td>${k}</td><td><button type="button" class="find" aria-expanded="false" data-p="${p}">${fmt(p)}</button></td><td>${fmt(mersenneDigits(p))}</td><td>${clock(ms)}</td><td>${year}</td>`;
    rows.append(row);
    table.hidden = false;

    caption.innerHTML = `The ${ordinal(k)} perfect number, ${power(fmt(p - 1))} × (${mersenne(p)}), in full: ${plural(perfect.length, 'digit')}.`;
    digits.textContent = perfect;
    print.hidden = false;
    fit();
    tick();
    if (!quiet) announce.textContent = `Found the ${ordinal(k)} Mersenne prime, 2 to the power ${fmt(p)} minus 1, after ${clock(ms)}.`;
  }

  function describe(p) {
    const { ms, digits: length } = found.find(f => f.p === p);
    const credit = HISTORY.find(([q]) => q === p)?.[2];
    const machine = euclid(p) <= BigInt(MAX) ? ' Its perfect number is in the machine now.' : '';
    return `${mersenne(p)} has ${plural(mersenneDigits(p), 'digit')}, and its perfect number ${plural(length, 'digit')}.${credit ? ` ${credit}.` : ''} Your browser found it after ${clock(ms)}.${machine}`;
  }

  function fail() {
    status.textContent = "Your browser couldn't start the hunt.";
    announce.textContent = status.textContent;
  }

  function start() {
    try {
      worker = new Worker(new URL('./hunter.js', import.meta.url), { type: 'module' });
    } catch (error) {
      // Older browsers can't run a module worker at all.
      console.error(error);
      fail();
      return;
    }
    started = null;
    testing = 2;
    found = [];
    rows.replaceChildren();
    button.textContent = 'Stop';
    announce.textContent = 'Hunting.';
    worker.addEventListener('message', ({ data }) => {
      started ??= performance.now();
      if (data.testing) testing = data.testing;
      if (data.found) add(data.found, data.perfect);
    });
    worker.addEventListener('error', event => {
      event.preventDefault();
      stop();
      fail();
    });
    timer = setInterval(tick, TICK_MS);
    tick();
  }

  function stop() {
    worker.terminate();
    worker = null;
    clearInterval(timer);
    button.textContent = 'Hunt again';
    const k = found.length;
    status.textContent = `Stopped after ${clock(elapsed())}: ${plural(k, 'Mersenne prime')}, so ${plural(k, 'perfect number')}. ${RECORD.rank} are known.`;
    announce.textContent = status.textContent;
  }

  button.addEventListener('click', () => (worker ? stop() : start()));

  // Pressing a p opens a line under its row saying who found that prime first.
  rows.addEventListener('click', event => {
    const key = event.target.closest('.find');
    if (!key) return;
    const open = key.getAttribute('aria-expanded') === 'true';
    rows.querySelector('.detail')?.remove();
    rows.querySelector('[aria-expanded="true"]')?.setAttribute('aria-expanded', 'false');
    if (open) return;
    const p = Number(key.dataset.p);
    const detail = document.createElement('tr');
    detail.className = 'detail';
    detail.innerHTML = `<td colspan="5">${describe(p)}</td>`;
    key.closest('tr').after(detail);
    key.setAttribute('aria-expanded', 'true');
    if (euclid(p) <= BigInt(MAX)) onPick(p);
  });

  new ResizeObserver(() => print.hidden || fit()).observe(digits);
}
