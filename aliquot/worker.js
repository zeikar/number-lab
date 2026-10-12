// Runs off the page's thread, because one step can mean factoring a 40-digit number, which
// takes seconds. Either follows one start until it ends or loops (or the page terminates
// the worker), or surveys the first thousand starts. BigInts travel as strings.
import { factor, next, survey } from './aliquot.js';

onmessage = ({ data }) => {
  if (data.survey) {
    const results = survey().map(r => ({
      ...r,
      peak: r.peak.toString(),
      loop: r.loop?.map(String),
      joins: r.joins && { ...r.joins, open: r.joins.open.toString() },
    }));
    postMessage({ survey: results });
    return;
  }
  const seen = new Map();
  let n = BigInt(data.follow);
  for (let step = 0; ; step++) {
    // Each term goes out before it's factored, so the page can say what it's waiting on.
    postMessage({ step, term: n.toString() });
    if (n === 0n) return postMessage({ end: 'zero' });
    if (seen.has(n)) return postMessage({ end: 'loop', loopStart: seen.get(n) });
    seen.set(n, step);
    const factors = factor(n);
    postMessage({ step, factors: [...factors].map(([p, e]) => [p.toString(), e]) });
    n = next(n, factors);
  }
};
