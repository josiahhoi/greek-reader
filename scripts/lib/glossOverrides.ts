// The definitions the app ships with.
//
// The corpus arrives with TBESG's glosses, which are terse and occasionally
// odd ("I have/am" for ἔχω). scripts/data/glosses.json holds the owner's own
// word list, matched to Mounce, keyed by corpus lemma; wherever it has an
// entry it wins, and TBESG fills in the rest.
//
// It lives here, as a build input, rather than on a profile: these are the
// app's definitions now, so a rebuild has to reproduce them.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { firstPersonGloss } from './verbGloss.ts'

export const GLOSS_FILE = path.resolve(import.meta.dirname, '..', 'data', 'glosses.json')

export function loadGlossOverrides(file: string = GLOSS_FILE): Record<string, string> {
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${file} is not a JSON object of lemma -> definition.`)
  }
  const out: Record<string, string> = {}
  for (const [lemma, definition] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof definition !== 'string' || !definition.trim() || !lemma.trim()) {
      throw new Error(`${file} has a bad entry for "${lemma}".`)
    }
    out[lemma] = definition.trim()
  }
  return out
}

export interface ApplyResult {
  /** Lemmas whose gloss the list replaced. */
  applied: number
  /** Entries in the list matching no lemma in this corpus — a matcher regression. */
  unmatched: string[]
}

/**
 * Overwrites glosses in place. Verb entries are re-headed in the 1st person on
 * the way in, so a list written as "to see" still reads "I see" beside the
 * corpus's own verbs; the importer does this too, but doing it here keeps the
 * file itself free to be edited by hand.
 */
export function applyGlossOverrides(
  lemmas: { lemma: string; gloss: string; isVerb?: boolean }[],
  overrides: Record<string, string> = loadGlossOverrides(),
): ApplyResult {
  const byLemma = new Map(lemmas.map((l) => [l.lemma, l]))
  let applied = 0
  const unmatched: string[] = []
  for (const [lemma, definition] of Object.entries(overrides)) {
    const entry = byLemma.get(lemma)
    if (!entry) {
      unmatched.push(lemma)
      continue
    }
    entry.gloss = firstPersonGloss(lemma, definition) ?? definition
    applied++
  }
  return { applied, unmatched }
}
