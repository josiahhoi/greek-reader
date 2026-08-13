// Shape of the JSON emitted by scripts/build-corpus.ts into public/data/.
// Shared by the build script and the app so the two never drift apart.

export interface CorpusToken {
  t: string // surface text (accented)
  b: string // punctuation/space immediately before
  a: string // punctuation/space immediately after
  l: number // lemma id (index into lemmas.json)
  r: number // rmac id (index into rmac-table.json) — carries both parse and gating form
  g: string // literal in-context gloss (LT)
  s: string // study in-context gloss (ST) — concatenates to a reveal translation
}

/**
 * One row per distinct RMAC code (1,111 of them). Interning these keeps the
 * per-token payload to a single integer while still giving the word popover a
 * full parse string.
 */
export interface RmacEntry {
  code: string // e.g. "V-2AAI-3S"
  label: string // e.g. "Aorist (2nd) Active Indicative · 3rd person · Singular"
  form: number // index into VERB_FORMS, or -1 when the token isn't a verb
}

export interface CorpusVerse {
  c: number // chapter
  v: number // verse
  t: CorpusToken[]
}

export interface LemmaEntry {
  lemma: string
  gloss: string
  strongs: string
  freq: number
}

export interface BookIndexEntry {
  id: number
  abbr: string
  name: string
  verseCount: number
}

export interface CorpusMeta {
  tokenCount: number
  verseCount: number
  lemmaCount: number
  rmacCodeCount: number
  verbFormCount: number
  verbTokenCount: number
  generatedAt: string
  source: string
}
