import { useMemo } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import { useScoringContext } from '../hooks/useScoringContext'
import { coverageByBook } from '../lib/scorer'
import { dayScore, streaks, totalScore } from '../lib/activity'
import { todayKey } from '../lib/dates'
import { Heatmap } from './Heatmap'

export function Home({ corpus, profile }: { corpus: CorpusData; profile: Profile }) {
  const today = todayKey()
  const ctx = useScoringContext(corpus, profile)

  const coverage = useMemo(
    () => coverageByBook(corpus.books, corpus.bookIndex, ctx),
    [corpus.books, corpus.bookIndex, ctx],
  )
  const totalTokens = coverage.reduce((s, b) => s + b.totalTokens, 0)
  const readableTokens = coverage.reduce((s, b) => s + b.readableTokens, 0)

  const { current, longest } = useMemo(
    () => streaks(profile.activity, today),
    [profile.activity, today],
  )
  const todayScore = dayScore(profile.activity?.[today])
  const lifetime = totalScore(profile.activity)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          {current > 0 ? (
            <>
              {current} day{current === 1 ? '' : 's'} in a row
            </>
          ) : (
            'No streak yet'
          )}
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {todayScore > 0
            ? `${todayScore} points today`
            : 'Nothing yet today — read a passage or run some cards.'}
        </p>
      </div>

      <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
        <Heatmap activity={profile.activity} endDay={today} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Longest streak" value={`${longest}d`} />
        <Stat label="Verses read" value={profile.readVerses.length.toLocaleString()} />
        <Stat
          label="NT coverage"
          value={`${((readableTokens / totalTokens) * 100).toFixed(1)}%`}
        />
        <Stat label="Lifetime points" value={lifetime.toLocaleString()} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
      <p className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{value}</p>
      <p className="text-xs text-stone-400">{label}</p>
    </div>
  )
}
