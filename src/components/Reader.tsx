import { useMemo, useState } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import { useScoringContext } from '../hooks/useScoringContext'
import { rankVerses } from '../lib/scorer'
import { VerseView } from './VerseView'

const PAGE_SIZE = 15

export function Reader({
  corpus,
  profile,
  onChange,
}: {
  corpus: CorpusData
  profile: Profile
  onChange: (updater: (p: Profile) => Profile) => void
}) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  const ctx = useScoringContext(corpus, profile)

  const ranked = useMemo(
    () => rankVerses(corpus.books, ctx, { tolerance: profile.tolerance }),
    [corpus.books, ctx, profile.tolerance],
  )

  const readSet = new Set(profile.readVerses)
  const unread = ranked.filter((s) => !readSet.has(`${s.bookId}.${s.chapter}.${s.verse}`))

  function markRead(key: string) {
    onChange((p) => (p.readVerses.includes(key) ? p : { ...p, readVerses: [...p.readVerses, key] }))
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          <strong>{ranked.length.toLocaleString()}</strong> verses readable at tolerance{' '}
          {profile.tolerance} · {unread.length.toLocaleString()} unread
        </p>
        <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
          Tolerance (unknown words allowed)
          <input
            type="range"
            min={0}
            max={5}
            value={profile.tolerance}
            onChange={(e) => onChange((p) => ({ ...p, tolerance: Number(e.target.value) }))}
          />
          <span className="w-4 text-center font-medium">{profile.tolerance}</span>
        </label>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-400 dark:border-stone-700">
          Nothing readable yet — mark some grammar and vocabulary as known, or raise the
          tolerance.
        </p>
      ) : (
        <div className="space-y-6">
          {unread.slice(0, visible).map((s) => {
            const key = `${s.bookId}.${s.chapter}.${s.verse}`
            const book = corpus.bookIndex.find((b) => b.id === s.bookId)!
            return (
              <div
                key={key}
                className="rounded-lg border border-stone-200 p-4 dark:border-stone-800"
              >
                <VerseView
                  verse={s.raw}
                  bookAbbr={book.abbr}
                  lemmas={corpus.lemmas}
                  rmacTable={corpus.rmacTable}
                  knownForms={ctx.knownForms}
                  blockerIndices={new Set(s.blockerIndices)}
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-stone-400">
                    {s.blockers === 0 ? 'Fully known' : `${s.blockers} unknown word${s.blockers > 1 ? 's' : ''}`}
                  </span>
                  <button
                    onClick={() => markRead(key)}
                    className="rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
                  >
                    Mark read
                  </button>
                </div>
              </div>
            )
          })}
          {visible < unread.length && (
            <button
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="w-full rounded-md border border-stone-300 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
