// Decoder for RMAC (Robinson's Morphological Analysis Codes), as used by
// OpenGNT. Rather than hand-parsing the positional code syntax (fragile —
// the position meaning shifts by part of speech), this decodes the
// human-readable description string that OpenGNT's own analytical lexicon
// (`Lexicons/OGNT-Analytical_Lexicon.csv`) attaches to every code, e.g.
// "Verb, second Aorist, Active, Indicative, third, Singular".
//
// Every clause below was catalogued by dumping the full, deduplicated set
// of comma-separated clauses across all 1,110 codes in that lexicon (see
// the corpus build notes). decodeRmacDescription() throws on any clause it
// doesn't recognize, so a future edition of the lexicon with new codes fails
// the build loudly instead of silently mis-parsing.
//
// Two outputs, deliberately separate concerns:
//   - `formId`: the verb form (tense+voice+mood) this token requires the
//     learner to know, or null for anything that isn't a verb. This is the
//     ONLY thing that gates readability — see src/lib/scorer.ts.
//   - `label`: the full human-readable parse for the word-detail popover,
//     including person/number/case/gender. Displayed, never gated on.

import type { Mood, Tense, Voice } from '../data/verbForms'

/** Part of speech, from the first clause of the description. */
const POS_MAP: Record<string, string> = {
  noun: 'Noun',
  verb: 'Verb',
  adjective: 'Adjective',
  'definite article': 'Article',
  'personal pronoun': 'Personal pronoun',
  'demonstrative pronoun': 'Demonstrative pronoun',
  'relative pronoun': 'Relative pronoun',
  'interrogative pronoun': 'Interrogative pronoun',
  'correlative or interrogative pronoun': 'Correlative/interrogative pronoun',
  'correlative pronoun': 'Correlative pronoun',
  'indefinite pronoun': 'Indefinite pronoun',
  'reciprocal pronoun': 'Reciprocal pronoun',
  'possessive pronoun': 'Possessive pronoun',
  'reflexive pronoun': 'Reflexive pronoun',
  preposition: 'Preposition',
  conjunction: 'Conjunction',
  'conjunction or conjunctive particle': 'Conjunction/particle',
  adverb: 'Adverb',
  'adverb or adverb and particle combined': 'Adverb/particle',
  particle: 'Particle',
  interjection: 'Interjection',
  'indeclinable numeral (adjective)': 'Numeral',
  'hebrew transliterated word (indeclinable)': 'Hebrew word (indeclinable)',
  hebrew: 'Hebrew word',
  'aramaic transliterated word (indeclinable)': 'Aramaic word (indeclinable)',
}

// --- Verb-form axes ---------------------------------------------------------
// "second present"/"second future"/"second pluperfect" are RMAC bookkeeping for
// alternate stem formations; they aren't distinct things to learn, so they map
// onto the plain tense. 1st/2nd perfect likewise unify. 1st/2nd aorist do NOT —
// that split is the whole reason this corpus was chosen over MACULA.
const TENSE_MAP: Record<string, Tense> = {
  present: 'Present',
  'second present': 'Present',
  imperfect: 'Imperfect',
  future: 'Future',
  'second future': 'Future',
  aorist: 'Aorist (1st)',
  'second aorist': 'Aorist (2nd)',
  perfect: 'Perfect',
  'second perfect': 'Perfect',
  pluperfect: 'Pluperfect',
  'second pluperfect': 'Pluperfect',
}

// Deponent voices collapse onto the voice the form is actually spelled as.
// Deponency is a lexical fact about a verb (ἔρχομαι simply has no active
// forms), not a paradigm with its own endings to learn: a middle-deponent
// aorist is indistinguishable in shape from a middle aorist.
const VOICE_MAP: Record<string, Voice> = {
  active: 'Active',
  middle: 'Middle',
  'middle deponent': 'Middle',
  passive: 'Passive',
  'passive deponent': 'Passive',
  'either middle or passive': 'Middle/Passive',
  'middle or passive deponent': 'Middle/Passive',
}

const MOOD_MAP: Record<string, Mood> = {
  indicative: 'Indicative',
  subjunctive: 'Subjunctive',
  imperative: 'Imperative',
  infinitive: 'Infinitive',
  participle: 'Participle',
  optative: 'Optative',
}

// Short ids matching src/data/verbForms.ts. Kept here so the decoder can build
// a form id without importing the (generated) form table.
const TENSE_ID: Record<Tense, string> = {
  Present: 'pres',
  Imperfect: 'impf',
  Future: 'fut',
  'Aorist (1st)': 'aor1',
  'Aorist (2nd)': 'aor2',
  Perfect: 'perf',
  Pluperfect: 'plup',
}
const VOICE_ID: Record<Voice, string> = {
  Active: 'act',
  Middle: 'mid',
  Passive: 'pass',
  'Middle/Passive': 'midpass',
}
const MOOD_ID: Record<Mood, string> = {
  Indicative: 'ind',
  Subjunctive: 'subj',
  Imperative: 'impv',
  Infinitive: 'inf',
  Participle: 'ptcp',
  Optative: 'opt',
}

