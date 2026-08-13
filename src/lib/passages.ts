// Groups consecutive verses into passages using the source text's own
// paragraph marks (¶), rather than an arbitrary verse-count window. Verified
// against the compiled corpus: 1,546 paragraphs across the NT, averaging 5.1
// verses each (range 1–23), so this is a real literary unit, not a guess.

import type { CorpusVerse } from './corpusTypes'
import { scoreVerse, type ScoredVerse, type ScoringContext } from './scorer'

export interface Passage {
  bookId: number
  verses: CorpusVerse[]
}

export function buildPassages(books: Map<number, CorpusVerse[]>): Passage[] {
  const passages: Passage[] = []

  for (const [bookId, verses] of books) {
    let current: CorpusVerse[] = []
    for (const verse of verses) {
      current.push(verse)
      const lastToken = verse.t[verse.t.length - 1]
      if (lastToken?.a.includes('¶')) {
        passages.push({ bookId, verses: current })
        current = []
      }
    }
    // Trailing verses after the last paragraph mark (or a whole book with none) still form a passage.
    if (current.length > 0) passages.push({ bookId, verses: current })
  }

  return passages
}

export interface ScoredPassage {
  bookId: number
  verses: ScoredVerse[]
  totalBlockers: number
  totalTokens: number
}

export function scorePassage(passage: Passage, ctx: ScoringContext): ScoredPassage {
  const verses = passage.verses.map((v) => scoreVerse(passage.bookId, v, ctx))
  const totalBlockers = verses.reduce((sum, v) => sum + v.blockers, 0)
  const totalTokens = verses.reduce((sum, v) => sum + v.tokenCount, 0)
  return { bookId: passage.bookId, verses, totalBlockers, totalTokens }
}

export interface RankPassageOptions {
  /** Same meaning as verse tolerance — average unknown words per verse you'll tolerate,
   *  scaled by passage length rather than applied as a flat per-verse cap. This is what
   *  lets a 10-verse passage need proportionally more slack than a 2-verse one, using the
   *  exact same slider the reader already has for single verses. */
  tolerance: number
}

/**
 * Ranks passages eligible under the tolerance gate, **length first** — the
 * point of this over plain verse ranking is surfacing connected reading, so
 * a longer eligible passage outranks a shorter one even at slightly higher
 * blocker density. Density (blockers per verse) is the tiebreaker among
 * passages of the same length, so a cleaner passage still wins over a
 * noisier one of equal size.
 */
export function rankPassages(
  passages: Passage[],
  ctx: ScoringContext,
  options: RankPassageOptions,
): ScoredPassage[] {
  const scored = passages
    .map((p) => scorePassage(p, ctx))
    .filter((p) => p.totalBlockers <= options.tolerance * p.verses.length)

  scored.sort((a, b) => {
    if (a.verses.length !== b.verses.length) return b.verses.length - a.verses.length
    const densityA = a.totalBlockers / a.verses.length
    const densityB = b.totalBlockers / b.verses.length
    return densityA - densityB
  })

  return scored
}
