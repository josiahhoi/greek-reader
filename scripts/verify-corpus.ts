// Sanity-checks the output of build-corpus.ts. Run after every build.

import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { CONCEPT_IDS } from '../src/data/concepts.ts'
import { BOOKS } from '../src/data/books.ts'

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data')

let failures = 0
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ok   ${label}`)
  } else {
    failures++
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const meta = JSON.parse(readFileSync(path.join(DATA_DIR, 'meta.json'), 'utf8'))
console.log('meta.json:', meta)

check('token count is 138013', meta.tokenCount === 138013, String(meta.tokenCount))
check('verse count is 7941', meta.verseCount === 7941, String(meta.verseCount))
check('concept count matches CONCEPT_IDS', meta.conceptCount === CONCEPT_IDS.length)

const lemmas = JSON.parse(readFileSync(path.join(DATA_DIR, 'lemmas.json'), 'utf8'))
check('lemma count matches meta', lemmas.length === meta.lemmaCount)
check('every lemma has a non-empty gloss', lemmas.every((l: { gloss: string }) => l.gloss.length > 0))
check(
  'lemma frequencies sum to token count',
  lemmas.reduce((s: number, l: { freq: number }) => s + l.freq, 0) === meta.tokenCount,
)

const booksIndex = JSON.parse(readFileSync(path.join(DATA_DIR, 'books-index.json'), 'utf8'))
check('all 27 NT books present', booksIndex.length === 27, `got ${booksIndex.length}`)
check(
  'book ids match BOOKS (40-66)',
  booksIndex.every((b: { id: number }, i: number) => b.id === BOOKS[i].id),
)

let totalTokensInBooks = 0
let totalVersesInBooks = 0
let zeroConceptTokens = 0
const bookFiles = readdirSync(path.join(DATA_DIR, 'books'))
check('one file per indexed book', bookFiles.length === booksIndex.length)

for (const entry of booksIndex) {
  const verses = JSON.parse(readFileSync(path.join(DATA_DIR, 'books', `${entry.id}.json`), 'utf8'))
  totalVersesInBooks += verses.length
  for (const v of verses) {
    for (const tok of v.t) {
      totalTokensInBooks++
      if (tok.c.length === 0) zeroConceptTokens++
      if (tok.l < 0 || tok.l >= lemmas.length) {
        check(`lemma id in range (book ${entry.id})`, false, `lemma id ${tok.l}`)
      }
      for (const cIdx of tok.c) {
        if (cIdx < 0 || cIdx >= CONCEPT_IDS.length) {
          check(`concept index in range (book ${entry.id})`, false, `index ${cIdx}`)
        }
      }
    }
  }
}
check('sum of per-book verses matches meta', totalVersesInBooks === meta.verseCount)
check('sum of per-book tokens matches meta', totalTokensInBooks === meta.tokenCount)
check('100% of tokens have at least one concept', zeroConceptTokens === 0, `${zeroConceptTokens} with none`)

// Round-trip spot check: John 1:1 should read exactly as the well-known Greek text.
const john = JSON.parse(readFileSync(path.join(DATA_DIR, 'books', '43.json'), 'utf8'))
const john1_1 = john.find((v: { c: number; v: number }) => v.c === 1 && v.v === 1)
const rendered = john1_1.t.map((tok: { b: string; t: string; a: string }) => tok.b + tok.t + tok.a).join(' ')
const expected = 'Ἐν ἀρχῇ ἦν ὁ Λόγος, καὶ ὁ Λόγος ἦν πρὸς τὸν Θεόν, καὶ Θεὸς ἦν ὁ Λόγος.'
check('John 1:1 round-trips to the expected Greek text', rendered === expected, rendered)

console.log()
if (failures > 0) {
  console.error(`${failures} check(s) failed.`)
  process.exit(1)
} else {
  console.log('All checks passed.')
}
