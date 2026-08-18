import { useMemo, useState } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import { useScoringContext } from '../hooks/useScoringContext'
import { useChapters } from '../hooks/useChapters'
import { chapterKey, type Chapter } from '../lib/chapters'
import { BOOKS, BOOK_BY_ID } from '../data/books'
import { WordDetail } from './WordDetail'

const THRESHOLDS = [5, 10, 15, 20, 30, 50]

function verseKey(bookId: number, chapter: number, verse: number): string {
  return `${bookId}.${chapter}.${verse}`
}

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

  function isRare(lemmaId: number): boolean {
    return profile.readerPersonalized
      ? !ctx.knownLemmas.has(lemmaId)
      : corpus.lemmas[lemmaId].freq < profile.readerThreshold
  }

  const rareCount = useMemo(() => {
    let n = 0
    for (const v of current.verses) for (const t of v.t) if (isRare(t.l)) n++
    return n
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, profile.readerPersonalized, profile.readerThreshold, ctx.knownLemmas, corpus.lemmas])

  const readSet = new Set(profile.readVerses)
  const chapterFullyRead = current.verses.every((v) =>
    readSet.has(verseKey(current.bookId, v.c, v.v)),
  )

  function toggleVerseRead(key: string) {
    onChange((p) =>
      p.readVerses.includes(key)
        ? { ...p, readVerses: p.readVerses.filter((k) => k !== key) }
        : { ...p, readVerses: [...p.readVerses, key] },
    )
  }

  function markChapterRead() {
    onChange((p) => {
      const set = new Set(p.readVerses)
      for (const v of current.verses) set.add(verseKey(current.bookId, v.c, v.v))
      return { ...p, readVerses: [...set] }
    })
  }

  const maxChapter = maxChapterByBook.get(current.bookId) ?? 1

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
          <span className="ml-auto text-xs text-stone-400">
            {rareCount} word{rareCount === 1 ? '' : 's'} annotated
          </span>
        </div>
      </div>

      <div onClick={() => setOpenKey(null)} className="rounded-lg border border-stone-200 p-6 dark:border-stone-800">
        <p className="greek mb-4 text-center text-sm uppercase tracking-widest text-stone-400">
          {book.greekName}
        </p>
        <div className="greek text-xl leading-loose text-stone-900 dark:text-stone-100">
          <span
            className="float-left mr-2 font-serif text-6xl font-bold leading-[0.8] text-stone-300 dark:text-stone-700"
            aria-hidden
          >
            {current.chapter}
          </span>
          {current.verses.map((v) => {
            const vKey = verseKey(current.bookId, v.c, v.v)
            const isRead = readSet.has(vKey)
            return (
              <span
                key={vKey}
                className={isRead ? 'rounded bg-sky-50 dark:bg-sky-950/40' : undefined}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleVerseRead(vKey)
                  }}
                  title={isRead ? 'Mark verse unread' : 'Mark verse read'}
                  className={
                    'align-super mr-0.5 text-xs font-semibold ' +
                    (isRead
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200')
                  }
                >
                  {v.v}
                </button>
                {v.t.map((tok, i) => {
                  const rare = isRare(tok.l)
                  const tKey = `${v.v}-${i}`
                  const content = `${tok.b}${tok.t}${tok.a}`
                  if (!rare) {
                    return (
                      <span key={i} className="px-0.5">
                        {content}
                      </span>
                    )
                  }
                  return (
                    <span key={i} className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenKey((k) => (k === tKey ? null : tKey))
                        }}
                        className="rounded border-b border-dotted border-stone-400 px-0.5 hover:bg-stone-100 dark:border-stone-500 dark:hover:bg-stone-800"
                      >
                        {content}
                      </button>
                      {openKey === tKey && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-lg border border-stone-200 bg-white p-3 text-left text-sm normal-case shadow-lg dark:border-stone-700 dark:bg-stone-900"
                        >
                          <WordDetail
                            lemma={corpus.lemmas[tok.l]}
                            rmac={corpus.rmacTable[tok.r]}
                            knownForms={ctx.knownForms}
                            contextGloss={tok.g}
                            verseRef={`${book.abbr} ${v.c}:${v.v}`}
                          />
                        </div>
                      )}
                    </span>
                  )
                })}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
