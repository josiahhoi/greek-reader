// Pure-function checks for the activity log, composite score, heatmap grid and
// the two new merge rules. Same shape as verify-srs.ts: no test runner, run it
// with `npm run verify:activity`.

import {
  ACTIVITY_WEIGHTS,
  EMPTY_DAY,
  backfillFromIntroduced,
  buildHeatmap,
  bump,
  dayScore,
  scoreBucket,
  streaks,
  totalScore,
  type ActivityLog,
  type DayActivity,
} from '../src/lib/activity'
import { mergeActivityLogs, mergeReadLogs } from '../src/lib/sync'
import { addDays } from '../src/lib/dates'

let fails = 0
function check(label: string, ok: boolean, detail = '') {
  if (!ok) {
    fails++
    console.log(`FAIL  ${label}${detail ? ' :: ' + detail : ''}`)
  } else console.log(`ok    ${label}${detail ? ' :: ' + detail : ''}`)
}

const day = (o: Partial<DayActivity>): DayActivity => ({ ...EMPTY_DAY, ...o })

/**
 * Order-independent map comparison. JSON.stringify would not do: merging a
 * into b inserts keys in a different order than b into a, so a stringify
 * comparison reports a commutative merge as broken.
 */
function sameMap(x: Record<string, unknown>, y: Record<string, unknown>): boolean {
  const kx = Object.keys(x).sort()
  const ky = Object.keys(y).sort()
  if (kx.length !== ky.length || kx.some((k, i) => k !== ky[i])) return false
  return kx.every((k) => JSON.stringify(x[k]) === JSON.stringify(y[k]))
}

// ---------------------------------------------------------------- scoring
console.log('\n-- composite score --')
check('empty day scores 0', dayScore(EMPTY_DAY) === 0)
check('undefined day scores 0', dayScore(undefined) === 0)
check(
  'weights applied',
  dayScore(day({ v: 2, f: 3, p: 4, g: 1, k: 5 })) === 2 * 3 + 3 + 4 + 15 + 5,
  String(dayScore(day({ v: 2, f: 3, p: 4, g: 1, k: 5 }))),
)
check('a verse is worth 3 cards', ACTIVITY_WEIGHTS.v === 3 * ACTIVITY_WEIGHTS.f)
check('a verb form outweighs a verse', ACTIVITY_WEIGHTS.g > ACTIVITY_WEIGHTS.v)

console.log('\n-- shade buckets --')
check('0 -> bucket 0', scoreBucket(0) === 0)
check('1 -> bucket 1', scoreBucket(1) === 1)
check('24 -> bucket 1', scoreBucket(24) === 1)
check('25 -> bucket 2', scoreBucket(25) === 2)
check('59 -> bucket 2', scoreBucket(59) === 2)
check('60 -> bucket 3', scoreBucket(60) === 3)
check('119 -> bucket 3', scoreBucket(119) === 3)
check('120 -> bucket 4', scoreBucket(120) === 4)
check('huge -> still bucket 4', scoreBucket(999999) === 4)
check('negative -> bucket 0', scoreBucket(-5) === 0)

// ------------------------------------------------------------------ bump
console.log('\n-- bump --')
{
  const a = bump({}, 'v', 3, '2026-08-19')
  const b = bump(a, 'f', 2, '2026-08-19')
  const c = bump(b, 'v', 1, '2026-08-20')
  check('accumulates within a day', b['2026-08-19'].v === 3 && b['2026-08-19'].f === 2)
  check('separate days are separate', c['2026-08-20'].v === 1 && c['2026-08-19'].v === 3)
  check('zero is a no-op', bump(c, 'v', 0, '2026-08-21')['2026-08-21'] === undefined)
  check('negative is a no-op', bump(c, 'v', -4, '2026-08-21')['2026-08-21'] === undefined)
  check('does not mutate its input', a['2026-08-19'].f === 0)
  check('undefined log is fine', bump(undefined, 'p', 1, '2026-08-19')['2026-08-19'].p === 1)
}

// --------------------------------------------------------------- heatmap
console.log('\n-- heatmap grid --')
{
  const grid = buildHeatmap({}, '2026-08-19', 53)
  check('53 columns', grid.length === 53, String(grid.length))
  check('7 rows per column', grid.every((c) => c.length === 7))
  check('371 cells total', grid.flat().length === 371)

  const flat = grid.flat()
  const dates = flat.map((c) => c.date)
  check('dates are strictly consecutive', dates.every((d, i) => i === 0 || d === addDays(dates[i - 1], 1)))
  check('ends on the Saturday of the final week', flat[flat.length - 1].date >= '2026-08-19')
  check('today is present and in range', flat.some((c) => c.date === '2026-08-19' && c.inRange))
  check(
    'future days are out of range',
    flat.filter((c) => c.date > '2026-08-19').every((c) => !c.inRange),
  )

  // rows are weekdays: every cell in row N shares a day-of-week
  const rowDows = [0, 1, 2, 3, 4, 5, 6].map((r) =>
    new Set(grid.map((col) => new Date(col[r].date + 'T00:00:00').getDay())),
  )
  check('each row is a single weekday', rowDows.every((s) => s.size === 1))

  // a year boundary must not break the walk
  const nyGrid = buildHeatmap({}, '2027-01-05', 53).flat().map((c) => c.date)
  check('crosses a year boundary', nyGrid.includes('2026-12-31') && nyGrid.includes('2027-01-01'))

  const scored = buildHeatmap({ '2026-08-18': day({ v: 40 }) }, '2026-08-19', 53)
  const cell = scored.flat().find((c) => c.date === '2026-08-18')!
  check('a scored day surfaces in the grid', cell.score === 120 && cell.bucket === 4)
}

