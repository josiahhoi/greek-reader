import { useMemo } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import { useScoringContext } from '../hooks/useScoringContext'
import { coverageByBook, readCoverageByBook } from '../lib/scorer'
import { dayScore, streaks, totalScore } from '../lib/activity'
import { todayKey } from '../lib/dates'
import { Heatmap } from './Heatmap'

/**
 * The landing page: what you did lately on top, where you have got to
 * underneath. These were two tabs, Home and Progress, which meant the same
 * coverage number was computed and shown in both — and neither was a page you
 * would open on purpose, since both only report. One page, read top to bottom.
 */
export function Home({ corpus, profile }: { corpus: CorpusData; profile: Profile }) {
  const today = todayKey()
  const ctx = useScoringContext(corpus, profile)

  const coverage = useMemo(
    () => coverageByBook(corpus.books, corpus.bookIndex, ctx),
    [corpus.books, corpus.bookIndex, ctx],
  )
  const readCoverage = useMemo(
    () => readCoverageByBook(corpus.bookIndex, profile.readVerses),
    [corpus.bookIndex, profile.readVerses],
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

      <Section title="Readable tokens by book">
        {coverage
          .slice()
          .sort((a, b) => b.readableTokens / b.totalTokens - a.readableTokens / a.totalTokens)
          .map((b) => {
            const pct = (b.readableTokens / b.totalTokens) * 100
            return (
              <Bar key={b.bookId} abbr={b.abbr} pct={pct} color="bg-emerald-500">
                {pct.toFixed(0)}%
              </Bar>
            )
          })}
      </Section>

      <Section
        title="Verses read by book"
        note={`${corpus.meta.verseCount.toLocaleString()} verses in the NT`}
      >
        {readCoverage.map((b) => (
          <Bar
            key={b.bookId}
            abbr={b.abbr}
            pct={b.verseCount > 0 ? (b.readCount / b.verseCount) * 100 : 0}
            color="bg-sky-500"
            wide
          >
            {b.readCount}/{b.verseCount}
          </Bar>
        ))}
      </Section>
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

function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
        {title}
        {note && <span className="ml-2 font-normal text-xs text-stone-400">{note}</span>}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Bar({
  abbr,
  pct,
  color,
  wide,
  children,
}: {
  abbr: string
  pct: number
  color: string
  /** Wider value column, for "12/1071" rather than "42%". */
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-14 shrink-0 text-stone-500 dark:text-stone-400">{abbr}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span
        className={`${wide ? 'w-20' : 'w-12'} shrink-0 text-right text-xs text-stone-400`}
      >
        {children}
      </span>
    </div>
  )
}
