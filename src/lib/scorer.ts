// Ranks verses by how readable they are, given a learner's known lemmas and
// known grammar concepts. A token "blocks" a verse when its lemma isn't
// known OR its concept set isn't fully known — failing on both axes still
// only counts once, since it's still just one word you can't get past.

import type { BookIndexEntry, CorpusVerse } from './corpusTypes'

export interface ScoredVerse {
  bookId: number
  chapter: number
  verse: number
  tokenCount: number
  blockers: number
  /** Indices into the verse's token array that are blocking. */
  blockerIndices: number[]
  raw: CorpusVerse
}

export function scoreVerse(
  bookId: number,
  verse: CorpusVerse,
  knownLemmas: ReadonlySet<number>,
  knownConcepts: ReadonlySet<number>,
): ScoredVerse {
  const blockerIndices: number[] = []
  verse.t.forEach((tok, i) => {
    const lemmaKnown = knownLemmas.has(tok.l)
    const grammarKnown = tok.c.every((c) => knownConcepts.has(c))
    if (!lemmaKnown || !grammarKnown) blockerIndices.push(i)
  })
  return {
    bookId,
    chapter: verse.c,
    verse: verse.v,
    tokenCount: verse.t.length,
    blockers: blockerIndices.length,
    blockerIndices,
    raw: verse,
  }
}

export interface RankOptions {
  /** Max blocking tokens a verse may have and still be "eligible" (i+1-style tolerance). */
  tolerance: number
  /** Verses shorter than this are deprioritized (too little context to be worth reading). */
  minLength?: number
  /** Verses longer than this are deprioritized (overwhelming even at 0 blockers). */
  maxLength?: number
}

/**
 * Score every verse across the loaded books and return the eligible ones
 * (blockers <= tolerance), best-first: fewest blockers, then closest to the
 * length sweet spot.
 */
export function rankVerses(
  books: Map<number, CorpusVerse[]>,
  knownLemmas: ReadonlySet<number>,
  knownConcepts: ReadonlySet<number>,
  options: RankOptions,
): ScoredVerse[] {
  const { tolerance, minLength = 5, maxLength = 20 } = options
  const scored: ScoredVerse[] = []

  for (const [bookId, verses] of books) {
    for (const verse of verses) {
      const s = scoreVerse(bookId, verse, knownLemmas, knownConcepts)
      if (s.blockers <= tolerance) scored.push(s)
    }
  }

  function lengthPenalty(len: number): number {
    if (len < minLength) return minLength - len
    if (len > maxLength) return len - maxLength
    return 0
  }

  scored.sort((a, b) => {
    if (a.blockers !== b.blockers) return a.blockers - b.blockers
    const pa = lengthPenalty(a.tokenCount)
    const pb = lengthPenalty(b.tokenCount)
    if (pa !== pb) return pa - pb
    return a.tokenCount - b.tokenCount
  })

  return scored
}

/** Overall NT coverage: fraction of tokens with no blockers, per book and total. */
export function coverageByBook(
  books: Map<number, CorpusVerse[]>,
  bookIndex: BookIndexEntry[],
  knownLemmas: ReadonlySet<number>,
  knownConcepts: ReadonlySet<number>,
): { bookId: number; abbr: string; readableTokens: number; totalTokens: number }[] {
  const abbrById = new Map(bookIndex.map((b) => [b.id, b.abbr]))
  const out: { bookId: number; abbr: string; readableTokens: number; totalTokens: number }[] = []

  for (const [bookId, verses] of books) {
    let readableTokens = 0
    let totalTokens = 0
    for (const verse of verses) {
      for (const tok of verse.t) {
        totalTokens++
        const lemmaKnown = knownLemmas.has(tok.l)
        const grammarKnown = tok.c.every((c) => knownConcepts.has(c))
        if (lemmaKnown && grammarKnown) readableTokens++
      }
    }
    out.push({ bookId, abbr: abbrById.get(bookId) ?? String(bookId), readableTokens, totalTokens })
  }

  return out.sort((a, b) => a.bookId - b.bookId)
}
