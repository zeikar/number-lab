// The scale: n as one bar, and its divisors laid end to end beneath it, biggest first, so
// you can see them fall short, reach exactly to the end, or run past it.

const MIN_SHARE = 0.012; // divisors thinner than this share of the scale merge into one block
const TOTAL_MS = 1300; // to lay every divisor down, however many there are
const PART_MS = 240;
const LABEL_ROOM = 6; // px a label needs beside it; the blocks themselves carry no padding, so they keep their exact widths

const fmt = n => n.toLocaleString('en');

export function createScale(root) {
  const bar = root.querySelector('.scale-n');
  const row = root.querySelector('.scale-parts');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let showId = 0;

  // A label only shows when its block is wide enough to hold it.
  function fitLabels() {
    bar.classList.toggle('is-tight', bar.scrollWidth > bar.clientWidth);
    for (const el of row.children) el.classList.toggle('is-tight', el.firstChild.offsetWidth + LABEL_ROOM > el.clientWidth);
  }

  // Resolves true once the divisors are down, or false if a newer show replaced this one.
  function show(n, { parts, sum, kind }, { animate = true } = {}) {
    const id = ++showId;
    root.getAnimations({ subtree: true }).forEach(a => a.cancel());
    const span = Math.max(n, sum);
    root.style.setProperty('--n', n / span);
    root.classList.remove('is-perfect', 'is-abundant', 'is-deficient');
    bar.textContent = fmt(n);

    const blocks = [];
    let i = 0;
    for (; i < parts.length && parts[i] / span >= MIN_SHARE; i++) blocks.push({ value: parts[i], label: fmt(parts[i]) });
    const rest = parts.slice(i);
    if (rest.length === 1) blocks.push({ value: rest[0], label: fmt(rest[0]) });
    if (rest.length > 1) blocks.push({ value: rest.reduce((a, b) => a + b, 0), label: `${fmt(rest.length)} more`, rest: true });

    row.replaceChildren(
      ...blocks.map(({ value, label, rest }) => {
        const el = document.createElement('span');
        el.className = rest ? 'part part--rest' : 'part';
        el.style.width = `${(value / span) * 100}%`;
        el.append(Object.assign(document.createElement('span'), { textContent: label }));
        return el;
      }),
    );
    fitLabels();

    if (!animate || reducedMotion.matches || !blocks.length) {
      root.classList.add(`is-${kind}`);
      return Promise.resolve(true);
    }
    // Each block wipes in from the left, after the one before it.
    const step = Math.min(PART_MS, TOTAL_MS / blocks.length);
    const animations = [...row.children].map((el, k) =>
      el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], {
        duration: step * 1.4,
        delay: k * step,
        easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)',
        fill: 'backwards',
      }),
    );
    return Promise.all(animations.map(a => a.finished)).then(
      () => {
        if (id !== showId) return false;
        root.classList.add(`is-${kind}`);
        return true;
      },
      () => false,
    );
  }

  new ResizeObserver(fitLabels).observe(root);
  return { show };
}
