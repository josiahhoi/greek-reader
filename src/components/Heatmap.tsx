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

export function Heatmap({
  activity,
  endDay,
  weeks = 53,
}: {
  activity: ActivityLog | undefined
  endDay: string
  weeks?: number
}) {
  const columns = buildHeatmap(activity, endDay, weeks)
  const labels = monthLabels(columns)

  return (
    <div className="overflow-x-auto">
      {/* pr-8 so the final month label, which overflows its 12px column slot,
          isn't clipped by the scroll container. */}
      <div className="inline-flex min-w-full flex-col gap-1 pr-8">
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
    </div>
  )
}
