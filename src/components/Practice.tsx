import { useMemo, useState } from 'react'
import { useScoringContext } from '../hooks/useScoringContext'
import { useVerbTokenIndex } from '../hooks/useVerbTokenIndex'
import { groupEligibleByForm, pickCard } from '../lib/quiz'
import { loadDailyScore, recordAnswer, type DailyScore } from '../lib/dailyScore'
import { loadFormStats, recordFormAnswer, type FormStats } from '../lib/formStats'
import { VERB_FORM_IDS } from '../data/verbForms'
import type { CorpusData } from '../lib/loadCorpus'
import type { Profile } from '../lib/profile'
import type { VerbTokenRef } from '../lib/quizTypes'
import { WordDetail } from './WordDetail'
import { FormStatsGrid } from './FormStatsGrid'

export function Practice({ corpus, profile }: { corpus: CorpusData; profile: Profile }) {
  const verbTokens = useVerbTokenIndex(corpus)
  const ctx = useScoringContext(corpus, profile)

  const eligibleByForm = useMemo(
    () => groupEligibleByForm(verbTokens, ctx.knownLemmas, ctx.knownForms),
    [verbTokens, ctx.knownLemmas, ctx.knownForms],
  )
  const eligibleCount = useMemo(
    () => [...eligibleByForm.values()].reduce((sum, l) => sum + l.length, 0),
    [eligibleByForm],
  )

  const bookAbbrById = useMemo(
    () => new Map(corpus.bookIndex.map((b) => [b.id, b.abbr])),
    [corpus.bookIndex],
  )

  const [card, setCard] = useState<VerbTokenRef | null>(() => pickCard(eligibleByForm))
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState<DailyScore>(() => loadDailyScore(profile.username))
  const [formStats, setFormStats] = useState<FormStats>(() => loadFormStats(profile.username))

  function nextCard() {
    setCard((prev) => pickCard(eligibleByForm, prev))
    setRevealed(false)
  }

  function grade(correct: boolean) {
    if (card) {
      setFormStats(recordFormAnswer(profile.username, VERB_FORM_IDS[card.formIdx], correct))
    }
    setScore(recordAnswer(profile.username, correct))
    nextCard()
  }

  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : null

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          <strong>{eligibleCount.toLocaleString()}</strong> eligible tokens across{' '}
          <strong>{eligibleByForm.size}</strong> known form{eligibleByForm.size === 1 ? '' : 's'}
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {score.total === 0 ? (
            'Nothing graded today yet'
          ) : (
            <>
              <strong>
                {score.correct}/{score.total}
              </strong>{' '}
              correct today ({pct}%)
            </>
          )}
        </p>
      </div>

      {!card ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-400 dark:border-stone-700">
          Nothing to practice yet — a card needs a verb form checked off <em>and</em> its
          lemma marked known. Check off some verb forms and vocabulary first.
        </p>
      ) : (
        <div className="rounded-lg border border-stone-200 p-8 text-center dark:border-stone-800">
          <p className="greek text-4xl text-stone-900 dark:text-stone-100">{card.text}</p>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="mt-6 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900"
            >
              Reveal
            </button>
          ) : (
            <>
              <div className="mt-6 text-left">
                <WordDetail
                  lemma={corpus.lemmas[card.lemmaId]}
                  rmac={corpus.rmacTable[card.rmacIdx]}
                  contextGloss={card.contextGloss}
                  verseRef={`${bookAbbrById.get(card.bookId) ?? card.bookId} ${card.chapter}:${card.verse}`}
                />
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => grade(false)}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Missed it
                </button>
                <button
                  onClick={() => grade(true)}
                  className="rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Got it
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <FormStatsGrid formStats={formStats} />
    </div>
  )
}
