# Number Lab

Small machines for famous number facts. **[Try it →](https://zeikar.dev/number-lab/)**

Each experiment does the arithmetic live in the browser, so you can poke at a number fact instead of only hearing about it. Most of them started as a [Numberphile](https://www.youtube.com/@numberphile) video, and each one links the video it came from.

## Experiments

### [6174, Kaprekar's constant](https://zeikar.dev/number-lab/6174/)

Take four digits that aren't all the same, arrange them largest first and smallest first, and subtract. Repeat with the answer, and within seven rounds you reach 6174, which gives back 6174 forever.

Type a number, or tap one on the map, and the machine sorts the digit keys, subtracts, and prints each round on a paper tape. The map shades all 10,000 four-digit numbers by how many rounds they take, and **Run all 10,000** sends every one of them at once: one round squeezes them onto 55 values, and seven rounds leave only 6174 and 0000. Links like `6174/#n=3524` run that number.

Based on Numberphile's [6174](https://www.youtube.com/watch?v=d8TRcZklX_Q).

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

Each experiment lives in its own folder with its page, scripts and stylesheet; [`style.css`](style.css) at the root holds the shared colours, type and controls. Add a new experiment's page to [`index.html`](index.html) and [`sitemap.xml`](sitemap.xml).

## Deploy

GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.

## Credits

Number Lab is an unofficial fan project and isn't affiliated with Numberphile or Brady Haran.

## License

[MIT](LICENSE)
