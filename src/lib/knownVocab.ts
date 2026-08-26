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
 * Whether a blanket "I know these" should give this lemma a card.
 *
 * Two words are skipped. One that already has a card keeps it, whatever state
 * it is in: a card you are part-way through learning is worth more than a
 * blanket claim, and re-running the same tier must not keep resetting it. One
 * you have explicitly excluded keeps that too — a per-word "I don't know this"
 * outranks a claim about a whole frequency band, and the word stays in the pool
 * to be drilled, which is what the exclusion was asking for.
 */
function wantsBlanketCard(profile: Profile, lemma: LemmaEntry, deck: SrsDeck): boolean {
  return !deck[lemma.lemma] && !profile.excludedLemmas.includes(lemma.lemma)
}

/** Gives each named lemma a mature card, skipping the two cases above. */
function markKnownWords(
  profile: Profile,
  lemmas: LemmaEntry[],
  names: ReadonlySet<string>,
  now: Date,
): Profile {
  const deck: SrsDeck = { ...(profile.srs ?? {}) }
  let marked = 0
  for (const lemma of lemmas) {
    if (!names.has(lemma.lemma) || !wantsBlanketCard(profile, lemma, deck)) continue
    deck[lemma.lemma] = knownCard(undefined, now)
    marked++
  }
  return marked === 0 ? profile : { ...profile, srs: deck }
}

/**
 * Marks every lemma occurring at least `minFreq` times as known.
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
  let marked = 0
  for (const lemma of lemmas) {
    if (lemma.freq < minFreq || !wantsBlanketCard(profile, lemma, deck)) continue
    deck[lemma.lemma] = knownCard(undefined, now)
    marked++
  }
  return marked === 0 ? profile : { ...profile, srs: deck }
}

/**
 * Converts the two older ways of knowing a word into cards, so every known word
 * is in the deck and knowledge lives in one place. Returns the profile unchanged
 * when there is nothing to convert, so callers can run it on load.
 *
 * `vocabThreshold` said "everything this frequent is known"; `extraKnownLemmas`
 * listed words ticked off by hand in the Vocabulary tab. Both counted as known
 * without a card, so a word could be known and not in the deck — and neither
 * could ever be taken back by getting the word wrong. Each becomes a mature
 * card, which is exactly what "known" means now: the same words stay known, they
 * are now in the deck, they each come back once to be confirmed, and missing
 * that review un-knows the word.
 *
 * Both fields are cleared. `extraKnownLemmas` is union-merged across devices, so
 * a device still running the old code can hand it back on the next sync; that is
 * harmless, since converting again finds the cards already there and clears the
 * list once more.
 */
export function migrateKnownVocab(
  profile: Profile,
  lemmas: LemmaEntry[],
  now: Date = new Date(),
): Profile {
  const threshold = profile.vocabThreshold
  const extra = profile.extraKnownLemmas
  if (threshold === undefined && extra.length === 0) return profile

  let converted = threshold === undefined ? profile : markKnownAbove(profile, lemmas, threshold, now)
  if (extra.length > 0) converted = markKnownWords(converted, lemmas, new Set(extra), now)

  const migrated = { ...converted, extraKnownLemmas: [] }
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
  return lemmas.filter((l) => l.freq >= minFreq && wantsBlanketCard(profile, l, deck)).length
}

/**
 * Flips one word between known and unknown.
 *
 * Marking known writes the same mature card as everywhere else, and clears any
 * exclusion, since naming a single word outranks whatever was said before.
 * Un-marking fails the card instead of deleting it, which puts the word back in
 * the deck due today — the honest reading of "no, I don't know this" — and
 * records an exclusion if the word would still count as known some other way,
 * which covers a legacy `extraKnownLemmas` entry that a sync has handed back
 * before the migration has run again.
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
