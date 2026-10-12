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

### [Recamán's sequence](https://zeikar.dev/number-lab/recaman/)

Start at 0. On step n, jump back n if that lands on a new number above 0; otherwise jump forward n. Does the walk land on every number eventually? Nobody knows.

The machine draws each jump as a half circle, above and below the line in turn, with a slider for how many and **Play** (with optional sound) to watch them weave. Type a number to see the step where the walk first lands on it: 42 at step 20, 19 not until step 99,734. **Walk 10 million steps** fills in a grid of the numbers below 2,000 as the walk reaches them, speeding up tenfold every second; 1,355, 1,643 and 1,814 are still empty at the end. 1,355 first turns up at step 325,374,625,245, and 852,655 is still missing after 10⁶¹² steps. Links like `recaman/#n=42` look up that number.

Based on Numberphile's [The Slightly Spooky Recamán Sequence](https://www.youtube.com/watch?v=FGC5TdIiT9U).

### [Perfect numbers](https://zeikar.dev/number-lab/perfect/)

A number is perfect when its divisors, leaving out the number itself, add up to exactly that number, like 6 = 1 + 2 + 3. Only 52 are known, each one made from a Mersenne prime 2^p − 1. Nobody knows if there are infinitely many, or if there's an odd one.

Type a number and the machine lays its divisors end to end, biggest first, under a bar as long as the number: they fall short, reach exactly to the end, or run past it. Seven of the numbers up to 999,999,999,999 are perfect, and the verdict shows each one's binary form, p ones and then p − 1 zeros. **Hunt** tries 2^p − 1 for every prime p in turn, with the Lucas–Lehmer test for odd p, in a web worker, and lists each Mersenne prime it finds with how long your browser took and when it was first found, back to the ancient Greeks. The newest perfect number prints in full. The first 20 come fast; after that each one takes longer. Links like `perfect/#n=496` add up that number.

Based on Numberphile's [Perfect Numbers and Mersenne Primes](https://www.youtube.com/watch?v=T0xKHwQH-4I).

### [Aliquot sequences](https://zeikar.dev/number-lab/aliquot/)

Add up a number's divisors, leaving out the number itself, to get the next number, and repeat. Most numbers fall to 0 through a prime and 1; some land on a perfect number or fall into a loop like 220 and 284. 276 keeps climbing, and nobody knows if it ever comes down.

Type a start and the machine follows it in a web worker, factoring each term with Pollard's rho. It plots the path step by step on a log scale, slowly at first so you can watch it climb, and prints every step on a tape with its prime factors: 138 climbs to 179,931,895,322 before it falls to 0 after 178 steps, and 276 climbs past 40 digits, then slows to a crawl as each step gets harder to factor, until you stop it. **Follow all 1,000** follows every start from 1 to 1,000 up to 25 digits, then replays them side by side, speeding up tenfold every second: 965 reach 0 and 22 fall into a loop. Of the 13 that pass 25 digits, 840 comes back down later, but nobody knows where the other 12 end. Those 12 are the Lehmer five and seven that run into them. Links like `aliquot/#n=276` follow that start.

Based on Numberphile's [An amazing thing about 276](https://www.youtube.com/watch?v=OtYKDzXwDEE) and [Untouchable Numbers](https://www.youtube.com/watch?v=Yh1QUYn2f3I).

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
