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

/**
 * Verb-form ids the learner has marked known. Unlike vocabulary there's no
 * threshold shortcut — forms are checked off individually in the grid.
 */
export function deriveKnownForms(profile: Profile): Set<string> {
  return new Set(profile.knownVerbForms)
}
