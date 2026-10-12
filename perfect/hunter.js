// The hunt runs here, off the page's thread, because one test can take seconds once p is in
// the tens of thousands. Every prime p in turn, until the page terminates the worker.
import { isPrime, lucasLehmer, euclid } from './perfect.js';

const REPORT_MS = 100;
let reported = -Infinity;

for (let p = 2; ; p++) {
  if (!isPrime(p)) continue;
  if (performance.now() - reported >= REPORT_MS) {
    postMessage({ testing: p });
    reported = performance.now();
  }
  if (lucasLehmer(p)) postMessage({ found: p, perfect: euclid(p).toString() });
}
