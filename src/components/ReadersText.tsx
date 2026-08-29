import { Fragment, useEffect, useMemo, useState } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import { useScoringContext } from '../hooks/useScoringContext'
import { useChapters } from '../hooks/useChapters'
import { buildParagraphs, chapterKey, displayAfter, type Chapter } from '../lib/chapters'
import { formIdOf } from '../lib/scorer'
import type { CorpusToken } from '../lib/corpusTypes'
import { markRead, unmarkRead, verseKey } from '../lib/readTracking'
import { todayKey } from '../lib/dates'
import { BOOKS, BOOK_BY_ID } from '../data/books'
import { WordDetail } from './WordDetail'

const THRESHOLDS = [5, 10, 15, 20, 30, 50]

export function ReadersText({
  corpus,
  profile,
  onChange,
}: {
  corpus: CorpusData
  profile: Profile
  onChange: (updater: (p: Profile) => Profile) => void
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)

  // Escape closes the word popover. Bound only while one is open, so the
  // reader isn't holding a global key listener the whole time it's mounted.
  useEffect(() => {
    if (openKey === null) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenKey(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openKey])

  const ctx = useScoringContext(corpus, profile)
  const rawChapters = useChapters(corpus)

  // buildChapters iterates corpus.books, a Map filled by concurrent per-book
  // fetches — insertion order (and therefore array order) isn't guaranteed to
  // be canonical, so sort explicitly rather than trusting hook order.
  const sortedChapters = useMemo(
    () => [...rawChapters].sort((a, b) => a.bookId - b.bookId || a.chapter - b.chapter),
    [rawChapters],
  )
  const chapterByKey = useMemo(
    () => new Map(sortedChapters.map((c) => [chapterKey(c.bookId, c.chapter), c])),
    [sortedChapters],
  )
  const maxChapterByBook = useMemo(() => {
    const out = new Map<number, number>()
    for (const c of sortedChapters) out.set(c.bookId, Math.max(out.get(c.bookId) ?? 0, c.chapter))
    return out
  }, [sortedChapters])

  const currentKey = chapterKey(profile.readerBookId, profile.readerChapter)
  const current: Chapter = chapterByKey.get(currentKey) ?? sortedChapters[0]
  const currentIndex = sortedChapters.indexOf(current)
  const book = BOOK_BY_ID[current.bookId]

  function goTo(bookId: number, chapter: number) {
    setOpenKey(null)
    onChange((p) => ({ ...p, readerBookId: bookId, readerChapter: chapter }))
  }

  function goToIndex(index: number) {
    const target = sortedChapters[index]
    if (target) goTo(target.bookId, target.chapter)
  }

  // Two independent axes, matching how scoreVerse decides a token blocks a
  // verse: vocabulary (rare, or not in your known set) and grammar (a verb
  // whose tense/voice/mood you haven't marked known). Either one flags a word.
  function vocabUnknown(lemmaId: number): boolean {
    return profile.readerPersonalized
      ? !ctx.knownLemmas.has(lemmaId)
      : corpus.lemmas[lemmaId].freq < profile.readerThreshold
  }

  function formUnknown(rmacIdx: number): boolean {
    if (!profile.readerAnnotateForms) return false
    const formId = formIdOf(rmacIdx, ctx.rmacTable, ctx.verbFormIds)
    return formId !== null && !ctx.knownForms.has(formId)
  }

  function shouldAnnotate(tok: CorpusToken): boolean {
    return vocabUnknown(tok.l) || formUnknown(tok.r)
  }

  const annotatedCount = useMemo(() => {
    let n = 0
    for (const v of current.verses) for (const t of v.t) if (shouldAnnotate(t)) n++
    return n
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    current,
    profile.readerPersonalized,
    profile.readerThreshold,
    profile.readerAnnotateForms,
    ctx,
    corpus.lemmas,
  ])

  const readSet = new Set(profile.readVerses)
  const chapterFullyRead = current.verses.every((v) =>
    readSet.has(verseKey(current.bookId, v.c, v.v)),
  )

  function toggleVerseRead(key: string) {
    onChange((p) =>
      p.readVerses.includes(key) ? unmarkRead(p, key) : markRead(p, [key], todayKey()),
    )
  }

  function markChapterRead() {
    const keys = current.verses.map((v) => verseKey(current.bookId, v.c, v.v))
    onChange((p) => markRead(p, keys, todayKey()))
  }

  const maxChapter = maxChapterByBook.get(current.bookId) ?? 1
  const paragraphs = useMemo(() => buildParagraphs(current), [current])

  return (
    <div>
      <div className="mb-4 space-y-3 rounded-lg border border-stone-200 p-3 dark:border-stone-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => goToIndex(currentIndex - 1)}
            disabled={currentIndex <= 0}
            className="rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            ← Prev
          </button>
          <select
            value={current.bookId}
            onChange={(e) => goTo(Number(e.target.value), 1)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
          >
            {BOOKS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={current.chapter}
            onChange={(e) => goTo(current.bookId, Number(e.target.value))}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
          >
            {Array.from({ length: maxChapter }, (_, i) => i + 1).map((c) => (
              <option key={c} value={c}>
                Ch. {c}
              </option>
            ))}
          </select>
          <button
            onClick={() => goToIndex(currentIndex + 1)}
            disabled={currentIndex >= sortedChapters.length - 1}
            className="rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-30 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Next →
          </button>
          <button
            onClick={markChapterRead}
            disabled={chapterFullyRead}
            className="ml-auto rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900"
          >
            {chapterFullyRead ? 'Chapter read' : 'Mark chapter read'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
          <span className="text-xs uppercase tracking-wide text-stone-400">Annotate words below</span>
          {THRESHOLDS.map((t) => (
            <button
              key={t}
              onClick={() => onChange((p) => ({ ...p, readerThreshold: t, readerPersonalized: false }))}
              className={
                'rounded-full px-2 py-0.5 text-xs font-medium ' +
                (!profile.readerPersonalized && profile.readerThreshold === t
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700')
              }
            >
              &lt;{t}×
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={profile.readerPersonalized}
              onChange={(e) => onChange((p) => ({ ...p, readerPersonalized: e.target.checked }))}
              className="accent-stone-900 dark:accent-stone-100"
            />
            Personalized (words I don't know)
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={profile.readerAnnotateForms}
              onChange={(e) => onChange((p) => ({ ...p, readerAnnotateForms: e.target.checked }))}
              className="accent-stone-900 dark:accent-stone-100"
            />
            Verb forms I haven't learned
          </label>
          <span className="ml-auto text-xs text-stone-400">
            {annotatedCount} word{annotatedCount === 1 ? '' : 's'} annotated
          </span>
        </div>
      </div>

      <div onClick={() => setOpenKey(null)} className="rounded-lg border border-stone-200 p-6 dark:border-stone-800">
        <p className="greek mb-4 text-center text-sm uppercase tracking-widest text-stone-400">
          {book.greekName}
        </p>
        <div
          lang="grc"
          style={{ hyphens: 'none' }}
          className="greek text-justify text-xl leading-[1.8] break-words text-stone-900 dark:text-stone-100"
        >
          {paragraphs.map((para, pIdx) => (
            <p key={pIdx} className={pIdx === 0 ? 'm-0' : 'm-0 indent-8'}>
              {pIdx === 0 && (
                <span
                  className="float-left mr-2 font-serif text-6xl font-bold leading-[0.8] text-stone-300 dark:text-stone-700"
                  aria-hidden
                >
                  {current.chapter}
                </span>
              )}
              {para.runs.map((run, runIdx) => {
                const vKey = verseKey(current.bookId, run.verse.c, run.verse.v)
                const isRead = readSet.has(vKey)
                return (
                  <span
                    key={runIdx}
                    className={isRead ? 'rounded bg-sky-100 dark:bg-sky-900/50' : undefined}
                  >
                    {runIdx > 0 && ' '}
                    {run.startsVerse && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleVerseRead(vKey)
                        }}
                        title={isRead ? 'Mark verse unread' : 'Mark verse read'}
                        className={
                          'align-super text-xs font-semibold ' +
                          (isRead
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200')
                        }
                      >
                        {run.verse.v}
                      </button>
                    )}
                    {run.tokens.map((tok, i) => {
                      const annotated = shouldAnnotate(tok)
                      const globalIdx = run.startIndex + i
                      const tKey = `${run.verse.v}-${globalIdx}`
                      return (
                        <Fragment key={i}>
                          {i > 0 && ' '}
                          {tok.b}
                          <span className="relative">
                            {/* Every word is tappable for its parse; the dotted
                                underline only marks the ones flagged as unknown. */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenKey((k) => (k === tKey ? null : tKey))
                              }}
                              className={
                                'inline hover:bg-stone-100 dark:hover:bg-stone-800 ' +
                                (annotated
                                  ? 'border-b border-dotted border-stone-400 dark:border-stone-500'
                                  : '')
                              }
                            >
                              {tok.t}
                            </button>
                            {openKey === tKey && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-lg border border-stone-200 bg-white p-3 text-left text-sm normal-case not-italic shadow-lg dark:border-stone-700 dark:bg-stone-900"
                              >
                                <WordDetail
                                  lemma={corpus.lemmas[tok.l]}
                                  rmac={corpus.rmacTable[tok.r]}
                                  knownForms={ctx.knownForms}
                                  contextGloss={tok.g}
                                  verseRef={`${book.abbr} ${run.verse.c}:${run.verse.v}`}
                                  glosses={profile.glosses}
                                />
                              </div>
                            )}
                          </span>
                          {displayAfter(tok.a)}
                        </Fragment>
                      )
                    })}
                  </span>
                )
              })}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
