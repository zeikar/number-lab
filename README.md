# Number Lab

Small machines for famous number facts. **[Try it →](https://zeikar.dev/number-lab/)**

Each experiment does the arithmetic live in the browser, so you can poke at a number fact instead of only hearing about it. Most of them started as a [Numberphile](https://www.youtube.com/@numberphile) video, and each one links the video it came from.

## Experiments

### [6174, Kaprekar's constant](https://zeikar.dev/number-lab/6174/)

Take four digits that aren't all the same, arrange them largest first and smallest first, and subtract. Repeat with the answer, and within seven rounds you reach 6174, which gives back 6174 forever.

Type a number, or tap one on the map, and the machine sorts the digit keys, subtracts, and prints each round on a paper tape. The map shades all 10,000 four-digit numbers by how many rounds they take, and **Run all 10,000** sends every one of them at once: one round squeezes them onto 55 values, and seven rounds leave only 6174 and 0000. Links like `6174/#n=3524` run that number.

Based on Numberphile's [6174](https://www.youtube.com/watch?v=d8TRcZklX_Q).

### [196, reverse and add](https://zeikar.dev/number-lab/196/)

Write a number backwards and add it to the original, and repeat until the answer reads the same both ways. Most numbers below 10,000 get there in a step or two, but 89 takes 24. Nobody has ever got 196 there, though computers have taken it to a billion digits.

Type a number and the machine slides a copy of its digits into reverse order, adds column by column with the carries showing, and prints each sum on a paper tape. **Run 196** keeps going live in your browser, one line per step: digits that match their mirror print in full ink, so a palindrome would come out as a solid line, and the printout keeps widening into a triangle. A histogram of every number below 10,000 shows how rare that is: 246 of them have no palindrome after 1,000 steps. Links like `196/#n=89` run that number.

Based on Numberphile's [What's special about 196?](https://www.youtube.com/watch?v=bN8PE3eljdA)

### [Goldbach's conjecture](https://zeikar.dev/number-lab/goldbach/)

Every even number above 2 seems to be the sum of two primes. Computers have checked every one up to 4 × 10¹⁸, but nobody has proved it always works.

Type a number and the machine folds the number line from 0 to n in half, so every number sits over the one that adds up to n with it. A column with a prime at both ends lights up red: that's a way. **Check all 49,999** counts the ways for every even number from 4 to 100,000 and plots Goldbach's comet, where multiples of 3 rise in a band about twice as high as the rest. Point at a dot to see its count, and tap it to fold it. Links like `goldbach/#n=100` fold that number.

Based on Numberphile's [Goldbach Conjecture](https://www.youtube.com/watch?v=MxiTG96QOxw).

### [The golden angle](https://zeikar.dev/number-lab/sunflower/)

Drop a seed, turn by a fixed fraction of a turn, drop the next one a little further out, and keep going. Most turns pile the seeds into arms; turn by 0.618034…, the golden ratio's fractional part, and they pack evenly at every size, like a sunflower head.

Drag the turn, type one (a decimal, a fraction, `pi`, `e`, `phi`, `√2`), or try a preset, and the seed head redraws live. It counts the arms at the edge, lists the fractions the turn is close to, and measures how close the nearest two seeds get. 0.618 sits next to φ: it looks golden with 500 seeds, but it's exactly 309/500, which hugs 55/89 closer than φ does, and by 3,000 seeds its 89 arms open up gaps. **Grow it seed by seed** lays the seeds down one at a time with the arm turning between them. Links like `sunflower/#t=pi&n=3000` set the turn and the seed count.

Based on Numberphile's [The Golden Ratio (why it is so irrational)](https://www.youtube.com/watch?v=sj8Sg8qnjOg).

## Run locally

No build step. Serve the folder with any static server:

```sh
python3 -m http.server
```

Then open http://localhost:8000.

## Development

```sh
npm test   # the arithmetic behind each experiment (Node's built-in test runner)
```

Each experiment lives in its own folder with its page, scripts and stylesheet; [`style.css`](style.css) at the root holds the shared colours, type, controls and machine parts. Add a new experiment's page to [`index.html`](index.html) and [`sitemap.xml`](sitemap.xml).

## Deploy

GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.

## Credits

Number Lab is an unofficial fan project and isn't affiliated with Numberphile or Brady Haran.

## License

[MIT](LICENSE)
