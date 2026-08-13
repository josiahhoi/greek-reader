// OpenGNT book ids (40-66), standard NT canonical order/numbering.
// This is the single source of truth for book metadata — both the corpus
// build script and the app import it, so ids never drift out of sync.

export interface BookInfo {
  id: number
  abbr: string
  name: string
}

export const BOOKS: BookInfo[] = [
  { id: 40, abbr: 'Matt', name: 'Matthew' },
  { id: 41, abbr: 'Mark', name: 'Mark' },
  { id: 42, abbr: 'Luke', name: 'Luke' },
  { id: 43, abbr: 'John', name: 'John' },
  { id: 44, abbr: 'Acts', name: 'Acts' },
  { id: 45, abbr: 'Rom', name: 'Romans' },
  { id: 46, abbr: '1Cor', name: '1 Corinthians' },
  { id: 47, abbr: '2Cor', name: '2 Corinthians' },
  { id: 48, abbr: 'Gal', name: 'Galatians' },
  { id: 49, abbr: 'Eph', name: 'Ephesians' },
  { id: 50, abbr: 'Phil', name: 'Philippians' },
  { id: 51, abbr: 'Col', name: 'Colossians' },
  { id: 52, abbr: '1Thess', name: '1 Thessalonians' },
  { id: 53, abbr: '2Thess', name: '2 Thessalonians' },
  { id: 54, abbr: '1Tim', name: '1 Timothy' },
  { id: 55, abbr: '2Tim', name: '2 Timothy' },
  { id: 56, abbr: 'Titus', name: 'Titus' },
  { id: 57, abbr: 'Phlm', name: 'Philemon' },
  { id: 58, abbr: 'Heb', name: 'Hebrews' },
  { id: 59, abbr: 'Jas', name: 'James' },
  { id: 60, abbr: '1Pet', name: '1 Peter' },
  { id: 61, abbr: '2Pet', name: '2 Peter' },
  { id: 62, abbr: '1John', name: '1 John' },
  { id: 63, abbr: '2John', name: '2 John' },
  { id: 64, abbr: '3John', name: '3 John' },
  { id: 65, abbr: 'Jude', name: 'Jude' },
  { id: 66, abbr: 'Rev', name: 'Revelation' },
]

export const BOOK_BY_ID: Record<number, BookInfo> = Object.fromEntries(
  BOOKS.map((b) => [b.id, b]),
)
