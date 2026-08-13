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

## License

App code is unlicensed for now (private use). Compiled data under `public/data/` is derived
from OpenGNT and is CC BY-SA 4.0 — see attribution requirements in `scripts/build-corpus.ts`.
