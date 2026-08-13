import type { LemmaEntry, RmacEntry } from '../lib/corpusTypes'
import { VERB_FORMS } from '../data/verbForms'

/**
 * The lemma/gloss/parse/Strong's block shown for a single word — used by both
 * the reader's tap-to-reveal popover (VerseView) and the flashcard reveal
 * (Practice), so the two always show an identical parse for the same token
 * instead of two independently-maintained renderings.
 */
export function WordDetail({
  lemma,
  rmac,
  knownForms,
  contextGloss,
  verseRef,
}: {
  lemma: LemmaEntry
  rmac?: RmacEntry
  /** If given, and rmac names a verb form not in this set, shows a "not yet known" note. */
  knownForms?: ReadonlySet<string>
  /** "in context" gloss line, e.g. the token's literal in-verse translation. */
  contextGloss?: string
  /** Shown when the word is presented outside its verse (e.g. a flashcard). */
  verseRef?: string
}) {
  const form = rmac && rmac.form >= 0 ? VERB_FORMS[rmac.form] : undefined
  const missingForm = form && knownForms && !knownForms.has(form.id) ? form : undefined

  return (
    <div>
      <p className="greek text-lg font-medium text-stone-900 dark:text-stone-100">
        {lemma.lemma}
      </p>
      <p className="text-stone-500 dark:text-stone-400">{lemma.gloss}</p>
      {rmac && <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{rmac.label}</p>}
      {contextGloss && (
        <p className="mt-1 text-xs text-stone-400">in context: “{contextGloss}”</p>
      )}
      {verseRef && <p className="mt-1 text-xs text-stone-400">{verseRef}</p>}
      {missingForm && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Verb form not yet known: {missingForm.tense} {missingForm.voice} {missingForm.mood}
        </p>
      )}
      <p className="mt-2 text-xs text-stone-400">Strong's {lemma.strongs}</p>
    </div>
  )
}
