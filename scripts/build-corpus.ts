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
import { CONCEPT_IDS } from '../src/data/concepts.ts'
import { BOOKS } from '../src/data/books.ts'
import type { CorpusToken, CorpusVerse } from '../src/lib/corpusTypes.ts'

const OUT_DIR = path.resolve(import.meta.dirname, '..', 'public', 'data')

const CONCEPT_INDEX: Record<string, number> = Object.fromEntries(
  CONCEPT_IDS.map((id, i) => [id, i]),
)

function conceptIndices(ids: string[]): number[] {
  return ids.map((id) => {
    const i = CONCEPT_INDEX[id]
    if (i === undefined) throw new Error(`Concept id "${id}" not found in CONCEPT_IDS`)
    return i
  })
}

/** Contract verbs and μι-verbs are visible straight from the lemma's ending. */
function verbClassConcepts(lemma: string): string[] {
  const out: string[] = []
  if (/(?:άω|έω|όω)$/.test(lemma)) out.push('verb.contract')
  if (/μι$/.test(lemma)) out.push('verb.mi')
  return out
}

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

  // --- Decode every token's RMAC code to a concept set, fail-fast on gaps ---
  const rmacDecodeCache = new Map<string, string[]>()
  function decodeToken(t: RawToken): string[] {
    let concepts = rmacDecodeCache.get(t.rmac)
    if (concepts) return concepts
    const description = rmacDescriptions.get(t.rmac)
    if (description === undefined) {
      throw new Error(
        `Token ${t.book}.${t.chapter}.${t.verse} "${t.text}" uses RMAC code "${t.rmac}", ` +
          `which is not in the analytical lexicon.`,
      )
    }
    concepts = decodeRmacDescription(t.rmac, description)
    rmacDecodeCache.set(t.rmac, concepts)
    return concepts
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
  const conceptTokenCounts = new Map<number, number>()
  const booksOut = new Map<number, Map<string, OutVerse>>()
  const bookVerseOrder = new Map<number, string[]>()

  for (const t of tokens) {
    const id = lemmaId(t)
    const staticConcepts = decodeToken(t)
    const derivedConcepts = staticConcepts.includes('pos.verb') ? verbClassConcepts(t.lemma) : []
    const cIdx = conceptIndices([...staticConcepts, ...derivedConcepts])
    for (const c of cIdx) conceptTokenCounts.set(c, (conceptTokenCounts.get(c) ?? 0) + 1)

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
      c: cIdx,
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

  const conceptStats: Record<string, number> = {}
  for (const [idx, count] of conceptTokenCounts) conceptStats[CONCEPT_IDS[idx]] = count
  writeFileSync(path.join(OUT_DIR, 'concept-stats.json'), JSON.stringify(conceptStats))

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
        rmacCodeCount: rmacDescriptions.size,
        conceptCount: CONCEPT_IDS.length,
        generatedAt: new Date().toISOString(),
        source: 'OpenGNT (eliranwong/OpenGNT), CC BY-SA 4.0',
      },
      null,
      2,
    ),
  )

  console.log(`Done. ${tokens.length} tokens, ${verseCount} verses, ${lemmas.length} lemmas.`)
  console.log(`Output: ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
