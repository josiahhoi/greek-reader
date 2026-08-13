// Builds the static corpus data the app reads at runtime, from OpenGNT
// (CC BY-SA 4.0) plus its own RMAC analytical lexicon. Output goes to
// public/data/ and is committed — GitHub Pages serves it as-is, no server.
//
// Run: npm run build:corpus

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { ensureOpenGntCsv, ensureRmacLexiconCsv } from './lib/sources.ts'
import { parseRmacLexicon } from './lib/rmac-lexicon.ts'
import { parseOpenGnt, type RawToken } from './lib/opengnt.ts'
import { decodeRmacDescription } from '../src/lib/rmac.ts'
import { VERB_FORM_IDS } from '../src/data/verbForms.ts'
import { BOOKS } from '../src/data/books.ts'
import type { CorpusToken, CorpusVerse, RmacEntry } from '../src/lib/corpusTypes.ts'

const OUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data')

const VERB_FORM_INDEX: Record<string, number> = Object.fromEntries(
  VERB_FORM_IDS.map((id, i) => [id, i]),
)

interface LemmaEntry {
  id: number
  lemma: string
  gloss: string
  strongs: string
  freq: number
}

type OutToken = CorpusToken
type OutVerse = CorpusVerse

async function main() {
  console.log('Fetching sources (cached in .cache/ after first run)...')
  const csvPath = await ensureOpenGntCsv()
  const lexPath = await ensureRmacLexiconCsv()

  console.log('Parsing RMAC lexicon...')
  const rmacDescriptions = parseRmacLexicon(lexPath)
  console.log(`  ${rmacDescriptions.size} distinct RMAC codes`)

  console.log('Parsing OpenGNT corpus...')
  const tokens = parseOpenGnt(csvPath)
  console.log(`  ${tokens.length} tokens`)

  // --- Intern every distinct RMAC code, fail-fast on gaps ---
  // Each token stores only an index into this table; the table carries both the
  // display parse and the gating verb-form index.
  const rmacTable: RmacEntry[] = []
  const rmacIndexByCode = new Map<string, number>()
  function rmacId(t: RawToken): number {
    const cached = rmacIndexByCode.get(t.rmac)
    if (cached !== undefined) return cached

    const description = rmacDescriptions.get(t.rmac)
    if (description === undefined) {
      throw new Error(
        `Token ${t.book}.${t.chapter}.${t.verse} "${t.text}" uses RMAC code "${t.rmac}", ` +
          `which is not in the analytical lexicon.`,
      )
    }
    const { formId, label } = decodeRmacDescription(t.rmac, description)
    let form = -1
    if (formId !== null) {
      form = VERB_FORM_INDEX[formId] ?? -1
      if (form === -1) {
        throw new Error(
          `RMAC ${t.rmac} decoded to verb form "${formId}", which is not in VERB_FORMS. ` +
            `src/data/verbForms.ts is out of sync with the decoder.`,
        )
      }
    }

    const idx = rmacTable.length
    rmacTable.push({ code: t.rmac, label, form })
    rmacIndexByCode.set(t.rmac, idx)
    return idx
  }

  // --- Build lemma table (first-seen gloss/strongs, frequency across corpus) ---
  const lemmaIndex = new Map<string, LemmaEntry>()
  function lemmaId(t: RawToken): number {
    let entry = lemmaIndex.get(t.lemma)
    if (!entry) {
      entry = {
        id: lemmaIndex.size,
        lemma: t.lemma,
        gloss: t.glossDict,
        strongs: t.strongs,
        freq: 0,
      }
      lemmaIndex.set(t.lemma, entry)
    }
    entry.freq++
    return entry.id
  }

  // --- Walk tokens, grouping into verses, per book ---
  const formTokenCounts = new Map<number, number>()
  let verbTokenCount = 0
  const booksOut = new Map<number, Map<string, OutVerse>>()
  const bookVerseOrder = new Map<number, string[]>()

  for (const t of tokens) {
    const id = lemmaId(t)
    const rIdx = rmacId(t)
    const form = rmacTable[rIdx].form
    if (form >= 0) {
      verbTokenCount++
      formTokenCounts.set(form, (formTokenCounts.get(form) ?? 0) + 1)
    }

    if (!booksOut.has(t.book)) {
      booksOut.set(t.book, new Map())
      bookVerseOrder.set(t.book, [])
    }
    const verseMap = booksOut.get(t.book)!
    const verseKey = `${t.chapter}.${t.verse}`
    let verse = verseMap.get(verseKey)
    if (!verse) {
      verse = { c: t.chapter, v: t.verse, t: [] }
      verseMap.set(verseKey, verse)
      bookVerseOrder.get(t.book)!.push(verseKey)
    }
    verse.t.push({
      t: t.text,
      b: t.before,
      a: t.after,
      l: id,
      r: rIdx,
      g: t.glossLiteral,
      s: t.glossStudy,
    })
  }

  // --- Write output ---
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true })
  mkdirSync(path.join(OUT_DIR, 'books'), { recursive: true })

  const lemmas = [...lemmaIndex.values()].sort((a, b) => a.id - b.id)
  writeFileSync(
    path.join(OUT_DIR, 'lemmas.json'),
    JSON.stringify(lemmas.map(({ lemma, gloss, strongs, freq }) => ({ lemma, gloss, strongs, freq }))),
  )

  writeFileSync(path.join(OUT_DIR, 'rmac-table.json'), JSON.stringify(rmacTable))

  const formStats: Record<string, number> = {}
  for (const [idx, count] of formTokenCounts) formStats[VERB_FORM_IDS[idx]] = count
  writeFileSync(path.join(OUT_DIR, 'form-stats.json'), JSON.stringify(formStats))

  let verseCount = 0
  const booksIndex: { id: number; abbr: string; name: string; verseCount: number }[] = []
  for (const book of BOOKS) {
    const verseMap = booksOut.get(book.id)
    if (!verseMap) continue // not present in this corpus slice
    const order = bookVerseOrder.get(book.id)!
    const verses = order.map((k) => verseMap.get(k)!)
    verseCount += verses.length
    booksIndex.push({ id: book.id, abbr: book.abbr, name: book.name, verseCount: verses.length })
    writeFileSync(path.join(OUT_DIR, 'books', `${book.id}.json`), JSON.stringify(verses))
  }
  writeFileSync(path.join(OUT_DIR, 'books-index.json'), JSON.stringify(booksIndex))

  writeFileSync(
    path.join(OUT_DIR, 'meta.json'),
    JSON.stringify(
      {
        tokenCount: tokens.length,
        verseCount,
        lemmaCount: lemmas.length,
        rmacCodeCount: rmacTable.length,
        verbFormCount: VERB_FORM_IDS.length,
        verbTokenCount,
        generatedAt: new Date().toISOString(),
        source: 'OpenGNT (eliranwong/OpenGNT), CC BY-SA 4.0',
      },
      null,
      2,
    ),
  )

  console.log(`Done. ${tokens.length} tokens, ${verseCount} verses, ${lemmas.length} lemmas.`)
  console.log(
    `      ${verbTokenCount} verb tokens across ${formTokenCounts.size}/${VERB_FORM_IDS.length} forms; ` +
      `${rmacTable.length} interned RMAC codes.`,
  )
  console.log(`Output: ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
