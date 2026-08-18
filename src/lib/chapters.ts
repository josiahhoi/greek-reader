// Groups a book's verses by chapter — the unit the Reader's NT view renders
// one at a time. Unlike passages.ts (paragraph-based, for the ranked study
// reader), this is canonical-order, whole-chapter grouping for continuous
// reading straight through.

import type { CorpusVerse } from './corpusTypes'

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
