import { useLayoutEffect, useRef, useState } from 'react'
import { buildHeatmap, type ActivityLog, type HeatmapCell } from '../lib/activity'

/**
 * Bucket -> Tailwind classes. Written out as complete static strings rather
 * than interpolated, because Tailwind scans source text and would not emit a
 * class it never sees spelled out. Same reason and same shape as
 * FormStatsGrid's accuracyClasses.
 */
const BUCKET_CLASSES = [
  'bg-stone-100 dark:bg-stone-800/60',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-emerald-300 dark:bg-emerald-800',
  'bg-emerald-500 dark:bg-emerald-600',
  'bg-emerald-700 dark:bg-emerald-400',
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Pixel mirrors of the Tailwind classes used below — cells are h-3/w-3, every
 * gap is gap-1, and the weekday labels sit in a w-7 column. The fit math needs
 * them as numbers, so a class change here is also a constant change.
 */
const CELL = 12
const GAP = 4
const GUTTER = 28
/** A month label overflows its 12px slot, so the last one needs room to its right. */
const LABEL_RESERVE = 24
/** Floor for very narrow containers: below this the grid stops being readable anyway. */
const MIN_WEEKS = 8

function tooltip(cell: HeatmapCell): string {
  if (!cell.inRange) return ''
  if (cell.score === 0) return `${cell.date} — nothing`
  const parts: string[] = []
  if (cell.counts.v) parts.push(`${cell.counts.v} verse${cell.counts.v === 1 ? '' : 's'}`)
  if (cell.counts.f) parts.push(`${cell.counts.f} vocab`)
  if (cell.counts.p) parts.push(`${cell.counts.p} parsing`)
  if (cell.counts.g) parts.push(`${cell.counts.g} verb form${cell.counts.g === 1 ? '' : 's'}`)
  if (cell.counts.k) parts.push(`${cell.counts.k} word${cell.counts.k === 1 ? '' : 's'} known`)
  return `${cell.date} — ${cell.score} pts · ${parts.join(', ')}`
}

/**
 * Month labels sit above the first column whose week *starts* a new month, so
 * a label lines up with roughly where that month begins rather than drifting.
 */
function monthLabels(columns: HeatmapCell[][]): (string | null)[] {
  let lastMonth = -1
  return columns.map((col) => {
    const month = Number(col[0].date.slice(5, 7)) - 1
    if (month !== lastMonth) {
      lastMonth = month
      return MONTHS[month]
    }
    return null
  })
}

/** How many week-columns fit in `width` px, capped at `max`. */
function fitWeeks(width: number, max: number): number {
  const available = width - GUTTER - GAP - LABEL_RESERVE
  const fits = Math.floor((available + GAP) / (CELL + GAP))
  return Math.min(max, Math.max(MIN_WEEKS, fits))
}

export function Heatmap({
  activity,
  endDay,
  weeks = 53,
}: {
  activity: ActivityLog | undefined
  endDay: string
  /** Upper bound on columns. A narrow container renders fewer rather than scrolling. */
  weeks?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  // Measured in a layout effect so the re-render at the real width happens before
  // the browser paints — otherwise the grid flashes at its full 53-column size.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // buildHeatmap works backwards from endDay, so dropping columns drops the
  // oldest weeks and keeps the current one flush against the right edge.
  const columns = buildHeatmap(activity, endDay, fitWeeks(width, weeks))
  const labels = monthLabels(columns)

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex gap-1 pl-8">
            {labels.map((label, i) => (
              <div
                key={i}
                className="w-3 shrink-0 whitespace-nowrap text-[10px] leading-none text-stone-400"
              >
                {label ?? ''}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            <div className="flex w-7 shrink-0 flex-col gap-1 text-[10px] leading-3 text-stone-400">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                <div key={i} className="h-3">
                  {d}
                </div>
              ))}
            </div>

            {columns.map((column, w) => (
              <div key={w} className="flex shrink-0 flex-col gap-1">
                {column.map((cell) => (
                  <div
                    key={cell.date}
                    title={tooltip(cell)}
                    className={
                      'h-3 w-3 rounded-sm ' +
                      (cell.inRange ? BUCKET_CLASSES[cell.bucket] : 'bg-transparent')
                    }
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 pl-8 pt-1 text-[10px] text-stone-400">
            <span className="mr-1">Less</span>
            {BUCKET_CLASSES.map((cls, i) => (
              <div key={i} className={'h-3 w-3 rounded-sm ' + cls} />
            ))}
            <span className="ml-1">More</span>
          </div>
        </div>
      )}
    </div>
  )
}
