// Parses OpenGNT's `Lexicons/OGNT-Analytical_Lexicon.csv` into a
// code -> description map, e.g. "V-2AAI-3S" -> "Verb, second Aorist,
// Active, Indicative, third, Singular".
//
// File shape: one line per Strong's number, tab-separated as
// `G<n>\t<grk>word</grk>｜<hl>CODE</hl>｜description<br><grk>...</grk>｜...`
// — a Strong's number can carry several code/description pairs (one per
// inflected form attested under it), joined with `<br>`.

import { readFileSync } from 'node:fs'

const ENTRY_RE = /<grk>(.*?)<\/grk>｜<hl>(.*?)<\/hl>｜(.*)/

/**
 * OpenGNT's corpus (OpenGNT_version3_3.csv) uses one RMAC code the
 * analytical lexicon doesn't itself catalogue: V-FAN (Future Active
 * Infinitive), on χωρήσειν in John 21:25 — the only future-infinitive-active
 * form in the NT. The description follows the lexicon's own systematic
 * pattern for that code (F=Future, A=Active, N=iNfinitive; compare V-PAN
 * "Verb, Present, Active, iNfinitive" and V-AAN "Verb, Aorist, Active,
 * iNfinitive" in the same file), so this is not a guess — it fills a real
 * gap in OpenGNT's own reference file using its own convention.
 */
const KNOWN_MISSING_CODES: Record<string, string> = {
  'V-FAN': 'Verb, Future, Active, iNfinitive',
}

export function parseRmacLexicon(csvPath: string): Map<string, string> {
  const text = readFileSync(csvPath, 'utf8')
  const codes = new Map<string, string>()

  const lines = text.split('\n').filter(Boolean)
  for (const line of lines) {
    const tabIdx = line.indexOf('\t')
    if (tabIdx < 0) continue
    const rest = line.slice(tabIdx + 1)
    for (const entry of rest.split('<br>')) {
      const m = ENTRY_RE.exec(entry)
      if (!m) continue
      const [, , code, description] = m
      const existing = codes.get(code)
      if (existing !== undefined && existing !== description) {
        throw new Error(
          `RMAC code ${code} has conflicting descriptions: "${existing}" vs "${description}"`,
        )
      }
      codes.set(code, description)
    }
  }

  for (const [code, description] of Object.entries(KNOWN_MISSING_CODES)) {
    if (!codes.has(code)) codes.set(code, description)
  }

  return codes
}
