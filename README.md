# Greek Reader

A Koine Greek reading app: mark the grammar and vocabulary you know, and it ranks
every verse in the Greek New Testament by how much of it you can actually read —
starting with what's closest to your level.

Corpus: [OpenGNT](https://github.com/eliranwong/OpenGNT) (CC BY-SA 4.0), 138,013 tokens
across all 27 NT books, decoded via its RMAC morphology codes into a set of learner-facing
grammar concepts (see `src/lib/rmac.ts` and `src/data/concepts.ts`).

## Status

Test version / work in progress. Working end-to-end locally:

- Corpus build pipeline (`scripts/build-corpus.ts`) — downloads OpenGNT + its analytical
  lexicon, decodes every RMAC code, derives contract-verb/μι-verb tags, emits per-book JSON
  to `public/data/`.
- Grammar + vocabulary selection UI.
- Verse scorer/ranker with adjustable tolerance.
- Reader with tap-word glosses, translation reveal, and read-progress tracking.
- Per-book NT coverage dashboard.

Profiles are currently `localStorage`-only, keyed by username (no password — trust-based,
per the intended deployment). Firebase sync, so a profile follows you across devices, is the
next major piece.

## Development

```sh
npm install
npm run build:corpus   # downloads sources (cached in .cache/) and builds public/data/
npm run verify:corpus  # sanity-checks the build output
npm run dev
```

`npm run build:icons` re-rasterises the home-screen PNGs from `public/app-icon.svg`. The PNGs are
committed, so only run it when the artwork changes.

## Definitions

The words are defined by the owner's own vocabulary list, matched to Mounce, in
`scripts/data/glosses.json`: 491 entries keyed by corpus lemma. Anywhere the app names a word —
flashcard, reader popover, parsing card, word search — that wording is what it shows. The corpus's
own TBESG gloss fills in the remaining ~4,900 lemmas.

The list is a build input, applied last by `build-corpus.ts` so it beats both TBESG and the
1st-person rewrite above it. Editing it doesn't need a full corpus rebuild:

```sh
npm run apply:glosses  # rewrites public/data/lemmas.json in place
npm run verify:corpus  # asserts all 491 landed
```

Definitions split by voice are written with the split labelled — `active: I rule; middle: I begin`.
The parsing card's English line conjugates the first branch and drops the label.

`npm run import:glosses -- <deck.apkg>` is how the list was produced, from an Anki export; see the
script for how deck headwords are matched to corpus lemmas. There is no import UI in the app —
these are the app's definitions, not a per-profile setting.

## Install for offline use

The app is a PWA: once installed it holds the whole corpus locally and works with no connection at
all — the same 12MB it downloads on every cold load anyway, so caching it costs no extra bandwidth.

- **iPhone / iPad** — open the site in Safari, then Share → *Add to Home Screen*.
- **Desktop Chrome / Edge** — click the install icon at the right of the address bar.
- **macOS Safari 17+** — File → *Add to Dock*.

Two things to know. The first launch has to be online: it downloads the corpus once, and after that
the app opens offline. And each install is its own storage container — an iPhone home-screen app
does not share storage with Safari — so a new install starts with an empty profile and pulls yours
down from Firestore by username, which also needs that first launch to be online. After that,
studying offline is fully local; work done offline syncs on the next change you make with a
connection.

## License

App code is unlicensed for now (private use). Compiled data under `public/data/` is derived
from OpenGNT and is CC BY-SA 4.0 — see attribution requirements in `scripts/build-corpus.ts`.
