// One real, attested verb token from the corpus, flattened for the practice
// flashcard pool. Kept independent of CorpusToken's verse-relative shape
// (which only carries a lemma/rmac *index*) by resolving book/chapter/verse
// up front, since flashcards are shown outside their verse context.

export interface VerbTokenRef {
  text: string
  before: string
  after: string
  lemmaId: number
  rmacIdx: number
  /** Verb form index (VERB_FORMS[formIdx]) — always >= 0 for entries in this pool. */
  formIdx: number
  /** Literal in-context gloss (LT), shown on the flashcard reveal. */
  contextGloss: string
  bookId: number
  chapter: number
  verse: number
}
