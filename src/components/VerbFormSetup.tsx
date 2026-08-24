import { bump } from '../lib/activity'
import { todayKey } from '../lib/dates'
import {
  MOOD_ORDER,
  TENSE_ORDER,
  VERB_FORMS,
  VOICE_ORDER,
  formFor,
  type Mood,
  type Tense,
  type Voice,
} from '../data/verbForms'
import type { Profile } from '../lib/profile'

/** Short column headers — the full mood names don't fit a 6-column grid. */
const MOOD_ABBR: Record<Mood, string> = {
  Indicative: 'Ind',
  Subjunctive: 'Subj',
  Imperative: 'Impv',
  Infinitive: 'Inf',
  Participle: 'Ptcp',
  Optative: 'Opt',
}

export function VerbFormSetup({
  profile,
  formStats,
  onChange,
}: {
  profile: Profile
  formStats: Record<string, number>
  onChange: (updater: (p: Profile) => Profile) => void
}) {
  const known = new Set(profile.knownVerbForms)

  function setForms(ids: string[], value: boolean) {
    onChange((p) => {
      const set = new Set(p.knownVerbForms)
      let newlyLearned = 0
      for (const id of ids) {
        if (value) {
          if (!set.has(id)) newlyLearned++
          set.add(id)
        } else set.delete(id)
      }
      return {
        ...p,
        knownVerbForms: [...set],
        activity: bump(p.activity, 'g', newlyLearned, todayKey()),
      }
    })
  }

  function toggle(id: string) {
    setForms([id], !known.has(id))
  }

  /** Ids that actually exist for a whole tense / a voice row / a mood column. */
  function idsWhere(pred: (t: Tense, v: Voice, m: Mood) => boolean): string[] {
    return VERB_FORMS.filter((f) => pred(f.tense, f.voice, f.mood)).map((f) => f.id)
  }

  function BulkButton({ ids, label }: { ids: string[]; label: string }) {
    if (ids.length === 0) return null
    const allKnown = ids.every((id) => known.has(id))
    return (
      <button
        onClick={() => setForms(ids, !allKnown)}
        className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
        title={allKnown ? `Clear all ${ids.length}` : `Select all ${ids.length}`}
      >
        {label}
      </button>
    )
  }

  const knownCount = profile.knownVerbForms.filter((id) =>
    VERB_FORMS.some((f) => f.id === id),
  ).length
  const knownTokens = profile.knownVerbForms.reduce((sum, id) => sum + (formStats[id] ?? 0), 0)
  const totalTokens = Object.values(formStats).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Check off each verb form as you learn it. Everything that isn't a verb — nouns,
          adjectives, articles, pronouns, and all their cases and genders — is treated as
          already known and never blocks a verse.
        </p>
        <p className="mt-2 text-xs text-stone-400">
          <strong>{knownCount}</strong> of {VERB_FORMS.length} forms ·{' '}
          <strong>{((knownTokens / totalTokens) * 100).toFixed(0)}%</strong> of the NT's verb
          tokens
        </p>
      </div>

      {TENSE_ORDER.map((tense) => {
        const tenseIds = idsWhere((t) => t === tense)
        // Only render voice rows that have at least one real form in this tense.
        const voices = VOICE_ORDER.filter((v) => idsWhere((t, vv) => t === tense && vv === v).length > 0)

        return (
          <div key={tense}>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{tense}</h3>
              <BulkButton ids={tenseIds} label="All" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="w-28" />
                    {MOOD_ORDER.map((mood) => {
                      const colIds = idsWhere((t, _v, m) => t === tense && m === mood)
                      return (
                        <th key={mood} className="px-1 pb-1 text-center font-medium">
                          {colIds.length > 0 ? (
                            <button
                              onClick={() => {
                                const allKnown = colIds.every((id) => known.has(id))
                                setForms(colIds, !allKnown)
                              }}
                              className="text-xs text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                              title={`Toggle all ${mood.toLowerCase()} forms in the ${tense.toLowerCase()}`}
                            >
                              {MOOD_ABBR[mood]}
                            </button>
                          ) : (
                            <span className="text-xs text-stone-300 dark:text-stone-700">
                              {MOOD_ABBR[mood]}
                            </span>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {voices.map((voice) => {
                    const rowIds = idsWhere((t, v) => t === tense && v === voice)
                    return (
                      <tr key={voice}>
                        <th className="pr-2 text-right align-middle text-xs font-medium">
                          <button
                            onClick={() => {
                              const allKnown = rowIds.every((id) => known.has(id))
                              setForms(rowIds, !allKnown)
                            }}
                            className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
                            title={`Toggle all ${voice.toLowerCase()} forms in the ${tense.toLowerCase()}`}
                          >
                            {voice}
                          </button>
                        </th>
                        {MOOD_ORDER.map((mood) => {
                          const form = formFor(tense, voice, mood)
                          if (!form) {
                            // Not attested anywhere in the NT — render as absent,
                            // not as "not yet learned". 78 of 168 cells are like this.
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
                          const isKnown = known.has(form.id)
                          const count = formStats[form.id] ?? 0
                          return (
                            <td key={mood} className="text-center">
                              <button
                                onClick={() => toggle(form.id)}
                                title={`${tense} ${voice} ${mood} — ${count.toLocaleString()} tokens in the NT`}
                                className={
                                  'w-full rounded border py-1 text-xs transition-colors ' +
                                  (isKnown
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800')
                                }
                              >
                                {count.toLocaleString()}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      <p className="text-xs text-stone-400">
        Numbers are how many times each form occurs in the New Testament. Dashes are
        combinations that never occur.
      </p>
    </div>
  )
}
