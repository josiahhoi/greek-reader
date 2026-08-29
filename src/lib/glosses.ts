// Your own definitions, layered over the corpus glosses.
//
// The corpus ships TBESG's glosses, which are terse and occasionally odd ("I
// have/am" for ἔχω). A learner usually has a word list they already trust —
// their own deck, their grammar's chapter vocabulary — and that wording is the
// one that will actually come to mind while reading. So an imported list wins
// wherever it has an entry, and the corpus fills in the rest.
//
// The list lives on the profile rather than in public/data: a definition is a
// preference, not a fact about the corpus, and a list copied out of a textbook
// is the learner's to hold rather than ours to republish with the app.

import type { LemmaEntry } from './corpusTypes'
import type { Profile } from './profile'

/** Guards against a bad file bloating a profile that has to fit a Firestore document. */
export const MAX_GLOSSES = 20_000
export const MAX_GLOSS_LENGTH = 300

/** The definition to show for a lemma: yours if you have one, else the corpus's. */
export function glossOf(profile: Profile, lemma: LemmaEntry): string {
  return profile.glosses?.[lemma.lemma] ?? lemma.gloss
}

/** Same, for the places holding a bare map rather than a whole profile. */
export function lookupGloss(
  glosses: Record<string, string> | undefined,
  lemma: LemmaEntry,
): string {
  return glosses?.[lemma.lemma] ?? lemma.gloss
}

export interface ParsedGlossFile {
  glosses: Record<string, string>
  /** Entries thrown away: wrong type, empty, or absurdly long. */
  skipped: number
}

/**
 * Reads an import file: a flat JSON object of lemma -> definition, as
 * scripts/import-anki-glosses.ts writes.
 *
 * Throws on anything that isn't that shape, since a silent empty import would
 * look like the app losing the file. Individual bad entries are dropped and
 * counted instead, so one malformed line can't cost the whole list.
 */
export function parseGlossFile(text: string): ParsedGlossFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("That file isn't JSON.")
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object of Greek word to definition.')
  }

  const glosses: Record<string, string> = {}
  let skipped = 0
  for (const [lemma, definition] of Object.entries(parsed as Record<string, unknown>)) {
    if (
      typeof definition !== 'string' ||
      !definition.trim() ||
      !lemma.trim() ||
      definition.length > MAX_GLOSS_LENGTH ||
      Object.keys(glosses).length >= MAX_GLOSSES
    ) {
      skipped++
      continue
    }
    glosses[lemma] = definition.trim()
  }
  if (Object.keys(glosses).length === 0) throw new Error('No usable definitions in that file.')
  return { glosses, skipped }
}
