// Ranks verses by how readable they are, given a learner's known vocabulary and
// known verb forms. A token "blocks" a verse when its lemma isn't known OR it's
// a verb whose form (tense+voice+mood) isn't known — failing on both axes still
// only counts once, since it's still just one word you can't get past.
//
// Non-verbs never block on grammar: cases, genders, pronoun types and the rest
// are treated as always known (see the gating model in the plan).

import type { BookIndexEntry, CorpusVerse, RmacEntry } from './corpusTypes'

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

/** Resolves a token's rmac index to its gating verb-form id, or null for non-verbs. */
function formIdOf(rmacIdx: number, rmacTable: RmacEntry[], verbFormIds: string[]): string | null {
  const form = rmacTable[rmacIdx]?.form ?? -1
  return form >= 0 ? verbFormIds[form] : null
}

export interface ScoringContext {
  rmacTable: RmacEntry[]
  verbFormIds: string[]
  knownLemmas: ReadonlySet<number>
  knownForms: ReadonlySet<string>
}

export function scoreVerse(bookId: number, verse: CorpusVerse, ctx: ScoringContext): ScoredVerse {
  const blockerIndices: number[] = []
  verse.t.forEach((tok, i) => {
    const lemmaKnown = ctx.knownLemmas.has(tok.l)
    const formId = formIdOf(tok.r, ctx.rmacTable, ctx.verbFormIds)
    const grammarKnown = formId === null || ctx.knownForms.has(formId)
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
  ctx: ScoringContext,
  options: RankOptions,
): ScoredVerse[] {
  const { tolerance, minLength = 5, maxLength = 20 } = options
  const scored: ScoredVerse[] = []

  for (const [bookId, verses] of books) {
    for (const verse of verses) {
      const s = scoreVerse(bookId, verse, ctx)
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
  ctx: ScoringContext,
): { bookId: number; abbr: string; readableTokens: number; totalTokens: number }[] {
  const abbrById = new Map(bookIndex.map((b) => [b.id, b.abbr]))
  const out: { bookId: number; abbr: string; readableTokens: number; totalTokens: number }[] = []

  for (const [bookId, verses] of books) {
    let readableTokens = 0
    let totalTokens = 0
    for (const verse of verses) {
      for (const tok of verse.t) {
        totalTokens++
        const formId = formIdOf(tok.r, ctx.rmacTable, ctx.verbFormIds)
        const grammarKnown = formId === null || ctx.knownForms.has(formId)
        if (ctx.knownLemmas.has(tok.l) && grammarKnown) readableTokens++
      }
    }
    out.push({ bookId, abbr: abbrById.get(bookId) ?? String(bookId), readableTokens, totalTokens })
  }

  return out.sort((a, b) => a.bookId - b.bookId)
}
