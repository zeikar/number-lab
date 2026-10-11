// Kaprekar's routine on four digits. Leading zeros count as digits, so 21 is 0021.

export const KAPREKAR = 6174;
export const COUNT = 10000;

export function pad(n) {
  return String(n).padStart(4, '0');
}

// One round: digits largest first minus digits smallest first.
export function step(n) {
  const digits = pad(n).split('').sort();
  const small = Number(digits.join(''));
  const big = Number(digits.reverse().join(''));
  return { big, small, next: big - small };
}

// The rounds from n until it reaches 6174, or 0000 for a number whose four digits are
// all the same. 6174 itself needs no rounds, so its route is empty.
export function route(n) {
  const rounds = [];
  while (n !== KAPREKAR) {
    const round = step(n);
    rounds.push(round);
    n = round.next;
    if (n === 0) break;
  }
  return rounds;
}

// Rounds to reach 6174 for every number 0000-9999; -1 marks the ten repdigits.
export function roundsTable() {
  const table = new Int8Array(COUNT);
  for (let n = 0; n < COUNT; n++) {
    const rounds = route(n);
    table[n] = rounds.length && rounds.at(-1).next === 0 ? -1 : rounds.length;
  }
  return table;
}

// Where every number goes after one round.
export function nextTable() {
  const table = new Uint16Array(COUNT);
  for (let n = 0; n < COUNT; n++) table[n] = step(n).next;
  return table;
}

// Parses up to four typed digits into a number, or null.
export function parseDigits(text) {
  const trimmed = text.trim();
  return /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : null;
}
