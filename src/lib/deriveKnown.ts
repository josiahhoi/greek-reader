import { CONCEPT_IDS } from '../data/concepts'
import type { LemmaEntry } from './corpusTypes'
import type { Profile } from './profile'

export function deriveKnownLemmas(profile: Profile, lemmas: LemmaEntry[]): Set<number> {
  const excluded = new Set(profile.excludedLemmas)
  const extra = new Set(profile.extraKnownLemmas)
  const out = new Set<number>()
  lemmas.forEach((l, i) => {
    if (excluded.has(l.lemma)) return
    if (l.freq >= profile.vocabThreshold || extra.has(l.lemma)) out.add(i)
  })
  return out
}

export function deriveKnownConcepts(profile: Profile): Set<number> {
  const idToIndex = new Map(CONCEPT_IDS.map((id, i) => [id, i]))
  const out = new Set<number>()
  for (const id of profile.knownConcepts) {
    const idx = idToIndex.get(id)
    if (idx !== undefined) out.add(idx)
  }
  return out
}
