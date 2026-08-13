import { useState } from 'react'
import type { CorpusToken, CorpusVerse, LemmaEntry } from '../lib/corpusTypes'
import { CONCEPTS } from '../data/concepts'

function TokenView({
  tok,
  lemma,
  isBlocker,
  knownConcepts,
}: {
  tok: CorpusToken
  lemma: LemmaEntry
  isBlocker: boolean
  knownConcepts: ReadonlySet<number>
}) {
  const [open, setOpen] = useState(false)
  const unknownGrammar = tok.c.filter((c) => !knownConcepts.has(c)).map((c) => CONCEPTS[c])

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          'greek rounded px-0.5 text-xl transition-colors ' +
          (isBlocker
            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200'
            : 'hover:bg-stone-100 dark:hover:bg-stone-800')
        }
      >
        {tok.b}
        {tok.t}
        {tok.a}
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-lg border border-stone-200 bg-white p-3 text-left text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900">
          <p className="greek text-lg font-medium text-stone-900 dark:text-stone-100">
            {lemma.lemma}
          </p>
          <p className="text-stone-500 dark:text-stone-400">{lemma.gloss}</p>
          <p className="mt-1 text-xs text-stone-400">in context: “{tok.g}”</p>
          {unknownGrammar.length > 0 && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Not yet known: {unknownGrammar.map((c) => c.label).join(', ')}
            </p>
          )}
          <p className="mt-2 text-xs text-stone-400">Strong's {lemma.strongs}</p>
        </div>
      )}
    </span>
  )
}

export function VerseView({
  verse,
  bookAbbr,
  lemmas,
  knownConcepts,
  blockerIndices,
}: {
  verse: CorpusVerse
  bookAbbr: string
  lemmas: LemmaEntry[]
  knownConcepts: ReadonlySet<number>
  blockerIndices: ReadonlySet<number>
}) {
  const [showTranslation, setShowTranslation] = useState(false)
  const translation = verse.t.map((tok) => tok.b + tok.s + tok.a).join(' ').trim()

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
        {bookAbbr} {verse.c}:{verse.v}
      </p>
      <div className="leading-loose">
        {verse.t.map((tok, i) => (
          <TokenView
            key={i}
            tok={tok}
            lemma={lemmas[tok.l]}
            isBlocker={blockerIndices.has(i)}
            knownConcepts={knownConcepts}
          />
        ))}
      </div>
      <button
        onClick={() => setShowTranslation((s) => !s)}
        className="mt-2 text-xs text-stone-400 underline hover:text-stone-700 dark:hover:text-stone-200"
      >
        {showTranslation ? 'Hide' : 'Show'} translation
      </button>
      {showTranslation && (
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{translation}</p>
      )}
    </div>
  )
}
