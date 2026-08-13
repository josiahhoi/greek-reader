import { useMemo } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import { buildPassages, type Passage } from '../lib/passages'

/** Passage grouping is independent of the profile, so it's computed once per corpus load. */
export function usePassages(corpus: CorpusData): Passage[] {
  return useMemo(() => buildPassages(corpus.books), [corpus.books])
}
