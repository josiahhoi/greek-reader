import { useMemo } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import type { VerbTokenRef } from '../lib/quizTypes'

/**
 * Flattens every verb token in the corpus (28,113 of them) into one array,
 * independent of the profile — computed once per corpus load, not per
 * practice session. Same cost class as the scorer's full sweep (well under
 * 100ms), just filtered down to verbs and done once via useMemo.
 */
export function useVerbTokenIndex(corpus: CorpusData): VerbTokenRef[] {
  return useMemo(() => {
    const out: VerbTokenRef[] = []
    for (const [bookId, verses] of corpus.books) {
      for (const verse of verses) {
        for (const tok of verse.t) {
          const form = corpus.rmacTable[tok.r]?.form ?? -1
          if (form < 0) continue
          out.push({
            text: tok.t,
            before: tok.b,
            after: tok.a,
            lemmaId: tok.l,
            rmacIdx: tok.r,
            formIdx: form,
            contextGloss: tok.g,
            bookId,
            chapter: verse.c,
            verse: verse.v,
          })
        }
      }
    }
    return out
  }, [corpus])
}
