// Groups a book's verses by chapter — the unit the Reader's NT view renders
// one at a time. Unlike passages.ts (paragraph-based, for the ranked study
// reader), this is canonical-order, whole-chapter grouping for continuous
// reading straight through.

import type { CorpusToken, CorpusVerse } from './corpusTypes'

export interface Chapter {
  bookId: number
  chapter: number
  verses: CorpusVerse[]
}

export function chapterKey(bookId: number, chapter: number): string {
  return `${bookId}.${chapter}`
}

export function buildChapters(books: Map<number, CorpusVerse[]>): Chapter[] {
  const chapters: Chapter[] = []

  for (const [bookId, verses] of books) {
    let current: CorpusVerse[] = []
    let currentChapter = verses[0]?.c

    for (const verse of verses) {
      if (verse.c !== currentChapter) {
        chapters.push({ bookId, chapter: currentChapter, verses: current })
        current = []
        currentChapter = verse.c
      }
      current.push(verse)
    }
    if (current.length > 0) chapters.push({ bookId, chapter: currentChapter, verses: current })
  }

  return chapters
}

/** A run of consecutive tokens from one verse that lands inside one paragraph. */
export interface VerseRun {
  verse: CorpusVerse
  /** Index into verse.t of this run's first token. */
  startIndex: number
  tokens: CorpusToken[]
  /** True when this run begins at token 0 — render the superscript verse number here. */
  startsVerse: boolean
}

export interface ChapterParagraph {
  runs: VerseRun[]
}

/** Strips the paragraph mark itself out of a token's trailing punctuation for display. */
export function displayAfter(a: string): string {
  return a.replace(/¶/g, '')
}

/**
 * Splits a chapter into paragraphs at every `¶` mark, which is always the last
 * character of a token's `a` field. A mark can fall mid-verse (~59 times
 * NT-wide), so a verse's tokens can straddle two paragraphs — that's why a
 * paragraph holds VerseRuns (one verse's tokens *within* that paragraph)
 * rather than whole verses.
 */
export function buildParagraphs(chapter: Chapter): ChapterParagraph[] {
  const paragraphs: ChapterParagraph[] = []
  let runs: VerseRun[] = []
  let runTokens: CorpusToken[] = []
  let runStart = 0
  let runStartsVerse = true
  let verse: CorpusVerse

  function flushRun() {
    if (runTokens.length > 0) {
      runs.push({ verse, startIndex: runStart, tokens: runTokens, startsVerse: runStartsVerse })
    }
    runTokens = []
  }

  function flushParagraph() {
    flushRun()
    if (runs.length > 0) paragraphs.push({ runs })
    runs = []
  }

  for (const v of chapter.verses) {
    verse = v
    runStartsVerse = true
    runStart = 0
    runTokens = []

    v.t.forEach((tok, i) => {
      runTokens.push(tok)
      if (tok.a.includes('¶')) {
        flushRun()
        flushParagraph()
        runStart = i + 1
        runStartsVerse = false
      }
    })
    flushRun()
  }
  flushParagraph()

  return paragraphs
}
