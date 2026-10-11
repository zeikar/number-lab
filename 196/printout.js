// The 196 printout: one line per step and one mark per digit, worked out live for as long
// as it runs. A digit that matches the one in its mirror position prints in full ink and
// the rest print faint, so a palindrome would print as a solid line. When the paper fills up, the whole printout shrinks to half
// size and carries on, so the triangle of digits keeps growing.
import { reverseAddInto, digitsPalindrome } from './lychrel.js';

const FIRST_LINES = 24; // lines that fit before the first shrink
const GLYPH_CSS_PX = 8; // below this cell size, digits print as marks, not numerals
const FAINT = 0.24; // opacity of a digit that doesn't match its mirror
const ZOOM_MS = 360;
const BUDGET_MS = 9; // arithmetic per frame, so the page stays responsive
const START_RATE = 3; // steps per second for the first SLOW_LINES lines
const SLOW_LINES = 12;
const DOUBLE_S = 1.3; // after those, the rate doubles this often
const MAX_RATE = 1e6; // far past what a device manages, so the frame budget is the real limit
const REPLAY_LINES = 400; // up to here a shrink prints everything again, crisp

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const ease = t => 1 - (1 - t) ** 3;

const layer = () => {
  const canvas = document.createElement('canvas');
  return [canvas, canvas.getContext('2d')];
};