// --- Display-only axes ------------------------------------------------------
// These no longer gate anything, but the popover still shows them when you tap
// a word ("Genitive Singular Masculine").
const CASE_MAP: Record<string, string> = {
  nominative: 'Nominative',
  genitive: 'Genitive',
  dative: 'Dative',
  accusative: 'Accusative',
  vocative: 'Vocative',
}
const NUMBER_MAP: Record<string, string> = { singular: 'Singular', plural: 'Plural' }
const GENDER_MAP: Record<string, string> = {
  masculine: 'Masculine',
  feminine: 'Feminine',
  neuter: 'Neuter',
}
const PERSON_MAP: Record<string, string> = { first: '1st', second: '2nd', third: '3rd' }
const DEGREE_MAP: Record<string, string> = {
  comparative: 'Comparative',
  superlative: 'Superlative',
}

/**
 * Clauses that are real (attested in the lexicon) but add nothing a learner
 * tracks — proper-noun/place-name subclassification, crasis markers, etc.
 * Recognized so the decoder doesn't treat them as unknown.
 */
const NOOP_CLAUSES = new Set([
  'contracted form',
  'kai',
  'negative',
  'interrogative',
  'location',
  'location gentilic',
  'person',
  'person gentilic',
  'title',
  'letter indeclinable (n)',
  'numerical indiclinable (a)',
  'disjunctive particle',
])

export class UnrecognizedRmacClauseError extends Error {
  code: string
  description: string
  clause: string

  constructor(code: string, description: string, clause: string) {
    super(`Unrecognized RMAC clause "${clause}" in ${code} ("${description}")`)
    this.name = 'UnrecognizedRmacClauseError'
    this.code = code
    this.description = description
    this.clause = clause
  }
}

export interface DecodedRmac {
  /** Verb form id (see src/data/verbForms.ts), or null when not a verb. */
  formId: string | null
  /** Human-readable full parse, for display only. */
  label: string
}

/**
 * Decode an RMAC code's lexicon description.
 * Throws UnrecognizedRmacClauseError on any clause not catalogued above — by
 * design, so an unrecognized form fails the corpus build rather than silently
 * decoding to something incomplete.
 */
export function decodeRmacDescription(code: string, description: string): DecodedRmac {
  const parts = description.split(',').map((p) => p.trim())

  const posKey = parts[0].toLowerCase()
  const pos = POS_MAP[posKey]
  if (!pos) throw new UnrecognizedRmacClauseError(code, description, parts[0])

  let tense: Tense | null = null
  let voice: Voice | null = null
  let mood: Mood | null = null
  let grammaticalCase: string | null = null
  let num: string | null = null
  let gender: string | null = null
  let person: string | null = null
  let degree: string | null = null

  for (let i = 1; i < parts.length; i++) {
    const key = parts[i].toLowerCase()
    if (key in TENSE_MAP) tense = TENSE_MAP[key]
    else if (key in VOICE_MAP) voice = VOICE_MAP[key]
    else if (key in MOOD_MAP) mood = MOOD_MAP[key]
    else if (key in CASE_MAP) grammaticalCase = CASE_MAP[key]
    else if (key in NUMBER_MAP) num = NUMBER_MAP[key]
    else if (key in GENDER_MAP) gender = GENDER_MAP[key]
    else if (key in PERSON_MAP) person = PERSON_MAP[key]
    else if (key in DEGREE_MAP) degree = DEGREE_MAP[key]
    else if (NOOP_CLAUSES.has(key)) continue
    else throw new UnrecognizedRmacClauseError(code, description, parts[i])
  }

  const isVerb = posKey === 'verb'
  let formId: string | null = null
  if (isVerb) {
    if (!tense || !voice || !mood) {
      throw new Error(
        `Verb code ${code} ("${description}") is missing tense/voice/mood — cannot assign a form.`,
      )
    }
    formId = `${TENSE_ID[tense]}.${VOICE_ID[voice]}.${MOOD_ID[mood]}`
  }

  // Label: verbs lead with the form, then person/number (finite) or
  // case/number/gender (participles). Everything else is just its inflection.
  const bits: string[] = []
  if (isVerb) {
    bits.push(`${tense} ${voice} ${mood}`)
    if (person) bits.push(`${person} person`)
  } else {
    bits.push(pos)
    if (degree) bits.push(degree)
    if (grammaticalCase) bits.push(grammaticalCase)
  }
  if (isVerb && grammaticalCase) bits.push(grammaticalCase)
  if (num) bits.push(num)
  if (gender) bits.push(gender)

  return { formId, label: bits.join(' · ') }
}
