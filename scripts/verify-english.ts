// Checks src/lib/englishVerb.ts against the whole corpus: every verb lemma
// crossed with every RMAC code it actually appears under. Run: npm run verify:english
//
// The point is coverage and the shape of the output, not translation quality —
// nobody can assert "he/she/it was" is the right English for ἦν from a script.
// So it asserts the cases that are checkable (spot-checks by hand, no empty or
// malformed renderings, no verb left unrendered) and prints a sample to read.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { VERB_FORMS } from '../src/data/verbForms.ts'
import { englishVerbForm, parseVerbCode } from '../src/lib/englishVerb.ts'
import type { LemmaEntry, RmacEntry } from '../src/lib/corpusTypes.ts'

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data')
const read = (file: string) => JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8'))

let failures = 0
function check(label: string, ok: boolean, detail = '') {
  if (ok) console.log(`  ok   ${label}${detail ? ` :: ${detail}` : ''}`)
  else {
    failures++
    console.log(`  FAIL ${label}${detail ? ` :: ${detail}` : ''}`)
  }
}

const lemmas: LemmaEntry[] = read('lemmas.json')
const rmacTable: RmacEntry[] = read('rmac-table.json')
const booksIndex: { id: number }[] = read('books-index.json')

// --- code parsing ---
const finite = parseVerbCode('V-IAI-3S')
check(
  'finite code gives person, number and voice',
  finite?.person === '3' && finite?.number === 'S' && finite?.voice === 'A' && !finite?.infinitive,
  JSON.stringify(finite),
)
check('a 2nd-aorist prefix does not shift the voice letter', parseVerbCode('V-2AAI-3S')?.voice === 'A')
check('a passive deponent is not read as a passive', parseVerbCode('V-AOI-3P')?.voice === 'O')
check('participle code gives number only', parseVerbCode('V-PAP-NSM')?.number === 'S' && parseVerbCode('V-PAP-NSM')?.person === undefined)
check('infinitive code gives neither', parseVerbCode('V-PAN')?.infinitive === true)
check('a non-verb code is rejected', parseVerbCode('N-NSF') === null)

// --- hand-checked renderings ---
const form = (id: string) => {
  const found = VERB_FORMS.find((f) => f.id === id)
  if (!found) throw new Error(`no such verb form: ${id}`)
  return found
}
const cases: [gloss: string, code: string, formId: string, want: string][] = [
  ['I am', 'V-IAI-3S', 'impf.act.ind', 'he/she/it was'],
  ['I am', 'V-PAI-1S', 'pres.act.ind', 'I am'],
  ['I am', 'V-PAI-2S', 'pres.act.ind', 'you are'],
  ['I am', 'V-PAI-3P', 'pres.act.ind', 'they are'],
  ['I come/go', 'V-PAI-3S', 'pres.act.ind', 'he/she/it comes/goes'],
  ['I come/go', 'V-2AAI-3S', 'aor2.act.ind', 'he/she/it came/went'],
  ['I come/go', 'V-FDI-3S', 'fut.mid.ind', 'he/she/it will come/go'],
  ['I come/go', 'V-2RAI-3S', 'perf.act.ind', 'he/she/it has come/gone'],
  ['I speak', 'V-AAI-1P', 'aor1.act.ind', 'we spoke'],
  ['I speak', 'V-PPI-3S', 'pres.pass.ind', 'he/she/it is spoken'],
  ['I speak', 'V-APS-3S', 'aor1.pass.subj', '(that) he/she/it may be spoken'],
  ['I loose', 'V-PAP-NSM', 'pres.act.ptcp', 'loosing'],
  ['I loose', 'V-AAP-NSM', 'aor1.act.ptcp', 'having loosed'],
  ['I loose', 'V-PAN', 'pres.act.inf', 'to loose'],
  ['I loose', 'V-PAM-2S', 'pres.act.impv', 'loose!'],
  ['I loose', 'V-PAM-3S', 'pres.act.impv', 'let him/her/it loose'],
  ['I go out', 'V-PAI-3S', 'pres.act.ind', 'he/she/it goes out'],
  ['I am able', 'V-PNI-1S', 'pres.mid.ind', 'I am able'],
  ['I am able', 'V-INI-3S', 'impf.mid.ind', 'he/she/it was able'],
  ['I carry', 'V-PAI-3S', 'pres.act.ind', 'he/she/it carries'],
  ['I baptize', 'V-API-3P', 'aor1.pass.ind', 'they were baptized'],
  ['I write', 'V-2RPI-3S', 'perf.pass.ind', 'he/she/it has been written'],
  // A gloss listing several senses conjugates the first and drops the rest,
  // which is the shape an imported word list usually comes in.
  ['I say, speak', 'V-PAI-3S', 'pres.act.ind', 'he/she/it says'],
  ['I have, hold', 'V-PAI-3S', 'pres.act.ind', 'he/she/it has'],
  ['I am, exist, live', 'V-IAI-3P', 'impf.act.ind', 'they were'],
  ['I come, go', 'V-2AAI-3S', 'aor2.act.ind', 'he/she/it came'],
  // Deponents: passive or middle in shape, active in meaning.
  ['I go', 'V-AOI-3S', 'aor1.pass.ind', 'he/she/it went'],
  ['I answer', 'V-AOP-NSM', 'aor1.pass.ptcp', 'having answered'],
  ['I come/go', 'V-PNI-3S', 'pres.midpass.ind', 'he/she/it comes/goes'],
]
for (const [gloss, code, formId, want] of cases) {
  const got = englishVerbForm(gloss, code, form(formId))
  check(`${gloss} + ${code}`, got === want, got === want ? String(got) : `got "${got}", want "${want}"`)
}