export function createPrintout({ canvas, onStep, onPalindrome }) {
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // The sheet keeps every mark as alpha only and is tinted with the ink colour when
  // it's drawn, so a colour-scheme change recolours the whole run.
  const [sheet, sctx] = layer();
  const [tint, tctx] = layer();
  const [strip, stripCtx] = layer();
  let paper = token('--paper');
  let ink = token('--ink');

  let width = 0; // canvas size in device pixels
  let height = 0;
  let cell = 0; // device pixels per digit and per line
  let top = 0;
  let digits; // ones digit first
  let spare;
  let length = 0;
  let steps = 0;
  let running = false;
  let frame = 0;
  let zoom = null; // { from, start } while the sheet shrinks
  let rate = START_RATE;
  let allowance = 0;
  let last = 0;
  // Lines thinner than a pixel add their coverage into one pixel row before it's drawn.
  let acc = new Float32Array(0);
  let accRow = -1;

  const dpr = () => (width && canvas.clientWidth ? width / canvas.clientWidth : window.devicePixelRatio || 1);

  function seed() {
    digits = new Uint8Array(64);
    spare = new Uint8Array(64);
    digits.set([6, 9, 1]);
    length = 3;
    steps = 0;
    rate = START_RATE;
    allowance = 0;
    zoom = null;
    accRow = -1;
    acc.fill(0);
    top = Math.round(height * 0.035);
    cell = (height - 2 * top) / FIRST_LINES;
    sctx.clearRect(0, 0, width, height);
    print(0, digits, length);
    compose();
    onStep(steps, length);
  }

  // Prints every line so far again at the current size, from 196.
  function replay() {
    let a = new Uint8Array(digits.length);
    let b = new Uint8Array(digits.length);
    a.set([6, 9, 1]);
    let n = 3;
    sctx.clearRect(0, 0, width, height);
    for (let line = 0; line <= steps; line++) {
      if (line) {
        n = reverseAddInto(a, n, b);
        [a, b] = [b, a];
      }
      print(line, a, n);
    }
    flush();
  }

  // Draws one line of the printout onto the sheet; digits are ones digit first.
  function print(line, digits, length) {
    const y = top + line * cell;
    const x0 = width / 2 - (length * cell) / 2;
    const matches = j => digits[length - 1 - j] === digits[j];
    if (cell >= GLYPH_CSS_PX * dpr()) {
      sctx.font = `700 ${cell * 0.82}px 'Courier Prime', 'Courier New', monospace`;
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      for (let j = 0; j < length; j++) {
        sctx.globalAlpha = matches(j) ? 1 : FAINT;
        sctx.fillText(digits[length - 1 - j], x0 + (j + 0.5) * cell, y + cell * 0.55);
      }
      sctx.globalAlpha = 1;
    } else if (cell >= 1) {
      const y0 = Math.round(y);
      const h = Math.round(y + cell) - y0;
      sctx.globalAlpha = FAINT;
      sctx.fillRect(Math.round(x0), y0, Math.round(x0 + length * cell) - Math.round(x0), h);
      sctx.globalAlpha = 1;
      for (let j = 0; j < length; j++) {
        if (!matches(j)) continue;
        let end = j + 1;
        while (end < length && matches(end)) end++;
        sctx.fillRect(Math.round(x0 + j * cell), y0, Math.round(x0 + end * cell) - Math.round(x0 + j * cell), h);
        j = end;
      }
    } else {
      const row = Math.floor(y);
      if (row !== accRow) flush(row);
      const area = cell * cell;
      for (let j = 0; j < length; j++) {
        const x = Math.floor(x0 + (j + 0.5) * cell);
        acc[x] += (matches(j) ? 1 : FAINT) * area;
      }
    }
  }

  // Writes the accumulated pixel row onto the sheet and starts the next one.
  function flush(nextRow = -1) {
    if (accRow >= 0) {
      const image = stripCtx.createImageData(width, 1);
      let touched = false;
      for (let x = 0; x < width; x++) {
        if (!acc[x]) continue;
        image.data[4 * x + 3] = Math.min(255, Math.round(acc[x] * 255));
        touched = true;
      }
      if (touched) {
        stripCtx.putImageData(image, 0, 0);
        sctx.drawImage(strip, 0, 0, width, 1, 0, accRow, width, 1);
      }
      acc.fill(0);
    }
    accRow = nextRow;
  }

  // Shrinks everything printed so far to half size about the top of the centre line.
  // Short printouts are printed again instead, so numerals and marks never get mixed.
  function shrink() {
    flush();
    const [from, fctx] = layer();
    from.width = width;
    from.height = height;
    fctx.drawImage(sheet, 0, 0);
    cell /= 2;
    if (steps <= REPLAY_LINES) {
      replay();
    } else {
      sctx.clearRect(0, 0, width, height);
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(from, width / 4, top / 2, width / 2, height / 2);
      print(steps, digits, length);
    }
    if (!reducedMotion.matches) zoom = { from, start: performance.now() };
  }

  function compose() {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, width, height);
    tctx.globalCompositeOperation = 'source-over';
    tctx.clearRect(0, 0, width, height);
    if (zoom) {
      const s = 1 - 0.5 * ease(Math.min(1, (performance.now() - zoom.start) / ZOOM_MS));
      tctx.setTransform(s, 0, 0, s, (width / 2) * (1 - s), top * (1 - s));
      tctx.drawImage(zoom.from, 0, 0);
      tctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      tctx.drawImage(sheet, 0, 0);
    }
    tctx.globalCompositeOperation = 'source-in';
    tctx.fillStyle = ink;
    tctx.fillRect(0, 0, width, height);
    ctx.drawImage(tint, 0, 0);
  }

  function advance() {
    if (spare.length < length + 1) {
      const grown = new Uint8Array(2 * spare.length);
      grown.set(digits.subarray(0, length));
      digits = grown;
      spare = new Uint8Array(grown.length);
    }
    length = reverseAddInto(digits, length, spare);
    [digits, spare] = [spare, digits];
    steps++;
    if (top + (steps + 1) * cell > height - top) shrink();
    else print(steps, digits, length);
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.max(0, Math.min(100, now - last));
    last = now;
    if (zoom && now - zoom.start >= ZOOM_MS) zoom = null;
    if (!zoom) {
      if (steps >= SLOW_LINES) rate = Math.min(MAX_RATE, rate * 2 ** (dt / 1000 / DOUBLE_S));
      allowance += (rate * dt) / 1000;
      const deadline = performance.now() + BUDGET_MS;
      while (allowance >= 1 && !zoom) {
        allowance--;
        advance();
        if (digitsPalindrome(digits, length)) {
          pause();
          compose();
          onStep(steps, length);
          onPalindrome(steps);
          return;
        }
        if (performance.now() > deadline) {
          allowance = 0; // as fast as this device goes
          break;
        }
      }
      onStep(steps, length);
    }
    compose();
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(frame);
    flush(accRow);
    zoom = null;
    compose();
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * ratio);
    const h = Math.round(canvas.clientHeight * ratio);
    if (!w || !h || (w === width && h === height)) return;
    const first = !width;
    let old = null;
    if (!first) {
      flush();
      [old] = layer();
      old.width = width;
      old.height = height;
      old.getContext('2d').drawImage(sheet, 0, 0);
    }
    const scale = w / (width || w);
    canvas.width = sheet.width = tint.width = strip.width = width = w;
    canvas.height = sheet.height = tint.height = height = h;
    strip.height = 1;
    acc = new Float32Array(width);
    accRow = -1;
    if (first) return seed();
    cell *= scale;
    top *= scale;
    zoom = null;
    if (steps <= REPLAY_LINES) replay();
    else sctx.drawImage(old, 0, 0, width, height);
    compose();
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    paper = token('--paper');
    ink = token('--ink');
    compose();
  });
  new ResizeObserver(resize).observe(canvas);
  // The first lines print as numerals, so wait for the typewriter face.
  document.fonts.load(`700 16px 'Courier Prime'`).then(() => {
    if (width && !steps) seed();
  });

  return {
    start,
    pause,
    reset() {
      pause();
      seed();
    },
    get running() {
      return running;
    },
    get steps() {
      return steps;
    },
    get digits() {
      return length;
    },
  };
}
