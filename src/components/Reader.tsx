import { useMemo, useState } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import { useScoringContext } from '../hooks/useScoringContext'
import { usePassages } from '../hooks/usePassages'
import { rankPassages, type ScoredPassage } from '../lib/passages'
import { markRead, unmarkRead, verseKey } from '../lib/readTracking'
import { todayKey } from '../lib/dates'
import { VerseView } from './VerseView'

const PAGE_SIZE = 8

function formatPassageRef(bookAbbr: string, passage: ScoredPassage): string {
  const first = passage.verses[0]
  const last = passage.verses[passage.verses.length - 1]
  if (passage.verses.length === 1) return `${bookAbbr} ${first.chapter}:${first.verse}`
  if (first.chapter === last.chapter) return `${bookAbbr} ${first.chapter}:${first.verse}-${last.verse}`
  return `${bookAbbr} ${first.chapter}:${first.verse}-${last.chapter}:${last.verse}`
}

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
  const passages = usePassages(corpus)

  const ranked = useMemo(
    () => rankPassages(passages, ctx, { tolerance: profile.tolerance }),
    [passages, ctx, profile.tolerance],
  )

  const readSet = new Set(profile.readVerses)
  const unread = ranked.filter(
    (p) => !p.verses.every((v) => readSet.has(verseKey(p.bookId, v.chapter, v.verse))),
  )

  function markVerse(key: string) {
    onChange((p) => markRead(p, [key], todayKey()))
  }

  function unmarkVerse(key: string) {
    onChange((p) => unmarkRead(p, key))
  }

  function markPassage(passage: ScoredPassage) {
    const keys = passage.verses.map((v) => verseKey(passage.bookId, v.chapter, v.verse))
    onChange((p) => markRead(p, keys, todayKey()))
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          <strong>{ranked.length.toLocaleString()}</strong> passages readable at tolerance{' '}
          {profile.tolerance} · {unread.length.toLocaleString()} unread
        </p>
        <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
          Tolerance (unknown words allowed per verse)
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
          {unread.slice(0, visible).map((passage) => {
            const book = corpus.bookIndex.find((b) => b.id === passage.bookId)!
            const ref = formatPassageRef(book.abbr, passage)
            const passageKey = verseKey(passage.bookId, passage.verses[0].chapter, passage.verses[0].verse)

            return (
              <div
                key={passageKey}
                className="rounded-lg border border-stone-200 p-4 dark:border-stone-800"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    {ref}
                    {passage.verses.length > 1 && ` · ${passage.verses.length} verses`}
                  </p>
                  <span className="text-xs text-stone-400">
                    {passage.totalBlockers === 0
                      ? 'Fully known'
                      : `${passage.totalBlockers} unknown word${passage.totalBlockers > 1 ? 's' : ''}`}
                  </span>
                </div>

                <div className="space-y-3">
                  {passage.verses.map((sv) => {
                    const key = verseKey(passage.bookId, sv.chapter, sv.verse)
                    const isRead = readSet.has(key)
                    return (
                      <div key={key} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isRead}
                          onChange={() => (isRead ? unmarkVerse(key) : markVerse(key))}
                          title={isRead ? 'Mark unread' : 'Mark read'}
                          className="mt-1.5 shrink-0 accent-stone-900 dark:accent-stone-100"
                        />
                        <div className="min-w-0 flex-1">
                          <VerseView
                            verse={sv.raw}
                            bookAbbr={book.abbr}
                            lemmas={corpus.lemmas}
                            rmacTable={corpus.rmacTable}
                            knownForms={ctx.knownForms}
                            blockerIndices={new Set(sv.blockerIndices)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => markPassage(passage)}
                    className="rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
                  >
                    Mark passage read
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
