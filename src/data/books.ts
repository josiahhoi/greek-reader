// OpenGNT book ids (40-66), standard NT canonical order/numbering.
// This is the single source of truth for book metadata — both the corpus
// build script and the app import it, so ids never drift out of sync.

export interface BookInfo {
  id: number
  abbr: string
  name: string
  /** Traditional Greek running head (e.g. "ΚΑΤΑ ΜΑΘΘΑΙΟΝ"), for the Reader's NT view. */
  greekName: string
}

export const BOOKS: BookInfo[] = [
  { id: 40, abbr: 'Matt', name: 'Matthew', greekName: 'ΚΑΤΑ ΜΑΘΘΑΙΟΝ' },
  { id: 41, abbr: 'Mark', name: 'Mark', greekName: 'ΚΑΤΑ ΜΑΡΚΟΝ' },
  { id: 42, abbr: 'Luke', name: 'Luke', greekName: 'ΚΑΤΑ ΛΟΥΚΑΝ' },
  { id: 43, abbr: 'John', name: 'John', greekName: 'ΚΑΤΑ ΙΩΑΝΝΗΝ' },
  { id: 44, abbr: 'Acts', name: 'Acts', greekName: 'ΠΡΑΞΕΙΣ ΑΠΟΣΤΟΛΩΝ' },
  { id: 45, abbr: 'Rom', name: 'Romans', greekName: 'ΠΡΟΣ ΡΩΜΑΙΟΥΣ' },
  { id: 46, abbr: '1Cor', name: '1 Corinthians', greekName: 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Α' },
  { id: 47, abbr: '2Cor', name: '2 Corinthians', greekName: 'ΠΡΟΣ ΚΟΡΙΝΘΙΟΥΣ Β' },
  { id: 48, abbr: 'Gal', name: 'Galatians', greekName: 'ΠΡΟΣ ΓΑΛΑΤΑΣ' },
  { id: 49, abbr: 'Eph', name: 'Ephesians', greekName: 'ΠΡΟΣ ΕΦΕΣΙΟΥΣ' },
  { id: 50, abbr: 'Phil', name: 'Philippians', greekName: 'ΠΡΟΣ ΦΙΛΙΠΠΗΣΙΟΥΣ' },
  { id: 51, abbr: 'Col', name: 'Colossians', greekName: 'ΠΡΟΣ ΚΟΛΟΣΣΑΕΙΣ' },
  { id: 52, abbr: '1Thess', name: '1 Thessalonians', greekName: 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Α' },
  { id: 53, abbr: '2Thess', name: '2 Thessalonians', greekName: 'ΠΡΟΣ ΘΕΣΣΑΛΟΝΙΚΕΙΣ Β' },
  { id: 54, abbr: '1Tim', name: '1 Timothy', greekName: 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Α' },
  { id: 55, abbr: '2Tim', name: '2 Timothy', greekName: 'ΠΡΟΣ ΤΙΜΟΘΕΟΝ Β' },
  { id: 56, abbr: 'Titus', name: 'Titus', greekName: 'ΠΡΟΣ ΤΙΤΟΝ' },
  { id: 57, abbr: 'Phlm', name: 'Philemon', greekName: 'ΠΡΟΣ ΦΙΛΗΜΟΝΑ' },
  { id: 58, abbr: 'Heb', name: 'Hebrews', greekName: 'ΠΡΟΣ ΕΒΡΑΙΟΥΣ' },
  { id: 59, abbr: 'Jas', name: 'James', greekName: 'ΙΑΚΩΒΟΥ' },
  { id: 60, abbr: '1Pet', name: '1 Peter', greekName: 'ΠΕΤΡΟΥ Α' },
  { id: 61, abbr: '2Pet', name: '2 Peter', greekName: 'ΠΕΤΡΟΥ Β' },
  { id: 62, abbr: '1John', name: '1 John', greekName: 'ΙΩΑΝΝΟΥ Α' },
  { id: 63, abbr: '2John', name: '2 John', greekName: 'ΙΩΑΝΝΟΥ Β' },
  { id: 64, abbr: '3John', name: '3 John', greekName: 'ΙΩΑΝΝΟΥ Γ' },
  { id: 65, abbr: 'Jude', name: 'Jude', greekName: 'ΙΟΥΔΑ' },
  { id: 66, abbr: 'Rev', name: 'Revelation', greekName: 'ΑΠΟΚΑΛΥΨΙΣ ΙΩΑΝΝΟΥ' },
]

export const BOOK_BY_ID: Record<number, BookInfo> = Object.fromEntries(
  BOOKS.map((b) => [b.id, b]),
)
