# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Number Lab: small browser toys for famous number facts, most of them from Numberphile videos. Static files, no build step, plain ES modules. GitHub Pages deploys `main` / root to https://zeikar.dev/number-lab/, so every URL in the pages is relative. The first experiment is [6174/](6174/) (Kaprekar's constant).

## Commands

- `python3 -m http.server` — serve locally at http://localhost:8000
- `npm test` — Node's built-in test runner over [test/](test/); CI runs it on pushes to `main` and on pull requests

## Layout

- [index.html](index.html) — the lab home, one card per experiment
- [style.css](style.css) — shared tokens, type, page shell and the `.key` buttons
- `<experiment>/` — its own `index.html`, `style.css`, a pure logic module, UI scripts and `og.png`
- [test/](test/) — tests for each experiment's logic module

A component lives in its experiment's stylesheet until a second experiment needs it; then move it to the root `style.css` instead of copying it. The machine panel, digit tiles and paper tape in [6174/style.css](6174/style.css) are the first candidates.

## Adding an experiment

1. Create the folder. Its page loads `../style.css`, then its own `style.css`, and carries the same head as [6174/index.html](6174/index.html): canonical URL, OG tags and the `theme-color` pair.
2. Put the arithmetic in a pure module and test it. Every number the page states (counts, bounds, step totals) is computed and asserted in a test, not typed from memory. Edge cases count too: 6174's copy first ignored the ten repdigits.
3. Add a card to [index.html](index.html), a `<url>` to [sitemap.xml](sitemap.xml) and a section to [README.md](README.md).
4. Credit the source video by link in the page footer and the README.
5. Make `og.png` at 1200×630, PNG: build a throwaway page that lays out the experiment's signature view, screenshot it, and don't commit the page.

The zeikar.github.io repo already lists this site's `sitemap.xml` in its sitemap index and `robots.txt`, so new pages don't need changes there.

## Design

Every experiment is a machine from the same lab: an old calculating machine's grey-green enamel body, paper, black ink and red ribbon ink. Keep the materials shared and give each experiment its own machine (6174 sorts digit keys and prints on a paper tape). Spend the boldness on one signature moment per experiment, like 6174's "Run all 10,000"; keep the rest quiet.

- Colours come only from the tokens in [style.css](style.css), redefined for `prefers-color-scheme: dark`. There's no theme toggle. `--red` marks the answer, the special number, and nothing else. `--r1` to `--r7` is an ordinal ramp for ordered steps, checked for lightness steps and contrast on `--paper` in both themes; re-check it if an experiment needs a different number of steps.
- Canvas drawing reads the tokens at draw time and redraws when the colour scheme changes.
- Type: Bricolage Grotesque for text and digit keys (narrow `wdth` for keys and headings); Courier Prime only for printed output, like the tape, formulas and coordinates.
- Buttons are `.key` (filled) and `.key--plain` (outlined).
- It has to work at phone width: people arrive from Shorts.

## Behaviour

- The browser does the maths live; that's the point of each toy.
- Shareable state goes in the hash (`6174/#n=3524`), written with `history.replaceState`.
- A new run cancels the old one: a run id that stale awaits check, plus `getAnimations().forEach(a => a.cancel())` for leftover animations.
- A button that starts an animation uses `aria-disabled`, not `disabled`, so keyboard focus stays on it.
- `prefers-reduced-motion`: no tweening; jump to the results.
- A canvas gets `role="img"` and a label, and its numbers also appear as text somewhere on the page.

## Copy

English, plain and exact, in sentence case. The tone can be playful, but the maths can't be loose. Keep "Numberphile" out of names, titles and logos: it's their brand, and this is an unofficial fan project. Mention and link it as the source.

Commit messages are short imperative sentences ("Add …", "Show …"). Pushing to `main` deploys.
