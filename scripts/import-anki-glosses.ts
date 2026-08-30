// Converts an Anki deck export into the definition list the corpus ships.
//
//   npm run import:glosses -- ~/Downloads/Koine_Greek.apkg --out scripts/data/glosses.json
//
// That file is a build input: build-corpus.ts applies it to every lemma it
// matches, and npm run apply:glosses replays it over the committed
// public/data/lemmas.json without a full rebuild. This script is how it was
// produced in the first place, and how to regenerate it after editing the deck.
//
// It writes elsewhere by default, since overwriting the shipped list is a
// deliberate act — check the unmatched-headword report before you do.

import { spawnSync } from 'node:child_process'
import { zstdDecompressSync } from 'node:zlib'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { firstPersonGloss } from './lib/verbGloss.ts'
import type { LemmaEntry } from '../src/lib/corpusTypes.ts'

/**
 * Deck headwords the corpus files under a different lemma altogether — a
 * different principal part, or the adjective a neuter substantive belongs to.
 * Deponents listed under the other voice are handled by the -ομαι/-ω swap
 * below rather than one by one.
 */
const ALIASES: Record<string, string> = {
  οἶδα: 'εἴδω',
  ἀπόλλυμι: 'ἀπολλύω',
  δείκνυμι: 'δεικνύω',
  ἱερόν: 'ἱερός',
  ἱλαστήριον: 'ἱλαστήριος',
  ἔξεστιν: 'ἔξεστι',
}

/** The collection database, whatever compression this Anki version exported. */
function readCollection(apkg: string): Buffer {
  for (const name of ['collection.anki21b', 'collection.anki21', 'collection.anki2']) {
    const res = spawnSync('unzip', ['-p', apkg, name], { maxBuffer: 512 * 1024 * 1024 })
    if (res.status !== 0 || !res.stdout?.length) continue
    const raw = res.stdout
    // .anki21b is zstd-compressed; the older files are plain SQLite.
    const zstd = raw[0] === 0x28 && raw[1] === 0xb5 && raw[2] === 0x2f && raw[3] === 0xfd
    const db = zstd ? Buffer.from(zstdDecompressSync(raw)) : raw
    if (db.subarray(0, 15).toString() !== 'SQLite format 3') continue
    // A modern export ships a stub collection.anki2 for old clients; skip it.
    if (name === 'collection.anki2' && db.length < 100_000) continue
    console.log(`  read ${name} (${db.length.toLocaleString()} bytes)`)
    return db
  }
  throw new Error(`No usable collection found inside ${apkg}`)
}

