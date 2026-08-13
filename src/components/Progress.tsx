import { useMemo } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import { deriveKnownConcepts, deriveKnownLemmas } from '../lib/deriveKnown'
import { coverageByBook } from '../lib/scorer'

export function Progress({ corpus, profile }: { corpus: CorpusData; profile: Profile }) {
  const knownLemmas = useMemo(() => deriveKnownLemmas(profile, corpus.lemmas), [profile, corpus.lemmas])
  const knownConcepts = useMemo(() => deriveKnownConcepts(profile), [profile])

  const coverage = useMemo(
    () => coverageByBook(corpus.books, corpus.bookIndex, knownLemmas, knownConcepts),
    [corpus.books, corpus.bookIndex, knownLemmas, knownConcepts],
  )

  const totalTokens = coverage.reduce((s, b) => s + b.totalTokens, 0)
  const readableTokens = coverage.reduce((s, b) => s + b.readableTokens, 0)
  const readCount = profile.readVerses.length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="NT coverage" value={`${((readableTokens / totalTokens) * 100).toFixed(1)}%`} />
        <Stat label="Verses read" value={String(readCount)} />
        <Stat label="Total verses" value={corpus.meta.verseCount.toLocaleString()} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
          Readable tokens by book
        </h3>
        <div className="space-y-1.5">
          {coverage
            .slice()
            .sort((a, b) => b.readableTokens / b.totalTokens - a.readableTokens / a.totalTokens)
            .map((b) => {
              const pct = (b.readableTokens / b.totalTokens) * 100
              return (
                <div key={b.bookId} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 text-stone-500 dark:text-stone-400">{b.abbr}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs text-stone-400">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              )
            })}
        </div>
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
