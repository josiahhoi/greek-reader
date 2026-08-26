// Per-day activity log and the composite score that shades the Home heatmap.
//
// The app had almost no dated history before this: of the profile's fields only
// SrsCard.introduced preserved a per-day fact, and it covers just one axis of
// one activity. Everything else — verses read, parsing grades, forms learned —
// was an untimestamped set or a counter that resets on read. So activity is
// recorded here as it happens, in the same profile update as the work itself.
//
// Everything is pure: no storage, no React, no implicit clock (the caller
// passes `today`), so scripts/verify-activity.ts can exercise it directly.

import { addDays } from './dates'

/**
 * One day's counters. Deliberately one-character keys: this map is serialized
 * into the profile document on every debounced write, so the difference
 * between `{"v":12}` and `{"versesRead":12}` is real bytes on every save and
 * ~40% of the log's total size over years.
 */
export interface DayActivity {
  /** Verses read. */
  v: number
  /** Vocabulary flashcards graded. */
  f: number
  /** Parsing cards graded (Verb parsing tab). */
  p: number
  /** Verb forms newly checked off. */
  g: number
  /** Words manually marked known. */
  k: number
}

/** 'YYYY-MM-DD' -> that day's counters. Days with no activity are absent, not zero. */
export type ActivityLog = Record<string, DayActivity>

/**
 * Relative effort, not raw counts — the whole point of a composite score is
 * that a chapter of reading and a chapter's worth of card-flipping shouldn't
 * look identical. A card grade is the unit; a verse is worth several because it
 * takes several times as long; checking off a verb form is worth far more
 * because each one unlocks thousands of tokens and happens a handful of times
 * ever. Retune here and the heatmap, streaks and tooltips all follow.
 */
export const ACTIVITY_WEIGHTS: Readonly<Record<keyof DayActivity, number>> = {
  v: 3,
  f: 1,
  p: 1,
  g: 15,
  k: 1,
}

/** Shade thresholds. A day scoring >= BUCKETS[i] lands in bucket i+1; 0 is bucket 0. */
export const BUCKETS = [1, 25, 60, 120] as const

export const EMPTY_DAY: DayActivity = { v: 0, f: 0, p: 0, g: 0, k: 0 }

export function dayScore(d: DayActivity | undefined): number {
  if (!d) return 0
  return (
    d.v * ACTIVITY_WEIGHTS.v +
    d.f * ACTIVITY_WEIGHTS.f +
    d.p * ACTIVITY_WEIGHTS.p +
    d.g * ACTIVITY_WEIGHTS.g +
    d.k * ACTIVITY_WEIGHTS.k
  )
}

/** 0 (nothing) through 4 (most). Drives which Tailwind class a cell gets. */
export function scoreBucket(score: number): number {
  if (score <= 0) return 0
  let bucket = 0
  for (let i = 0; i < BUCKETS.length; i++) {
    if (score >= BUCKETS[i]) bucket = i + 1
  }
  return bucket
}

/**
 * Adds `n` to one counter on `today`, returning a new log. Never mutates: the
 * caller is a profile updater, and useSyncedProfile compares references.
 */
export function bump(
  log: ActivityLog | undefined,
  kind: keyof DayActivity,
  n: number,
  today: string,
): ActivityLog {
  if (n <= 0) return log ?? {}
  const base = log ?? {}
  const current = base[today] ?? EMPTY_DAY
  return { ...base, [today]: { ...current, [kind]: current[kind] + n } }
}

export interface HeatmapCell {
  /** 'YYYY-MM-DD'. */
  date: string
  score: number
  /** 0-4. */
  bucket: number
  counts: DayActivity
  /** False for cells padding the first week before the range starts. */
  inRange: boolean
}

/**
 * Week-columns of 7 day-cells, Sunday-first, ending on `endDay`.
 *
 * The grid is built backwards from the end of the week containing `endDay` so
 * the final column is always a full week and rows line up as weekdays — the
 * GitHub layout. Cells before the range start are emitted with inRange:false
 * rather than omitted, so the caller can render a stable 7-row grid.
 */
export function buildHeatmap(
  log: ActivityLog | undefined,
  endDay: string,
  weeks: number,
): HeatmapCell[][] {
  const base = log ?? {}
  const [y, m, d] = endDay.split('-').map(Number)
  const endDow = new Date(y, m - 1, d).getDay() // 0 = Sunday
  const lastCellDate = addDays(endDay, 6 - endDow) // Saturday of the final week
  const totalDays = weeks * 7
  const firstCellDate = addDays(lastCellDate, -(totalDays - 1))

  const columns: HeatmapCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const column: HeatmapCell[] = []
    for (let dow = 0; dow < 7; dow++) {
      const date = addDays(firstCellDate, w * 7 + dow)
      const counts = base[date] ?? EMPTY_DAY
      const score = dayScore(counts)
      column.push({ date, score, bucket: scoreBucket(score), counts, inRange: date <= endDay })
    }
    columns.push(column)
  }
  return columns
}

/**
 * Current and longest run of consecutive active days.
 *
 * A streak counts as unbroken if you were active today OR yesterday — finishing
 * a day's work shouldn't require having already studied by the time you look at
 * the page in the morning.
 */
export function streaks(
  log: ActivityLog | undefined,
  today: string,
): { current: number; longest: number } {
  const base = log ?? {}
  const active = new Set(Object.keys(base).filter((day) => dayScore(base[day]) > 0))
  if (active.size === 0) return { current: 0, longest: 0 }

  let current = 0
  const start = active.has(today) ? today : addDays(today, -1)
  for (let day = start; active.has(day); day = addDays(day, -1)) current++

  let longest = 0
  for (const day of active) {
    if (active.has(addDays(day, -1))) continue // not the start of a run
    let run = 0
    for (let d = day; active.has(d); d = addDays(d, 1)) run++
    if (run > longest) longest = run
  }

  return { current, longest }
}

/**
 * Seeds the log from history that predates it.
 *
 * The activity log only starts recording once this feature ships, so an
 * existing profile would open onto a blank year. One slice of the past is
 * genuinely recoverable: `SrsCard.introduced` is written once and never
 * rewritten, so it says exactly how many cards were first studied on each day.
 * Nothing else survives — `readVerses` is undated, `formStats` has no dates,
 * and `dailyScore` wipes itself overnight — so this is a partial reconstruction
 * and is deliberately additive: it fills the `f` counter on days the log
 * doesn't already have, and never overwrites recorded activity.
 */
export function backfillFromIntroduced(
  log: ActivityLog | undefined,
  introducedDates: string[],
): ActivityLog {
  const base = log ?? {}
  const counts = new Map<string, number>()
  for (const day of introducedDates) counts.set(day, (counts.get(day) ?? 0) + 1)

  const out: ActivityLog = { ...base }
  for (const [day, n] of counts) {
    if (base[day]) continue // real recorded activity always wins
    out[day] = { ...EMPTY_DAY, f: n }
  }
  return out
}

/** Total score across every logged day. */
export function totalScore(log: ActivityLog | undefined): number {
  return Object.values(log ?? {}).reduce((sum, d) => sum + dayScore(d), 0)
}
