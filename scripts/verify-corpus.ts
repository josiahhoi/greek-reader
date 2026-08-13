// Sanity-checks the output of build-corpus.ts. Run after every build.

import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { VERB_FORMS, VERB_FORM_IDS } from '../src/data/verbForms.ts'
import { BOOKS } from '../src/data/books.ts'
import type { RmacEntry } from '../src/lib/corpusTypes.ts'

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
check('verb form count is 90', meta.verbFormCount === 90, String(meta.verbFormCount))
check('verb form count matches VERB_FORMS', meta.verbFormCount === VERB_FORMS.length)
check('verb token count is 28113', meta.verbTokenCount === 28113, String(meta.verbTokenCount))

const rmacTable: RmacEntry[] = JSON.parse(readFileSync(path.join(DATA_DIR, 'rmac-table.json'), 'utf8'))
check('rmac table size matches meta', rmacTable.length === meta.rmacCodeCount)
check('every rmac entry has a label', rmacTable.every((r) => r.label.length > 0))
check(
  'every rmac form index is -1 or a valid form',
  rmacTable.every((r) => r.form === -1 || (r.form >= 0 && r.form < VERB_FORMS.length)),
)
check(
  'every V- code maps to a verb form, and no non-V- code does',
  rmacTable.every((r) => (r.code.startsWith('V-') ? r.form >= 0 : r.form === -1)),
  rmacTable
    .filter((r) => (r.code.startsWith('V-') ? r.form < 0 : r.form >= 0))
    .map((r) => r.code)
    .join(', '),
)

const formStats: Record<string, number> = JSON.parse(
  readFileSync(path.join(DATA_DIR, 'form-stats.json'), 'utf8'),
)
check(
  'every form in form-stats is a known verb form id',
  Object.keys(formStats).every((id) => VERB_FORM_IDS.includes(id)),
)
check(
  'all 90 forms are attested in the corpus',
  Object.keys(formStats).length === VERB_FORMS.length,
  `${Object.keys(formStats).length} attested`,
)
check(
  'form-stats sum to the verb token count',
  Object.values(formStats).reduce((a, b) => a + b, 0) === meta.verbTokenCount,
)

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
let verbTokensInBooks = 0
let badRmacIds = 0
let badLemmaIds = 0
const bookFiles = readdirSync(path.join(DATA_DIR, 'books'))
check('one file per indexed book', bookFiles.length === booksIndex.length)

for (const entry of booksIndex) {
  const verses = JSON.parse(readFileSync(path.join(DATA_DIR, 'books', `${entry.id}.json`), 'utf8'))
  totalVersesInBooks += verses.length
  for (const v of verses) {
    for (const tok of v.t) {
      totalTokensInBooks++
      if (tok.l < 0 || tok.l >= lemmas.length) badLemmaIds++
      if (typeof tok.r !== 'number' || tok.r < 0 || tok.r >= rmacTable.length) badRmacIds++
      else if (rmacTable[tok.r].form >= 0) verbTokensInBooks++
    }
  }
}
check('sum of per-book verses matches meta', totalVersesInBooks === meta.verseCount)
check('sum of per-book tokens matches meta', totalTokensInBooks === meta.tokenCount)
check('every token has a valid lemma id', badLemmaIds === 0, `${badLemmaIds} bad`)
check('every token has a valid rmac id', badRmacIds === 0, `${badRmacIds} bad`)
check(
  'verb tokens counted across books match meta',
  verbTokensInBooks === meta.verbTokenCount,
  `${verbTokensInBooks} vs ${meta.verbTokenCount}`,
)

// Round-trip spot check: John 1:1 should read exactly as the well-known Greek text.
const john = JSON.parse(readFileSync(path.join(DATA_DIR, 'books', '43.json'), 'utf8'))
const john1_1 = john.find((v: { c: number; v: number }) => v.c === 1 && v.v === 1)
const rendered = john1_1.t.map((tok: { b: string; t: string; a: string }) => tok.b + tok.t + tok.a).join(' ')
const expected = 'Ἐν ἀρχῇ ἦν ὁ Λόγος, καὶ ὁ Λόγος ἦν πρὸς τὸν Θεόν, καὶ Θεὸς ἦν ὁ Λόγος.'
check('John 1:1 round-trips to the expected Greek text', rendered === expected, rendered)

// --- Hand spot-checks: known forms that must land in specific buckets --------
// These are the cases the verb-form model has to get right, checked against
// grammar rather than against the pipeline's own output.
function formIdForRmac(code: string): string | null {
  const entry = rmacTable.find((r) => r.code === code)
  if (!entry) return null
  return entry.form >= 0 ? VERB_FORM_IDS[entry.form] : null
}
const spotChecks: [string, string, string | null][] = [
  ['V-AAI-3S (ἐγέννησεν)', 'V-AAI-3S', 'aor1.act.ind'],
  ['V-2AAI-3S (ἔβαλεν) is 2nd aorist, not 1st', 'V-2AAI-3S', 'aor2.act.ind'],
  ['V-PNP-ASM (ἐρχόμενον) deponent collapses to middle/passive', 'V-PNP-ASM', 'pres.midpass.ptcp'],
  ['V-IAI-3S (ἦν)', 'V-IAI-3S', 'impf.act.ind'],
  ['V-2RAI-3S 2nd perfect unifies into perfect', 'V-2RAI-3S', 'perf.act.ind'],
  ['N-NSM (a noun) gates nothing', 'N-NSM', null],
  ['T-NSM (the article) gates nothing', 'T-NSM', null],
]
for (const [label, code, want] of spotChecks) {
  const got = formIdForRmac(code)
  check(`spot-check: ${label}`, got === want, `got ${got ?? 'null'}, want ${want ?? 'null'}`)
}

console.log()
if (failures > 0) {
  console.error(`${failures} check(s) failed.`)
  process.exit(1)
} else {
  console.log('All checks passed.')
}
