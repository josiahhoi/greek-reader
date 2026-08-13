// Shape of the JSON emitted by scripts/build-corpus.ts into public/data/.
// Shared by the build script and the app so the two never drift apart.

export interface CorpusToken {
  t: string // surface text (accented)
  b: string // punctuation/space immediately before
  a: string // punctuation/space immediately after
  l: number // lemma id (index into lemmas.json)
  c: number[] // concept indices (index into CONCEPT_IDS)
  g: string // literal in-context gloss (LT)
  s: string // study in-context gloss (ST) — concatenates to a reveal translation
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
  conceptCount: number
  generatedAt: string
  source: string
}
