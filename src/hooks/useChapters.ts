import { useMemo } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import { buildChapters, type Chapter } from '../lib/chapters'

/** Chapter grouping is independent of the profile, so it's computed once per corpus load. */
export function useChapters(corpus: CorpusData): Chapter[] {
  return useMemo(() => buildChapters(corpus.books), [corpus.books])
}
