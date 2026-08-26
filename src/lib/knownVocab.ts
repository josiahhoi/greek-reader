// Marking vocabulary as already known, in bulk by frequency or one word at a
// time. Pure profile transforms, so scripts/verify-srs.ts can exercise them.
//
// Everything here goes through the flashcard deck rather than through a
// separate "I know these" setting. A word you say you know gets the same card
// the "I already know this" button writes: mature on the spot, parked at the
// interval ceiling, so it counts as known vocabulary now and still comes back
// once to be confirmed. One source of truth, and a word you turn out not to
// know after all falls out of "known" on its own when you miss that review.

import type { LemmaEntry } from './corpusTypes'
import type { Profile } from './profile'
import { isLemmaKnown } from './deriveKnown'
import { bump } from './activity'
import { todayKey } from './dates'
import { gradeCard, knownCard, type SrsDeck } from './srs'

/** Frequency tiers offered for "I already know everything this common". */
export const KNOWN_TIERS = [100, 50, 30, 20, 15, 10, 5] as const

/**
 * Marks every lemma occurring at least `minFreq` times as known.
 *
 * Words that already have a card are left alone, whatever state that card is
 * in: a card you are part-way through learning is worth more than a blanket
 * claim, and re-running the same tier must not keep resetting it.
 *
 * Deliberately does not count towards the day's activity, unlike marking a
 * single word. Declaring the vocabulary you arrived with is setup, not study,
 * and scoring it would make the day you signed up the best day you ever had.
 */
export function markKnownAbove(
  profile: Profile,
  lemmas: LemmaEntry[],
  minFreq: number,
  now: Date = new Date(),
): Profile {
  const deck: SrsDeck = { ...(profile.srs ?? {}) }
  const excluded = new Set(profile.excludedLemmas)
  let marked = 0
  for (const lemma of lemmas) {
    if (lemma.freq < minFreq || deck[lemma.lemma]) continue
    deck[lemma.lemma] = knownCard(undefined, now)
    excluded.delete(lemma.lemma)
    marked++
  }
  if (marked === 0) return profile
  return { ...profile, srs: deck, excludedLemmas: [...excluded] }
}

/**
 * Converts a profile still carrying the old `vocabThreshold` setting into cards
 * and drops the field, so knowledge lives in one place. Returns the profile
 * unchanged when there is nothing to convert, so callers can run it on load.
 *
 * The conversion is faithful: every word the threshold called known becomes a
 * mature card, which is exactly what "known" means now. What changes is that
 * those words are now in the deck and will each come back once, and that
 * missing one of those reviews un-knows the word rather than leaving it known
 * forever by virtue of its frequency.
 */
export function migrateKnownVocab(
  profile: Profile,
  lemmas: LemmaEntry[],
  now: Date = new Date(),
): Profile {
  if (profile.vocabThreshold === undefined) return profile
  const converted = markKnownAbove(profile, lemmas, profile.vocabThreshold, now)
  const migrated = { ...converted }
  delete migrated.vocabThreshold
  return migrated
}

/** How many of `lemmas` `markKnownAbove` would actually add at this tier. */
export function countNewlyKnownAbove(
  profile: Profile,
  lemmas: LemmaEntry[],
  minFreq: number,
): number {
  const deck = profile.srs ?? {}
  return lemmas.filter((l) => l.freq >= minFreq && !deck[l.lemma]).length
}

/**
 * Flips one word between known and unknown.
 *
 * Marking known writes the same mature card as everywhere else. Un-marking
 * fails the card instead of deleting it, which puts the word back in the deck
 * due today — the honest reading of "no, I don't know this" — and records an
 * exclusion if the word would still count as known some other way, since
 * `extraKnownLemmas` from older versions is union-merged across devices and a
 * removal alone would be resurrected by the next sync.
 */
export function toggleKnown(
  profile: Profile,
  lemma: LemmaEntry,
  now: Date = new Date(),
): Profile {
  const deck: SrsDeck = { ...(profile.srs ?? {}) }
  const excluded = new Set(profile.excludedLemmas)
  const extra = new Set(profile.extraKnownLemmas)

  if (isLemmaKnown(profile, lemma)) {
    deck[lemma.lemma] = gradeCard(deck[lemma.lemma], false, now)
    extra.delete(lemma.lemma)
    const withoutExtra = { ...profile, extraKnownLemmas: [], srs: deck }
    if (isLemmaKnown(withoutExtra, lemma)) excluded.add(lemma.lemma)
    return {
      ...profile,
      srs: deck,
      extraKnownLemmas: [...extra],
      excludedLemmas: [...excluded],
    }
  }

  deck[lemma.lemma] = knownCard(deck[lemma.lemma], now)
  excluded.delete(lemma.lemma)
  return {
    ...profile,
    srs: deck,
    excludedLemmas: [...excluded],
    activity: bump(profile.activity, 'k', 1, todayKey(now)),
  }
}
