// Rewrites public/data/lemmas.json with the definitions in
// scripts/data/glosses.json. Run: npm run apply:glosses
//
// build-corpus.ts does this too, as the last step of a full build. This script
// exists so editing the word list doesn't mean re-fetching and re-parsing the
// whole corpus to change 491 strings in one committed file — the other outputs
// don't carry glosses at all, so nothing else can drift.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { applyGlossOverrides, loadGlossOverrides } from './lib/glossOverrides.ts'

const LEMMAS_FILE = path.resolve(import.meta.dirname, '..', 'public', 'data', 'lemmas.json')

interface Lemma {
  lemma: string
  gloss: string
  strongs: string
  freq: number
}

const lemmas: Lemma[] = JSON.parse(readFileSync(LEMMAS_FILE, 'utf8'))
const before = lemmas.map((l) => l.gloss)

const overrides = loadGlossOverrides()
const { applied, unmatched } = applyGlossOverrides(lemmas, overrides)

if (unmatched.length > 0) {
  console.error(
    `${unmatched.length} of ${Object.keys(overrides).length} entries match no lemma in the corpus:`,
  )
  for (const lemma of unmatched) console.error(`  ${lemma}`)
  process.exit(1)
}

const changed = lemmas.filter((l, i) => l.gloss !== before[i])
writeFileSync(LEMMAS_FILE, JSON.stringify(lemmas))

console.log(`${applied} definitions applied across ${lemmas.length} lemmas.`)
console.log(`${changed.length} glosses differ from what was there before:\n`)
for (const l of changed.slice(0, 25)) {
  console.log(`  ${l.lemma.padEnd(18)} ${l.gloss}`)
}
if (changed.length > 25) console.log(`  ... and ${changed.length - 25} more`)
