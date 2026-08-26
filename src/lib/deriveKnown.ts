import type { LemmaEntry } from './corpusTypes'
import type { Profile } from './profile'
import { isMature } from './srs'

/**
 * Whether a single lemma counts as known: a flashcard held long enough to be
 * mature, which is what marking a word known writes, unless an explicit
 * exclusion says otherwise. Plus the legacy frequency threshold, honoured only
 * while a profile still carries one — migrateKnownVocab converts it, and the
 * old hand-marked list, into cards on load.
 *
 * A card is the single source because it can be taken back. Knowing a word is a
 * claim the deck goes on testing: miss the review and the interval resets, so
 * the word stops counting as known on its own, with nothing to undo. The lists
 * this replaced were union-merged across devices and so could only ever grow.
 */
export function isLemmaKnown(profile: Profile, lemma: LemmaEntry): boolean {
  if (profile.excludedLemmas.includes(lemma.lemma)) return false
  return (
    (profile.vocabThreshold !== undefined && lemma.freq >= profile.vocabThreshold) ||
    isMature((profile.srs ?? {})[lemma.lemma])
  )
}

export function deriveKnownLemmas(profile: Profile, lemmas: LemmaEntry[]): Set<number> {
  const excluded = new Set(profile.excludedLemmas)
  const srs = profile.srs ?? {}
  const threshold = profile.vocabThreshold ?? Infinity
  const out = new Set<number>()
  lemmas.forEach((l, i) => {
    if (excluded.has(l.lemma)) return
    if (l.freq >= threshold || isMature(srs[l.lemma])) out.add(i)
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
