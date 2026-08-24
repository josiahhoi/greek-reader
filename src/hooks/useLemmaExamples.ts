import { useMemo } from 'react'
import type { CorpusData } from '../lib/loadCorpus'

export interface LemmaExample {
  bookId: number
  chapter: number
  verse: number
  /** Index of the target token within the verse, so it can be emphasised. */
  tokenIdx: number
  tokens: { t: string; b: string; a: string }[]
}

/** Below this a "verse" is a fragment rather than a usable example sentence. */
const MIN_TOKENS = 4
/** Above this the example stops being scannable on a flashcard. */
const MAX_TOKENS = 18

/**
 * One example occurrence per lemma, for the flashcard answer side. Seeing a
 * gloss inside a real verse is the difference between this deck and a paper
 * wordlist, and the corpus is already in memory.
 *
 * Prefers the shortest verse in the usable range so the example reads as a
 * complete thought without filling the card; falls back to the first occurrence
 * of any length when nothing lands in range (very common words are fine either
 * way; very rare ones may only occur in one long verse).
 *
 * Profile-independent, so — like useVerbTokenIndex — it is computed once per
 * corpus load and survives every grade and tab switch. One pass over 138,013
 * tokens, the same cost class as the scorer's sweep.
 */
export function useLemmaExamples(corpus: CorpusData): (LemmaExample | undefined)[] {
  return useMemo(() => {
    const best: (LemmaExample | undefined)[] = new Array(corpus.lemmas.length)
    const bestLen: number[] = new Array(corpus.lemmas.length).fill(Infinity)

    for (const [bookId, verses] of corpus.books) {
      for (const verse of verses) {
        const len = verse.t.length
        const inRange = len >= MIN_TOKENS && len <= MAX_TOKENS
        for (let i = 0; i < len; i++) {
          const lemmaId = verse.t[i].l
          const current = bestLen[lemmaId]
          // An in-range verse always beats an out-of-range one; among equals,
          // shorter wins. `current` starts at Infinity so the first hit sticks.
          const score = inRange ? len : len + 10_000
          if (score >= current) continue
          bestLen[lemmaId] = score
          best[lemmaId] = {
            bookId,
            chapter: verse.c,
            verse: verse.v,
            tokenIdx: i,
            tokens: verse.t.map((tok) => ({ t: tok.t, b: tok.b, a: tok.a })),
          }
        }
      }
    }

    return best
  }, [corpus])
}