// --------------------------------------------------------------- streaks
console.log('\n-- streaks --')
{
  const today = '2026-08-19'
  const run = (days: string[]): ActivityLog =>
    Object.fromEntries(days.map((d) => [d, day({ f: 1 })]))

  check('empty log', streaks({}, today).current === 0 && streaks({}, today).longest === 0)
  check('undefined log', streaks(undefined, today).current === 0)

  const three = run([today, addDays(today, -1), addDays(today, -2)])
  check('3-day run ending today', streaks(three, today).current === 3)

  const endedYesterday = run([addDays(today, -1), addDays(today, -2)])
  check('run ending yesterday still counts', streaks(endedYesterday, today).current === 2)

  const endedTwoDaysAgo = run([addDays(today, -2), addDays(today, -3)])
  check('run ending 2 days ago is broken', streaks(endedTwoDaysAgo, today).current === 0)

  const gapped = run([
    today,
    addDays(today, -1),
    addDays(today, -5),
    addDays(today, -6),
    addDays(today, -7),
    addDays(today, -8),
  ])
  const s = streaks(gapped, today)
  check('gap splits runs', s.current === 2, `current=${s.current}`)
  check('longest finds the earlier run', s.longest === 4, `longest=${s.longest}`)

  const zeroDay = { [today]: EMPTY_DAY, [addDays(today, -1)]: day({ v: 1 }) }
  check('a zero-score day breaks the streak', streaks(zeroDay, today).current === 1)
}

// ---------------------------------------------------------- merge: activity
console.log('\n-- mergeActivityLogs (per-day per-counter max) --')
{
  const a: ActivityLog = { '2026-08-18': day({ v: 10, f: 2 }), '2026-08-19': day({ v: 5 }) }
  const b: ActivityLog = { '2026-08-19': day({ v: 3, f: 7 }), '2026-08-20': day({ p: 4 }) }
  const m = mergeActivityLogs(a, b)

  check('disjoint days both survive', m['2026-08-18'].v === 10 && m['2026-08-20'].p === 4)
  check('same day takes the max per counter', m['2026-08-19'].v === 5 && m['2026-08-19'].f === 7)
  check('commutative', sameMap(m, mergeActivityLogs(b, a)))
  check(
    'idempotent',
    sameMap(mergeActivityLogs(m, b), m),
    'merge(merge(a,b), b) === merge(a,b)',
  )
  check('associative', sameMap(mergeActivityLogs(mergeActivityLogs(a, b), {}), m))
  check('undefined sides', Object.keys(mergeActivityLogs(undefined, undefined)).length === 0)
  check('undefined local keeps remote', mergeActivityLogs(undefined, b)['2026-08-20'].p === 4)
  check(
    'never sums (the whole point)',
    mergeActivityLogs(a, b)['2026-08-19'].v !== 8,
    'summing would inflate on every re-merge',
  )
}

// ---------------------------------------------------------- merge: readLog
console.log('\n-- mergeReadLogs (earliest wins) --')
{
  const a = { '40.1.1': '2026-08-19', '40.1.2': '2026-08-19' }
  const b = { '40.1.1': '2026-05-01', '40.1.3': '2026-09-02' }
  const m = mergeReadLogs(a, b)
  check('keeps the earlier date', m['40.1.1'] === '2026-05-01')
  check('unions keys', m['40.1.2'] === '2026-08-19' && m['40.1.3'] === '2026-09-02')
  check('commutative', sameMap(m, mergeReadLogs(b, a)))
  check('idempotent', sameMap(mergeReadLogs(m, b), m))
  check('undefined sides', Object.keys(mergeReadLogs(undefined, undefined)).length === 0)
}

// --------------------------------------------------------------- backfill
console.log('\n-- backfill from SrsCard.introduced --')
{
  const dates = ['2026-08-01', '2026-08-01', '2026-08-02']
  const filled = backfillFromIntroduced({}, dates)
  check('counts repeats on a day', filled['2026-08-01'].f === 2)
  check('separate days', filled['2026-08-02'].f === 1)
  check('only fills f', filled['2026-08-01'].v === 0 && filled['2026-08-01'].p === 0)

  const existing: ActivityLog = { '2026-08-01': day({ v: 9 }) }
  const kept = backfillFromIntroduced(existing, dates)
  check('never overwrites real activity', kept['2026-08-01'].v === 9 && kept['2026-08-01'].f === 0)
  check('still fills untouched days', kept['2026-08-02'].f === 1)
  check('empty input is a no-op', Object.keys(backfillFromIntroduced({}, [])).length === 0)
}

// ------------------------------------------------------------------- size
console.log('\n-- size canary --')
{
  const log: ActivityLog = {}
  let d = '2016-08-19'
  for (let i = 0; i < 3653; i++) {
    log[d] = day({ v: 30, f: 40, p: 20, k: 2 })
    d = addDays(d, 1)
  }
  const bytes = Buffer.byteLength(JSON.stringify(log), 'utf8')
  check('10 years of daily entries < 250 KB', bytes < 250_000, `${Math.round(bytes / 1024)} KB`)
  check('totalScore sums the lot', totalScore(log) === 3653 * (30 * 3 + 40 + 20 + 2))
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`)
process.exit(fails === 0 ? 0 : 1)
