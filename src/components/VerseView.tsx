import { Fragment, useState } from 'react'
import type { CorpusToken, CorpusVerse, LemmaEntry, RmacEntry } from '../lib/corpusTypes'
import { displayAfter } from '../lib/chapters'
import { WordDetail } from './WordDetail'

function TokenView({
  tok,
  lemma,
  isBlocker,
  rmacTable,
  knownForms,
}: {
  tok: CorpusToken
  lemma: LemmaEntry
  isBlocker: boolean
  rmacTable: RmacEntry[]
  knownForms: ReadonlySet<string>
}) {
  const [open, setOpen] = useState(false)
  const rmac = rmacTable[tok.r]

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          'greek rounded text-xl transition-colors ' +
          (isBlocker
            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200'
            : 'hover:bg-stone-100 dark:hover:bg-stone-800')
        }
      >
        {tok.b}
        {tok.t}
        {displayAfter(tok.a)}
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-10 mt-1 w-56 -translate-x-1/2 rounded-lg border border-stone-200 bg-white p-3 text-left text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900">
          <WordDetail
          lemma={lemma}
          rmac={rmac}
          knownForms={knownForms}
          contextGloss={tok.g}
        />
        </div>
      )}
    </span>
  )
}

export function VerseView({
  verse,
  bookAbbr,
  lemmas,
  rmacTable,
  knownForms,
  blockerIndices,
}: {
  verse: CorpusVerse
  bookAbbr: string
  lemmas: LemmaEntry[]
  rmacTable: RmacEntry[]
  knownForms: ReadonlySet<string>
  blockerIndices: ReadonlySet<number>
}) {
  const [showTranslation, setShowTranslation] = useState(false)
  const translation = verse.t
    .map((tok) => tok.b + tok.s + displayAfter(tok.a))
    .join(' ')
    .trim()

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-400">
        {bookAbbr} {verse.c}:{verse.v}
      </p>
      <div className="leading-loose">
        {verse.t.map((tok, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            <TokenView
              tok={tok}
              lemma={lemmas[tok.l]}
              isBlocker={blockerIndices.has(i)}
              rmacTable={rmacTable}
              knownForms={knownForms}
            />
          </Fragment>
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