/** Anki stores fields as HTML with media tags; we want the plain text. */
function clean(field: string): string {
  return field
    .replace(/\[sound:[^\]]*\]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * "ἄνθρωπος, -ου, ὁ" -> "ἄνθρωπος", "δεικνύω - δείκνυμι" -> "δεικνύω". The
 * parsing tail and the second principal part are not part of the word.
 *
 * A field holding a real two-word phrase ("εἰ μή") is returned whole, so it
 * fails to match rather than silently overwriting the gloss of its first word.
 */
function headword(field: string): string {
  const text = clean(field).split(',')[0].split(' - ')[0].split('(')[0].trim()
  return text.normalize('NFC')
}

/** Lower-cased and stripped of accents and breathings, for a last-resort match. */
function bare(word: string): string {
  return word
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
}

/**
 * The corpus lemma a deck headword names, or null.
 *
 * Four attempts, narrowing in confidence: the word itself; a lemma the corpus
 * files elsewhere; the other voice, since a deck follows the grammars in listing
 * ἐκπορεύομαι where OpenGNT lists ἐκπορεύω (and εὐαγγελίζω where it lists
 * εὐαγγελίζομαι); and finally the same letters ignoring accents, breathings and
 * case, which catches ἀποθνῄσκω/ἀποθνήσκω and σατανᾶς/Σατανᾶς. The last is
 * accepted only when exactly one lemma has those letters.
 */
function findLemma(
  word: string,
  byName: Map<string, string>,
  byBare: Map<string, string[]>,
): string | null {
  const direct = byName.get(word)
  if (direct) return direct

  const aliased = ALIASES[word] && byName.get(ALIASES[word])
  if (aliased) return aliased

  const swapped = word.endsWith('ομαι')
    ? [`${word.slice(0, -4)}ω`, `${word.slice(0, -4)}ομαι`]
    : word.endsWith('ω')
      ? [`${word.slice(0, -1)}ομαι`]
      : []
  for (const candidate of swapped) {
    const hit = byName.get(candidate)
    if (hit) return hit
  }

  const sameLetters = byBare.get(bare(word))
  if (sameLetters?.length === 1) return byName.get(sameLetters[0]) ?? null
  return null
}

const [apkg, ...rest] = process.argv.slice(2)
if (!apkg) {
  console.error('usage: npm run import:glosses -- <deck.apkg> [--out glosses.json]')
  process.exit(1)
}
const outArg = rest.indexOf('--out')
const outPath = outArg >= 0 ? rest[outArg + 1] : 'greek-reader-glosses.json'

console.log(`Reading ${path.basename(apkg)}`)
const dbBytes = readCollection(apkg)
const dir = mkdtempSync(path.join(tmpdir(), 'anki-'))
const dbPath = path.join(dir, 'collection.sqlite')
writeFileSync(dbPath, dbBytes)
const db = new DatabaseSync(dbPath, { readOnly: true })

// Find every notetype carrying both a Greek word and a definition, by field
// name rather than position, so a differently-built deck still works.
const notetypes = db.prepare('select id, name from notetypes').all() as { id: number; name: string }[]
const glosses: Record<string, string> = {}
const unmatched: string[] = []
let notesRead = 0

const lemmas: LemmaEntry[] = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '..', 'public', 'data', 'lemmas.json'), 'utf8'),
)
// Corpus lemma keys sometimes list variants ("Δαυείδ, Δαυίδ, Δαβίδ"); any of
// them should match a deck headword.
const byName = new Map<string, string>()
for (const l of lemmas) {
  for (const part of l.lemma.split(',')) byName.set(part.trim().normalize('NFC'), l.lemma)
}
const byBare = new Map<string, string[]>()
for (const name of byName.keys()) {
  const key = bare(name)
  byBare.set(key, [...(byBare.get(key) ?? []), name])
}

for (const nt of notetypes) {
  const fields = db
    .prepare('select name, ord from fields where ntid = ? order by ord')
    .all(nt.id) as { name: string; ord: number }[]
  const greekOrd = fields.find((f) => /^greek$/i.test(f.name))?.ord
  const defOrd = fields.find((f) => /^(definition|meaning|english|back)$/i.test(f.name))?.ord
  if (greekOrd === undefined || defOrd === undefined) {
    console.log(`  skipping notetype "${nt.name}" (no Greek/Definition field pair)`)
    continue
  }
  const notes = db.prepare('select flds from notes where mid = ?').all(nt.id) as { flds: string }[]
  console.log(`  notetype "${nt.name}": ${notes.length} notes`)
  for (const note of notes) {
    notesRead++
    const parts = note.flds.split('\x1f')
    const word = headword(parts[greekOrd] ?? '')
    const definition = clean(parts[defOrd] ?? '')
    if (!word || !definition) continue
    const lemma = findLemma(word, byName, byBare)
    if (!lemma) {
      unmatched.push(word)
      continue
    }
    // Keep the deck's own wording, but head a verb in the 1st person if it
    // isn't already, so the parsing card's English line keeps rendering.
    glosses[lemma] = firstPersonGloss(lemma, definition) ?? definition
  }
}
db.close()

writeFileSync(outPath, JSON.stringify(glosses, null, 0) + '\n')
const bytes = Buffer.byteLength(JSON.stringify(glosses))
console.log(`\n  notes read:            ${notesRead}`)
console.log(`  definitions mapped:    ${Object.keys(glosses).length}`)
console.log(`  headwords unmatched:   ${unmatched.length}`)
if (unmatched.length) console.log(`    ${unmatched.join(' ')}`)
console.log(`\nWrote ${outPath} (${(bytes / 1024).toFixed(1)} KB).`)
console.log('To ship it: copy over scripts/data/glosses.json, then npm run apply:glosses && npm run verify:corpus.')
