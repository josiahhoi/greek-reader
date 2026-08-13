// Parses OpenGNT_version3_3.csv rows into typed token records.
//
// Column layout (13 tab-separated fields; the last 8 are packed groups
// delimited by 〔 … ｜ … 〕):
//   0 OGNTsort  1 TANTTsort  2 FEATURESsort1  3 LevinsohnClauseID  4 OTquotation
//   5 〔BGBsortI｜LTsortI｜STsortI〕
//   6 〔Book｜Chapter｜Verse〕
//   7 〔OGNTk｜OGNTu｜OGNTa｜lexeme｜rmac｜sn〕
//   8 〔BDAGentry｜EDNTentry｜MounceEntry｜GK｜LN〕
//   9 〔transSBLcap｜transSBL｜modernGreek｜Fonética〕
//  10 〔TBESG｜IT｜LT｜ST｜Español〕
//  11 〔PMpWord｜PMfWord〕
//  12 〔Note｜Mvar｜Mlexeme｜Mrmac｜Msn｜MTBESG〕
// Verified against the full 138,013-row file during corpus-build planning.

import { readFileSync } from 'node:fs'

export interface RawToken {
  book: number
  chapter: number
  verse: number
  /** Accented surface form as printed (OGNTa). */
  text: string
  /** Dictionary form (lexeme) — used as the lemma key. */
  lemma: string
  rmac: string
  /** Strong's number, e.g. "G976". */
  strongs: string
  /** TBESG: dictionary gloss, independent of context. */
  glossDict: string
  /** LT: literal in-context translation. */
  glossLiteral: string
  /** ST: study-Bible in-context translation (used to build reveal text). */
  glossStudy: string
  /** Punctuation/whitespace immediately before this token, tags stripped. */
  before: string
  /** Punctuation/whitespace immediately after this token, tags stripped. */
  after: string
}

function parseGroup(field: string): string[] {
  return field.replace(/^〔/, '').replace(/〕$/, '').split('｜')
}

function stripPmTags(field: string): string {
  // "¬" appears ~862 times as a pre-word mark; OpenGNT's own docs don't define
  // it (inherited from the STEPBible/TANTT source without gloss), and it isn't
  // conventional Greek punctuation, so it reads as a typo to a learner. Drop
  // it from display text rather than show an unexplained symbol. "¶" (~1,545
  // occurrences) is a real, self-explanatory paragraph mark and is kept.
  return field.replace(/<\/?pm>/g, '').replace(/¬/g, '')
}

export function parseOpenGnt(csvPath: string): RawToken[] {
  const text = readFileSync(csvPath, 'utf8')
  const lines = text.split('\n').filter(Boolean)
  const tokens: RawToken[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split('\t')
    if (fields.length !== 13) {
      throw new Error(`Row ${i + 1}: expected 13 tab-separated fields, got ${fields.length}`)
    }

    const [book, chapter, verse] = parseGroup(fields[6]).map(Number)
    const [, , ognta, lexeme, rmac, sn] = parseGroup(fields[7])
    const [tbesg, , lt, st] = parseGroup(fields[10])
    const [pmBefore, pmAfter] = parseGroup(fields[11])

    tokens.push({
      book,
      chapter,
      verse,
      text: ognta,
      lemma: lexeme,
      rmac,
      strongs: sn,
      glossDict: tbesg,
      glossLiteral: lt,
      glossStudy: st,
      before: stripPmTags(pmBefore),
      after: stripPmTags(pmAfter),
    })
  }

  return tokens
}
