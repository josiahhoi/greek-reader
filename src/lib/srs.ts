// Spaced-repetition scheduling for the vocabulary deck.
//
// A two-button SM-2 variant. Classic SM-2 asks the learner to rate recall 0-5;
// this deck only offers "Missed it" / "Got it" (matching the Practice tab), so
// a pass scores q=4 and a fail q=1. Those two values are chosen because they
// make SM-2's own ease formula do the right thing without special-casing:
// q=4 leaves the ease factor exactly unchanged, q=1 drops it by 0.54. Card
// difficulty is therefore inferred from how often you fail a card rather than
// asked for on every single one.
//
// Everything here is pure — no storage, no React, no implicit clock — so the
// schedule can be exercised directly by scripts/verify-srs.ts.

import { addDays, todayKey } from './dates'

/** One card's review state. Cards are keyed by lemma string in an SrsDeck. */
export interface SrsCard {
  /** Local 'YYYY-MM-DD' this card next comes up. Lexicographically comparable. */
  due: string
  /** Scheduling interval in days. 0 means new or relearning — due today. */
  interval: number
  /** SM-2 ease factor, clamped to [MIN_EASE, INITIAL_EASE]. */
  ease: number
  /** Consecutive passes since the last lapse. */
  reps: number
  /** Times this card was failed after having graduated. Diagnostic only. */
  lapses: number
  /** Local 'YYYY-MM-DD' of the first grade. Powers the new-cards-per-day cap. */
  introduced: string
  /** Epoch ms of the last grade. A total order — the sync merge tiebreaker. */
  reviewed: number
}

/** Keyed by lemma STRING, matching how extraKnownLemmas/excludedLemmas are keyed. */
export type SrsDeck = Record<string, SrsCard>

export const INITIAL_EASE = 2.5
export const MIN_EASE = 1.3
export const SECOND_INTERVAL_DAYS = 6
/** Retained this long and the word counts as known vocabulary (Anki's convention). */
export const MATURE_INTERVAL_DAYS = 21
/** Passes in a row before a correct answer starts healing ease. See nextEase. */
export const EASE_RECOVERY_AFTER_REPS = 3
/** How far back in the current session a missed card is re-inserted. */
export const RELEARN_GAP = 5

/**
 * Keys that would collide with Object.prototype if used as a plain-object key.
 * No NT lemma is one of these, but a deck is JSON that came back from
 * Firestore, so it isn't trusted structurally.
 */
export function isSafeCardKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype'
}

/**
 * SM-2's ease update for a quality score q:
 *   EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 * q=5 -> +0.10, q=4 -> 0.00, q=1 -> -0.54. Clamped to [MIN_EASE, INITIAL_EASE].
 */
function nextEase(ease: number, q: number): number {
  const diff = 5 - q
  const updated = ease + (0.1 - diff * (0.08 + diff * 0.02))
  // Round to 2dp so repeated grading can't accumulate float dust in stored JSON.
  return Math.round(Math.min(INITIAL_EASE, Math.max(MIN_EASE, updated)) * 100) / 100
}

export function newCard(today: string = todayKey()): SrsCard {
  return {
    due: today,
    interval: 0,
    ease: INITIAL_EASE,
    reps: 0,
    lapses: 0,
    introduced: today,
    reviewed: 0,
  }
}

/**
 * Applies one grade and returns the new card state. `prev` undefined means this
 * is the card's first ever answer.
 *
 * A pass steps the interval 1 day -> 6 days -> round(interval * ease). A fail
 * resets the streak and leaves the card due *today*, which is the entire
 * relearning mechanism: no sub-day timestamps, no learning-step counter, no
 * separate queue to persist. Because the queue is rebuilt from `due <= today`,
 * a missed card automatically survives a tab switch, a reload, and a device
 * change. Only its position within the current session lives in memory.
 *
 * Deviation from textbook SM-2, and the one place this departs deliberately:
 * with just two buttons, q=4 is neutral and q=1 is negative, so ease could only
 * ever fall — a word fumbled twice while being introduced would crawl at the
 * 1.3 floor forever, even after twenty clean passes. So a pass on a card
 * already on a streak scores q=5 instead, letting ease heal back toward its
 * 2.5 starting value (never above it).
 */
