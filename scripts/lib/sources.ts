// Fetches and caches the raw source files the corpus build needs.
// Everything lands in .cache/ (gitignored) so re-runs are instant and CI
// doesn't need network access if the cache is warm.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const CACHE_DIR = path.resolve(import.meta.dirname, '..', '..', '.cache')

async function download(url: string, destPath: string) {
  console.log(`  downloading ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(destPath, buf)
}

/** OpenGNT base text CSV — the corpus itself. CC BY-SA 4.0, eliranwong/OpenGNT. */
export async function ensureOpenGntCsv(): Promise<string> {
  const csvPath = path.join(CACHE_DIR, 'OpenGNT_version3_3.csv')
  if (existsSync(csvPath)) return csvPath

  mkdirSync(CACHE_DIR, { recursive: true })
  const zipPath = path.join(CACHE_DIR, 'OpenGNT_BASE_TEXT.zip')
  await download(
    'https://raw.githubusercontent.com/eliranwong/OpenGNT/master/OpenGNT_BASE_TEXT.zip',
    zipPath,
  )
  const result = spawnSync('unzip', ['-o', '-q', zipPath, '-d', CACHE_DIR])
  if (result.status !== 0) {
    throw new Error(`unzip failed: ${result.stderr?.toString()}`)
  }
  if (!existsSync(csvPath)) {
    throw new Error(`Expected ${csvPath} after extracting OpenGNT_BASE_TEXT.zip but it's missing`)
  }
  return csvPath
}

/** RMAC code -> human-readable description dictionary, straight from OpenGNT. */
export async function ensureRmacLexiconCsv(): Promise<string> {
  const dest = path.join(CACHE_DIR, 'OGNT-Analytical_Lexicon.csv')
  if (existsSync(dest)) return dest
  mkdirSync(CACHE_DIR, { recursive: true })
  await download(
    'https://raw.githubusercontent.com/eliranwong/OpenGNT/master/Lexicons/OGNT-Analytical_Lexicon.csv',
    dest,
  )
  return dest
}
