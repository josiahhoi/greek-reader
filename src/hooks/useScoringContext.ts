import { useMemo } from 'react'
import { VERB_FORM_IDS } from '../data/verbForms'
import { deriveKnownForms, deriveKnownLemmas } from '../lib/deriveKnown'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import type { ScoringContext } from '../lib/scorer'

/** Everything the scorer needs, memoized so ranking only recomputes on real changes. */
export function useScoringContext(corpus: CorpusData, profile: Profile): ScoringContext {
  const knownLemmas = useMemo(
    () => deriveKnownLemmas(profile, corpus.lemmas),
    [profile, corpus.lemmas],
  )
  const knownForms = useMemo(() => deriveKnownForms(profile), [profile])

  return useMemo(
    () => ({ rmacTable: corpus.rmacTable, verbFormIds: VERB_FORM_IDS, knownLemmas, knownForms }),
    [corpus.rmacTable, knownLemmas, knownForms],
  )
}