export function gradeCard(
  prev: SrsCard | undefined,
  passed: boolean,
  now: Date = new Date(),
): SrsCard {
  const today = todayKey(now)
  const base = prev ?? newCard(today)

  if (!passed) {
    return {
      ...base,
      ease: nextEase(base.ease, 1),
      reps: 0,
      // Only a card that had actually graduated can "lapse"; failing a card
      // you're still learning is just part of learning it.
      lapses: base.lapses + (base.reps > 0 ? 1 : 0),
      interval: 0,
      due: today,
      reviewed: now.getTime(),
    }
  }

  const reps = base.reps + 1
  const interval =
    reps === 1
      ? 1
      : reps === 2
        ? SECOND_INTERVAL_DAYS
        : Math.max(1, Math.round(base.interval * base.ease))

  return {
    ...base,
    ease: nextEase(base.ease, reps >= EASE_RECOVERY_AFTER_REPS ? 5 : 4),
    reps,
    interval,
    due: addDays(today, interval),
    reviewed: now.getTime(),
  }
}

/** A card held this long counts as learned — see deriveKnownLemmas. */
export function isMature(card: SrsCard | undefined): boolean {
  return card !== undefined && card.interval >= MATURE_INTERVAL_DAYS
}

export interface QueueCounts {
  /** Due cards that are on a streak (genuine reviews). */
  review: number
  /** Due cards with a broken streak — new or relearning. */
  learning: number
  /** Cards first introduced today. */
  introducedToday: number
  /** Today's new-card allowance still unspent. */
  newRemaining: number
}

export interface BuiltQueue {
  /** Lemma indices to study, in order: reviews first, then today's new cards. */
  queue: number[]
  counts: QueueCounts
}

/**
 * Builds today's study queue as lemma indices.
 *
 * Order is overdue reviews oldest-first (ties broken by corpus frequency), then
 * new cards by descending frequency — the "next frequency band" rule, so the
 * highest-value unknown words come first.
 *
 * The daily new-card allowance is enforced by counting cards whose `introduced`
 * date is today rather than by keeping a counter. That matters for sync: a
 * counter would need an additive merge rule (the very reason dailyScore and
 * formStats were never synced), whereas a derived count falls straight out of
 * the per-card merge and cannot drift or double-count across devices.
 */
export function buildQueue(
  lemmas: { lemma: string; freq: number }[],
  knownLemmas: ReadonlySet<number>,
  deck: SrsDeck,
  newPerDay: number,
  today: string = todayKey(),
): BuiltQueue {
  let introducedToday = 0
  for (const [key, card] of Object.entries(deck)) {
    if (isSafeCardKey(key) && card.introduced === today) introducedToday++
  }

  const dueIdx: number[] = []
  const freshPool: number[] = []
  let learning = 0

  for (let i = 0; i < lemmas.length; i++) {
    const card = deck[lemmas[i].lemma]
    if (card) {
      // A card that already exists stays on its schedule regardless of whether
      // its lemma now counts as known — otherwise maturity would pull the card
      // out of its own deck and freeze the interval that made it mature.
      if (card.due <= today) {
        dueIdx.push(i)
        if (card.reps === 0) learning++
      }
      continue
    }
    // New cards come only from lemmas the learner does not know and has never
    // been shown before.
    if (!knownLemmas.has(i)) freshPool.push(i)
  }

  dueIdx.sort((a, b) => {
    const ca = deck[lemmas[a].lemma]
    const cb = deck[lemmas[b].lemma]
    if (ca.due !== cb.due) return ca.due < cb.due ? -1 : 1
    return lemmas[b].freq - lemmas[a].freq
  })
  freshPool.sort((a, b) => lemmas[b].freq - lemmas[a].freq)

  const newRemaining = Math.max(0, newPerDay - introducedToday)

  return {
    queue: [...dueIdx, ...freshPool.slice(0, newRemaining)],
    counts: {
      review: dueIdx.length - learning,
      learning,
      introducedToday,
      newRemaining,
    },
  }
}

/**
 * Moves the head of the queue back RELEARN_GAP places — Anki's "you'll see this
 * again shortly". In-memory only; the card is already persisted as due today.
 */
export function requeue(queue: number[], lemmaIdx: number): number[] {
  const rest = queue.slice(1)
  const at = Math.min(RELEARN_GAP, rest.length)
  return [...rest.slice(0, at), lemmaIdx, ...rest.slice(at)]
}
