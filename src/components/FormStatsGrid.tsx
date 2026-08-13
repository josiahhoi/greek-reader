import { MOOD_ORDER, TENSE_ORDER, VOICE_ORDER, formFor, type Mood } from '../data/verbForms'
import type { FormStats } from '../lib/formStats'

/** Short column headers — mirrors VerbFormSetup's grid so the two read as one shape. */
const MOOD_ABBR: Record<Mood, string> = {
  Indicative: 'Ind',
  Subjunctive: 'Subj',
  Imperative: 'Impv',
  Infinitive: 'Inf',
  Participle: 'Ptcp',
  Optative: 'Opt',
}

function accuracyClasses(pct: number): string {
  if (pct >= 80) return 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  if (pct >= 50) return 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  return 'border-red-400 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300'
}

/**
 * Read-only accuracy grid — same tense/voice/mood shape as VerbFormSetup's
 * knowledge grid (not extracted into a shared component: that one is
 * interactive with per-row/column/tense bulk-select, this one only ever
 * displays, and forcing both through one abstraction added more indirection
 * than the ~150 lines of table markup it would have saved).
 */
export function FormStatsGrid({ formStats }: { formStats: FormStats }) {
  const practicedTenses = TENSE_ORDER.filter((tense) =>
    VOICE_ORDER.some((voice) =>
      MOOD_ORDER.some((mood) => {
        const form = formFor(tense, voice, mood)
        return form && (formStats[form.id]?.total ?? 0) > 0
      }),
    ),
  )

  const totals = Object.values(formStats).reduce(
    (acc, s) => ({ correct: acc.correct + s.correct, total: acc.total + s.total }),
    { correct: 0, total: 0 },
  )

  if (totals.total === 0) return null

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Accuracy by form
        </h3>
        <p className="mt-1 text-xs text-stone-400">
          All-time, across every practice session —{' '}
          <strong>
            {totals.correct}/{totals.total}
          </strong>{' '}
          overall ({Math.round((totals.correct / totals.total) * 100)}%)
        </p>
      </div>

      {practicedTenses.map((tense) => {
        const voices = VOICE_ORDER.filter((voice) =>
          MOOD_ORDER.some((mood) => formFor(tense, voice, mood)),
        )

        return (
          <div key={tense}>
            <h4 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
              {tense}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="w-28" />
                    {MOOD_ORDER.map((mood) => (
                      <th
                        key={mood}
                        className="px-1 pb-1 text-center text-xs font-medium text-stone-400"
                      >
                        {MOOD_ABBR[mood]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {voices.map((voice) => (
                    <tr key={voice}>
                      <th className="pr-2 text-right align-middle text-xs font-medium text-stone-500 dark:text-stone-400">
                        {voice}
                      </th>
                      {MOOD_ORDER.map((mood) => {
                        const form = formFor(tense, voice, mood)
                        if (!form) {
                          return (
                            <td key={mood} className="text-center">
                              <span
                                className="inline-block w-full rounded border border-dashed border-stone-200 py-1 text-xs text-stone-300 dark:border-stone-800 dark:text-stone-700"
                                title="Does not occur in the New Testament"
                              >
                                –
                              </span>
                            </td>
                          )
                        }
                        const stat = formStats[form.id]
                        if (!stat || stat.total === 0) {
                          return (
                            <td key={mood} className="text-center">
                              <span
                                className="inline-block w-full rounded border border-stone-200 py-1 text-xs text-stone-300 dark:border-stone-800 dark:text-stone-600"
                                title={`${tense} ${voice} ${mood} — not practiced yet`}
                              >
                                —
                              </span>
                            </td>
                          )
                        }
                        const pct = Math.round((stat.correct / stat.total) * 100)
                        return (
                          <td key={mood} className="text-center">
                            <span
                              className={`inline-block w-full rounded border py-1 text-xs font-medium ${accuracyClasses(pct)}`}
                              title={`${tense} ${voice} ${mood} — ${stat.correct}/${stat.total} correct`}
                            >
                              {stat.correct}/{stat.total}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
