// Reverse and add: write a number backwards, add the two, and repeat until the answer
// reads the same both ways. Numbers are decimal strings, so they can grow past 2^53.

export const COUNT = 10000;
// A number below 10,000 with no palindrome after this many steps counts as a holdout.
export const LIMIT = 1000;

export const isPalindrome = text => text === [...text].reverse().join('');

// One step, worked column by column from the ones digit. carries[p] is the carry into
// column p, so carries[0] is always 0; a carry out of the top column becomes a new digit.
export function step(text) {
  const reversed = [...text].reverse().join('');
  const carries = [];
  let sum = '';
  let carry = 0;
  for (let p = 0; p < text.length; p++) {
    const i = text.length - 1 - p;
    const total = Number(text[i]) + Number(reversed[i]) + carry;
    carries.push(carry);
    sum = (total % 10) + sum;
    carry = total > 9 ? 1 : 0;
  }
  if (carry) {
    carries.push(1);
    sum = '1' + sum;
  }
  return { number: text, reversed, carries, sum };
}

// The steps from n until a palindrome, or until `cap` steps go by without one.
export function route(n, cap = LIMIT) {
  const steps = [];
  let text = String(n);
  while (!isPalindrome(text) && steps.length < cap) {
    const s = step(text);
    steps.push(s);
    text = s.sum;
  }
  return steps;
}

// The same arithmetic on digit arrays, least significant digit first, for long runs.
// Writes the sum of src[0..length) and its reverse into dst and returns the sum's length;
// dst needs room for length + 1 digits and must not be src.
export function reverseAddInto(src, length, dst) {
  let carry = 0;
  for (let p = 0; p < length; p++) {
    const total = src[p] + src[length - 1 - p] + carry;
    carry = total > 9 ? 1 : 0;
    dst[p] = total - 10 * carry;
  }
  if (!carry) return length;
  dst[length] = 1;
  return length + 1;
}

export function digitsPalindrome(digits, length) {
  for (let i = 0, j = length - 1; i < j; i++, j--) if (digits[i] !== digits[j]) return false;
  return true;
}

// Steps from n to a palindrome, or -1 if there's none within `cap` steps.
function stepsWithin(n, cap) {
  let a = Uint8Array.from(String(n).split('').reverse(), Number);
  let length = a.length;
  let b = new Uint8Array(0);
  let steps = 0;
  while (!digitsPalindrome(a, length) && steps < cap) {
    if (b.length < length + 1) {
      const room = 2 * (length + 1);
      const grown = new Uint8Array(room);
      grown.set(a.subarray(0, length));
      a = grown;
      b = new Uint8Array(room);
    }
    length = reverseAddInto(a, length, b);
    [a, b] = [b, a];
    steps++;
  }
  return digitsPalindrome(a, length) ? steps : -1;
}

// Steps to a palindrome for every number 0-9999; -1 marks the holdouts. The holdouts
// share only a few first sums, so each first sum's run is worked out once.
export function stepsTable() {
  const table = new Int16Array(COUNT);
  const afterFirst = new Map();
  for (let n = 0; n < COUNT; n++) {
    const text = String(n);
    if (isPalindrome(text)) continue;
    const first = step(text).sum;
    if (!afterFirst.has(first)) afterFirst.set(first, stepsWithin(first, LIMIT - 1));
    const rest = afterFirst.get(first);
    table[n] = rest < 0 ? -1 : rest + 1;
  }
  return table;
}

// Parses up to four typed digits into a number, or null. Leading zeros drop off,
// since 0089 is 89 and reverses to 98, not 9800.
export function parseNumber(text) {
  const trimmed = text.trim();
  return /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : null;
}
