// One definition of "a day" for the whole app. Both the daily practice score
// and the spaced-repetition scheduler key off the learner's local calendar day
// rather than UTC, so "due today" means what it feels like it means. Keeping
// this in one place stops the two from drifting apart.

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local-time 'YYYY-MM-DD'. Zero-padded, so plain string comparison is chronological. */
export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Calendar-day arithmetic on a 'YYYY-MM-DD' key. Rolls months and years over
 * correctly, and is DST-safe: the Date constructor normalises an out-of-range
 * day-of-month in local time, so no hour arithmetic is involved.
 */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return todayKey(new Date(y, m - 1, d + days))
}

/** Epoch ms at local midnight today — for counting "reviewed today" over timestamps. */
export function startOfTodayMs(now: Date = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}
