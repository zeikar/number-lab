// The arcs: each jump drawn as a half circle over the number line, above for odd steps and
// below for even ones, so the walk weaves back and forth.

const PAD = 12; // CSS px around the drawing
const FIRST_MS = 160; // the first jumps go slowly enough to follow
const LAST_MS = 45;
const SWEEP = 0.85; // share of a jump's time spent drawing its arc

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const readColors = () => ({ paper: token('--paper'), ink: token('--ink'), soft: token('--ink-soft'), red: token('--red'), font: token('--print') });

export function createArcs({ canvas, onStep }) {
  const ctx = canvas.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let colors = readColors();
  let list = [0];
  let shown = 0; // jumps drawn
  let partial = 1; // how much of the last jump is drawn while playing
  let marked = null; // step whose arc is red
  let hovered = null;
  let playId = 0;
  let playing = false;

  // While playing, the view fits the jumps so far, so the first ones are big enough to
  // follow and the drawing pulls back as it grows.
  function geometry() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const steps = shown < list.length - 1 ? Math.max(shown, 6) : list.length - 1;
    const top = Math.max(1, ...list.slice(0, steps + 1));
    // Arcs reach steps/2 above and below the line at most.
    const unit = Math.min((w - 2 * PAD) / top, (h - 2 * PAD) / Math.max(1, steps));
    const left = (w - top * unit) / 2;
    return { w, h, unit, top, x: v => left + v * unit, mid: h / 2 };
  }

  function arc(n, share, { x, unit, mid }) {
    const from = list[n - 1];
    const to = list[n];
    const centre = x((from + to) / 2);
    const r = (Math.abs(to - from) / 2) * unit;
    const above = n % 2 === 1;
    // Sweep from the start point towards the end, over the top or under the bottom.
    const start = from < to ? Math.PI : 0;
    const turn = (above === from < to ? 1 : -1) * Math.PI * share;
    ctx.beginPath();
    ctx.arc(centre, mid, r, start, start + turn, turn < 0);
    ctx.stroke();
  }

  function draw() {
    const g = geometry();
    const dpr = canvas.width / g.w || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, g.w, g.h);
    ctx.strokeStyle = colors.soft;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.x(0), g.mid);
    ctx.lineTo(g.x(g.top), g.mid);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.lineCap = 'round';
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = Math.max(0.6, Math.min(1.6, g.unit * 0.6));
    for (let n = 1; n <= shown; n++) {
      if (n === marked) continue;
      arc(n, n === shown ? partial : 1, g);
    }
    if (marked !== null && marked <= shown) {
      ctx.strokeStyle = colors.red;
      ctx.lineWidth = 2.5;
      arc(marked, marked === shown ? partial : 1, g);
    }
    if (hovered !== null) drawHover(hovered, g);
  }

  function drawHover(n, g) {
    const from = list[n - 1];
    const to = list[n];
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2.5;
    arc(n, 1, g);
    const text = `step ${n}: ${from} ${to < from ? '−' : '+'} ${n} = ${to}`;
    ctx.font = `700 13px ${colors.font}`;
    const width = ctx.measureText(text).width;
    const tx = Math.min(Math.max(g.x((from + to) / 2), width / 2 + 4), g.w - width / 2 - 4);
    const ty = n % 2 ? g.mid + 16 : g.mid - 16;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = colors.paper;
    ctx.strokeText(text, tx, ty);
    ctx.fillStyle = colors.ink;
    ctx.fillText(text, tx, ty);
  }

  // The jump whose arc passes nearest the pointer.
  function arcAt(event) {
    const box = canvas.getBoundingClientRect();
    const px = event.clientX - box.left;
    const py = event.clientY - box.top;
    const g = geometry();
    let best = null;
    let bestDistance = 10;
    for (let n = 1; n <= shown; n++) {
      const centre = g.x((list[n - 1] + list[n]) / 2);
      const r = (n / 2) * g.unit;
      const above = n % 2 === 1;
      if (above ? py > g.mid + 4 : py < g.mid - 4) continue;
      const d = Math.abs(Math.hypot(px - centre, py - g.mid) - r);
      if (d < bestDistance) {
        best = n;
        bestDistance = d;
      }
    }
    return best;
  }

  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const n = arcAt(event);
    if (n === hovered) return;
    hovered = n;
    draw();
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    hovered = arcAt(event);
    draw();
  });
  canvas.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = null;
    draw();
  });

  function show(terms, { mark = null } = {}) {
    playId++;
    playing = false;
    list = terms;
    shown = terms.length - 1;
    partial = 1;
    marked = mark;
    hovered = null;
    draw();
  }

  // Draws the jumps one at a time, calling onStep(n, value) as each one starts. With reduced
  // motion the drawing stays whole, and only the onStep calls keep their pace.
  function play() {
    const id = ++playId;
    playing = true;
    hovered = null;
    const steps = list.length - 1;
    const finish = done => {
      if (id === playId) playing = false;
      return done;
    };
    shown = reducedMotion.matches ? steps : 0;
    partial = 1;
    draw();
    return new Promise(resolve => {
      let n = 0;
      let started = 0;
      let length = 0;
      const frame = now => {
        if (id !== playId) return resolve(finish(false));
        if (n === 0 || now - started >= length) {
          if (n === steps) {
            partial = 1;
            draw();
            return resolve(finish(true));
          }
          n++;
          started = now;
          length = LAST_MS + (FIRST_MS - LAST_MS) * Math.exp(-n / 15);
          onStep(n, list[n]);
        }
        // Read every frame, so switching reduced motion on mid-play shows every jump at once.
        const still = reducedMotion.matches;
        shown = still ? steps : n;
        partial = still ? 1 : Math.min(1, (now - started) / (length * SWEEP));
        draw();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    draw();
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    colors = readColors();
    draw();
  });
  new ResizeObserver(resize).observe(canvas);

  return {
    show,
    play,
    get playing() {
      return playing;
    },
    describe() {
      const steps = list.length - 1;
      const red = marked !== null && marked <= steps ? ` The jump that first lands on ${list[marked]}, step ${marked}, is in red.` : '';
      return `The first ${steps} jumps of Recamán's sequence drawn as half circles over a number line, alternating above and below.${red}`;
    },
  };
}
