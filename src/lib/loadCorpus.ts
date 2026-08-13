import type {
  BookIndexEntry,
  CorpusMeta,
  CorpusVerse,
  LemmaEntry,
  RmacEntry,
} from './corpusTypes'

export interface CorpusData {
  meta: CorpusMeta
  lemmas: LemmaEntry[]
  bookIndex: BookIndexEntry[]
  books: Map<number, CorpusVerse[]>
  /** Interned parse table; token.r indexes into this. */
  rmacTable: RmacEntry[]
  /** verb form id -> number of corpus tokens in that form. */
  formStats: Record<string, number>
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json() as Promise<T>
}

/**
 * Loads the whole compiled corpus (all 27 books, ~12MB uncompressed,
 * substantially less over the wire with gzip). Fine for a test build where
 * everything lives in one browser session; a later pass can lazy-load
 * per-book on demand instead.
 */
export async function loadCorpus(onProgress?: (loaded: number, total: number) => void): Promise<CorpusData> {
  const base = import.meta.env.BASE_URL
  const [meta, lemmas, bookIndex, rmacTable, formStats] = await Promise.all([
    fetchJson<CorpusMeta>(`${base}data/meta.json`),
    fetchJson<LemmaEntry[]>(`${base}data/lemmas.json`),
    fetchJson<BookIndexEntry[]>(`${base}data/books-index.json`),
    fetchJson<RmacEntry[]>(`${base}data/rmac-table.json`),
    fetchJson<Record<string, number>>(`${base}data/form-stats.json`),
  ])

  const books = new Map<number, CorpusVerse[]>()
  let loaded = 0
  await Promise.all(
    bookIndex.map(async (b) => {
      const verses = await fetchJson<CorpusVerse[]>(`${base}data/books/${b.id}.json`)
      books.set(b.id, verses)
      loaded++
      onProgress?.(loaded, bookIndex.length)
    }),
  )

  return { meta, lemmas, bookIndex, books, rmacTable, formStats }
}
