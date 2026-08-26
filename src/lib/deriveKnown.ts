import type { LemmaEntry } from './corpusTypes'
import type { Profile } from './profile'
import { isMature } from './srs'

/**
 * Whether a single lemma counts as known. Two live sources — a flashcard held
 * long enough to be mature, which is what marking a word known now writes, and
 * `extraKnownLemmas` from older versions — plus the legacy frequency threshold
 * while a profile still carries one, and one override that always wins.
 *
 * Maturity is *derived* here rather than written into `extraKnownLemmas` on
 * graduation, and that's deliberate: `extraKnownLemmas` is union-merged across
 * devices, so anything written there can never be removed again. Deriving it
 * means a lapsed card silently stops counting as known the moment its interval
 * resets, with nothing to undo.
 */
export function isLemmaKnown(profile: Profile, lemma: LemmaEntry): boolean {
  if (profile.excludedLemmas.includes(lemma.lemma)) return false
  return (
    (profile.vocabThreshold !== undefined && lemma.freq >= profile.vocabThreshold) ||
    profile.extraKnownLemmas.includes(lemma.lemma) ||
    isMature((profile.srs ?? {})[lemma.lemma])
  )
}

export function deriveKnownLemmas(profile: Profile, lemmas: LemmaEntry[]): Set<number> {
  const excluded = new Set(profile.excludedLemmas)
  const extra = new Set(profile.extraKnownLemmas)
  const srs = profile.srs ?? {}
  const threshold = profile.vocabThreshold ?? Infinity
  const out = new Set<number>()
  lemmas.forEach((l, i) => {
    if (excluded.has(l.lemma)) return
    if (l.freq >= threshold || extra.has(l.lemma) || isMature(srs[l.lemma])) out.add(i)
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
