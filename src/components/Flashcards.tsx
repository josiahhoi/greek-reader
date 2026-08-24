import { useMemo, useState } from 'react'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import { bump } from '../lib/activity'
import { deriveKnownLemmas } from '../lib/deriveKnown'
import { useLemmaExamples } from '../hooks/useLemmaExamples'
import { displayAfter } from '../lib/chapters'
import { startOfTodayMs, todayKey } from '../lib/dates'
import { BOOK_BY_ID } from '../data/books'
import {
  buildQueue,
  gradeCard,
  requeue,
  MATURE_INTERVAL_DAYS,
  type SrsDeck,
} from '../lib/srs'

const NEW_PER_DAY_CHOICES = [5, 10, 20, 40]

export function Flashcards({
  corpus,
  profile,
  onChange,
}: {
  corpus: CorpusData
  profile: Profile
  onChange: (updater: (p: Profile) => Profile) => void
}) {
  const today = todayKey()
  const knownLemmas = useMemo(
    () => deriveKnownLemmas(profile, corpus.lemmas),
    [profile, corpus.lemmas],
  )
  const examples = useLemmaExamples(corpus)

  // The queue is state, not a memo: a memo keyed on `profile` would rebuild
  // after every grade and could immediately re-show the card just answered.
  // It's rebuilt explicitly when it empties or the deck is refreshed — one
  // pass over 5,395 lemmas, so rebuilding is free and nothing needs to survive
  // the unmount that happens on every tab switch.
  const [queue, setQueue] = useState<number[]>(
    () => buildQueue(corpus.lemmas, knownLemmas, profile.srs ?? {}, profile.srsNewPerDay, today).queue,
  )
  const [revealed, setRevealed] = useState(false)
  const [justLearned, setJustLearned] = useState<string | null>(null)

  const counts = useMemo(
    () => buildQueue(corpus.lemmas, knownLemmas, profile.srs ?? {}, profile.srsNewPerDay, today).counts,
    [corpus.lemmas, knownLemmas, profile.srs, profile.srsNewPerDay, today],
  )

  const reviewedToday = useMemo(() => {
    const since = startOfTodayMs()
    return Object.values(profile.srs ?? {}).filter((c) => c.reviewed >= since).length
  }, [profile.srs])

  function rebuild() {
    setQueue(
      buildQueue(corpus.lemmas, knownLemmas, profile.srs ?? {}, profile.srsNewPerDay, today).queue,
    )
    setRevealed(false)
    setJustLearned(null)
  }

  const head = queue[0]
  const lemma = head === undefined ? undefined : corpus.lemmas[head]
  const card = lemma ? (profile.srs ?? {})[lemma.lemma] : undefined
  const example = head === undefined ? undefined : examples[head]

  function grade(passed: boolean) {
    if (!lemma) return
    const next = gradeCard(card, passed)
    onChange((p) => {
      const deck: SrsDeck = { ...(p.srs ?? {}) }
      deck[lemma.lemma] = next
      return { ...p, srs: deck, activity: bump(p.activity, 'f', 1, today) }
    })
    // Maturity isn't written anywhere — deriveKnownLemmas reads the interval
    // directly — so this is purely to tell the learner it happened.
    setJustLearned(
      passed && next.interval >= MATURE_INTERVAL_DAYS && (card?.interval ?? 0) < MATURE_INTERVAL_DAYS
        ? lemma.lemma
        : null,
    )
    setQueue((q) => (passed ? q.slice(1) : requeue(q, head)))
    setRevealed(false)
  }

  /** "I already know this" — genuine user intent, so this one does write extraKnownLemmas. */
  function markAlreadyKnown() {
    if (!lemma) return
    onChange((p) => ({
      ...p,
      extraKnownLemmas: [...new Set([...p.extraKnownLemmas, lemma.lemma])],
      excludedLemmas: p.excludedLemmas.filter((l) => l !== lemma.lemma),
      activity: bump(p.activity, 'k', 1, today),
    }))
    setQueue((q) => q.slice(1))
    setRevealed(false)
    setJustLearned(null)
  }

  function setNewPerDay(n: number) {
    onChange((p) => ({ ...p, srsNewPerDay: n }))
    setQueue(buildQueue(corpus.lemmas, knownLemmas, profile.srs ?? {}, n, today).queue)
  }

  const nextDue = useMemo(() => {
    const future = Object.values(profile.srs ?? {})
      .map((c) => c.due)
      .filter((d) => d > today)
      .sort()
    return future[0]
  }, [profile.srs, today])

  const deckSize = Object.keys(profile.srs ?? {}).length
  const unknownRemain = corpus.lemmas.length - knownLemmas.size

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          <strong>{counts.review}</strong> due · <strong>{counts.learning}</strong> learning ·{' '}
          <strong>{counts.newRemaining}</strong> new left today
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {reviewedToday === 0 ? 'Nothing reviewed today yet' : `${reviewedToday} reviewed today`}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
        <span className="uppercase tracking-wide text-stone-400">New cards per day</span>
        {NEW_PER_DAY_CHOICES.map((n) => (
          <button
            key={n}
            onClick={() => setNewPerDay(n)}
            className={
              'rounded-full px-2 py-0.5 font-medium ' +
              (profile.srsNewPerDay === n
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700')
            }
          >
            {n}
          </button>
        ))}
        <span className="ml-auto text-stone-400">
          {deckSize} card{deckSize === 1 ? '' : 's'} in deck
        </span>
      </div>

      {!lemma ? (
        <EmptyState
          deckSize={deckSize}
          unknownRemain={unknownRemain}
          nextDue={nextDue}
          onRefresh={rebuild}
        />
      ) : (
        <div className="rounded-lg border border-stone-200 p-8 text-center dark:border-stone-800">
          <p className="greek text-4xl text-stone-900 dark:text-stone-100">{lemma.lemma}</p>
          <p className="mt-1 text-xs text-stone-400">
            {card ? `seen ${card.reps === 0 ? 'again soon' : `· ${card.interval}d interval`}` : 'new word'}
          </p>

          {!revealed ? (
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={() => setRevealed(true)}
                className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
              >
                Reveal
              </button>
              <button
                onClick={markAlreadyKnown}
                className="text-xs text-stone-400 underline hover:text-stone-700 dark:hover:text-stone-200"
              >
                I already know this
              </button>
            </div>
          ) : (
            <>
              <div className="mt-6 text-left">
                <p className="text-lg text-stone-900 dark:text-stone-100">{lemma.gloss}</p>
                <p className="mt-1 text-xs text-stone-400">
                  {lemma.freq}× in the NT · Strong&apos;s {lemma.strongs}
                </p>

                {example && (
                  <div className="mt-4 rounded-md bg-stone-50 p-3 dark:bg-stone-900">
                    <p className="greek text-base leading-relaxed text-stone-800 dark:text-stone-200">
                      {example.tokens.map((tok, i) => (
                        <span key={i}>
                          {i > 0 && ' '}
                          {tok.b}
                          {i === example.tokenIdx ? <strong>{tok.t}</strong> : tok.t}
                          {displayAfter(tok.a)}
                        </span>
                      ))}
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      {BOOK_BY_ID[example.bookId]?.abbr ?? example.bookId} {example.chapter}:
                      {example.verse}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => grade(false)}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Missed it
                </button>
                <button
                  onClick={() => grade(true)}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Got it
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {justLearned && (
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-center text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="greek">{justLearned}</span> reached a {MATURE_INTERVAL_DAYS}-day interval
          — it now counts as known vocabulary in Read and Reader&apos;s NT.
        </p>
      )}
    </div>
  )
}

function EmptyState({
  deckSize,
  unknownRemain,
  nextDue,
  onRefresh,
}: {
  deckSize: number
  unknownRemain: number
  nextDue?: string
  onRefresh: () => void
}) {
  let message: string
  if (unknownRemain === 0) {
    message = 'Nothing left to learn — every lemma in the NT counts as known vocabulary.'
  } else if (deckSize === 0) {
    message =
      "No cards yet. Today's new-card allowance is spent or set to zero — raise it above to start a deck."
  } else {
    message = nextDue
      ? `All caught up. Next review due ${nextDue}.`
      : 'All caught up — nothing due today.'
  }

  return (
    <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
      <p className="text-sm text-stone-400">{message}</p>
      <button
        onClick={onRefresh}
        className="mt-3 rounded-md border border-stone-300 px-3 py-1 text-xs text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
      >
        Refresh
      </button>
    </div>
  )
}