// --- an unconjugatable gloss opts out rather than guessing ---
check('a gloss not headed "I " renders nothing', englishVerbForm('sabachthani', 'V-PAI-3S', form('pres.act.ind')) === null)
check('an impersonal gloss renders nothing', englishVerbForm('it is permitted', 'V-PAI-3S', form('pres.act.ind')) === null)

// --- whole-corpus sweep: every verb lemma against every code it appears under ---
const seen = new Map<number, Set<number>>()
for (const book of booksIndex) {
  for (const verse of read(`books/${book.id}.json`) as { t: { l: number; r: number }[] }[]) {
    for (const tok of verse.t) {
      if (rmacTable[tok.r].form < 0) continue
      if (!seen.has(tok.l)) seen.set(tok.l, new Set())
      seen.get(tok.l)!.add(tok.r)
    }
  }
}

let rendered = 0
let unrendered = 0
const unrenderedLemmas = new Set<string>()
const malformed: string[] = []
for (const [lemmaId, codes] of seen) {
  for (const rmacId of codes) {
    const entry = rmacTable[rmacId]
    const english = englishVerbForm(lemmas[lemmaId].gloss, entry.code, VERB_FORMS[entry.form])
    if (english === null) {
      unrendered++
      unrenderedLemmas.add(`${lemmas[lemmaId].lemma} "${lemmas[lemmaId].gloss}"`)
      continue
    }
    rendered++
    // Double spaces, a dangling slash, or a stray "undefined" all mean a branch
    // built its phrase out of something it didn't have.
    if (/\s\s|\/\s|\s\/|undefined|^\s|\s$/.test(english) || english.length === 0) {
      malformed.push(`${entry.code} ${lemmas[lemmaId].gloss} -> "${english}"`)
    }
  }
}

check('every rendering is well-formed', malformed.length === 0, malformed.slice(0, 5).join(' | '))
check('the sweep covered the whole verb vocabulary', seen.size === 1844, String(seen.size))
check(
  'at most 17 lemmas render nothing (the impersonals and transliterations)',
  unrenderedLemmas.size <= 17,
  [...unrenderedLemmas].join(', '),
)
console.log(`\n  ${rendered} lemma+code pairs rendered, ${unrendered} declined`)
console.log(`  lemmas with no rendering: ${[...unrenderedLemmas].join(', ')}`)

// --- a sample to read ---
console.log('\nSample renderings:')
const samples: [string, string][] = []
for (const [lemmaId, codes] of seen) {
  if (lemmas[lemmaId].freq < 120) continue
  for (const rmacId of [...codes].slice(0, 3)) {
    const entry = rmacTable[rmacId]
    const english = englishVerbForm(lemmas[lemmaId].gloss, entry.code, VERB_FORMS[entry.form])
    if (english) samples.push([`${lemmas[lemmaId].lemma} ${entry.code}`, english])
  }
}
for (const [label, english] of samples.slice(0, 70)) console.log(`  ${label.padEnd(28)} ${english}`)

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
