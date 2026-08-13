// Decoder for RMAC (Robinson's Morphological Analysis Codes), as used by
// OpenGNT. Rather than hand-parsing the positional code syntax (fragile —
// the position meaning shifts by part of speech), this decodes the
// human-readable description string that OpenGNT's own analytical lexicon
// (`Lexicons/OGNT-Analytical_Lexicon.csv`) attaches to every code, e.g.
// "Verb, second Aorist, Active, Indicative, third, Singular".
//
// Every clause below was catalogued by dumping the full, deduplicated set
// of comma-separated clauses across all 1,110 codes in that lexicon (see
// the corpus build notes). decodeRmac() throws on any clause it doesn't
// recognize, so a future edition of the lexicon with new codes fails the
// build loudly instead of silently mis-parsing.

/** First clause of the description => concept ids for the token's part of speech. */
const POS_MAP: Record<string, string[]> = {
  noun: ['pos.noun'],
  verb: ['pos.verb'],
  adjective: ['pos.adjective'],
  'definite article': ['pos.article'],
  'personal pronoun': ['pos.pronoun', 'pronoun.personal'],
  'demonstrative pronoun': ['pos.pronoun', 'pronoun.demonstrative'],
  'relative pronoun': ['pos.pronoun', 'pronoun.relative'],
  'interrogative pronoun': ['pos.pronoun', 'pronoun.interrogative'],
  'correlative or interrogative pronoun': [
    'pos.pronoun',
    'pronoun.interrogative',
    'pronoun.correlative',
  ],
  'correlative pronoun': ['pos.pronoun', 'pronoun.correlative'],
  'indefinite pronoun': ['pos.pronoun', 'pronoun.indefinite'],
  'reciprocal pronoun': ['pos.pronoun', 'pronoun.reciprocal'],
  'possessive pronoun': ['pos.pronoun', 'pronoun.possessive'],
  'reflexive pronoun': ['pos.pronoun', 'pronoun.reflexive'],
  preposition: ['pos.preposition'],
  conjunction: ['pos.conjunction'],
  'conjunction or conjunctive particle': ['pos.conjunction', 'pos.particle'],
  adverb: ['pos.adverb'],
  'adverb or adverb and particle combined': ['pos.adverb', 'pos.particle'],
  particle: ['pos.particle'],
  interjection: ['pos.interjection'],
  'indeclinable numeral (adjective)': ['pos.numeral', 'pos.adjective'],
  'hebrew transliterated word (indeclinable)': ['pos.noun'],
  hebrew: ['pos.noun'],
  'aramaic transliterated word (indeclinable)': ['pos.noun'],
}

/** Every other clause (case, number, gender, person, tense, voice, mood, degree). */
const CLAUSE_MAP: Record<string, string[]> = {
  nominative: ['case.nominative'],
  genitive: ['case.genitive'],
  dative: ['case.dative'],
  accusative: ['case.accusative'],
  vocative: ['case.vocative'],

  singular: ['number.singular'],
  plural: ['number.plural'],

  masculine: ['gender.masculine'],
  feminine: ['gender.feminine'],
  neuter: ['gender.neuter'],

  first: ['person.first'],
  second: ['person.second'],
  third: ['person.third'],

  present: ['tense.present'],
  'second present': ['tense.present'],
  imperfect: ['tense.imperfect'],
  future: ['tense.future'],
  'second future': ['tense.future'],
  aorist: ['tense.aorist', 'aorist.first'],
  'second aorist': ['tense.aorist', 'aorist.second'],
  perfect: ['tense.perfect', 'perfect.first'],
  'second perfect': ['tense.perfect', 'perfect.second'],
  pluperfect: ['tense.pluperfect'],
  'second pluperfect': ['tense.pluperfect'],

  active: ['voice.active'],
  middle: ['voice.middle'],
  passive: ['voice.passive'],
  'either middle or passive': ['voice.middle-or-passive'],
  'middle deponent': ['voice.deponent-middle'],
  'passive deponent': ['voice.deponent-passive'],
  'middle or passive deponent': ['voice.deponent-middle-or-passive'],

  indicative: ['mood.indicative'],
  imperative: ['mood.imperative'],
  subjunctive: ['mood.subjunctive'],
  optative: ['mood.optative'],
  infinitive: ['mood.infinitive'],
  participle: ['mood.participle'],

  comparative: ['degree.comparative'],
  superlative: ['degree.superlative'],
}

/**
 * Clauses that are real (attested in the lexicon) but carry no grammar
 * concept a Mounce-track learner tracks separately — proper-noun/place-name
 * subclassification, crasis markers, etc. Recognized so the decoder doesn't
 * treat them as an unknown clause; they simply add nothing.
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

/**
 * Decode an RMAC code's lexicon description into a set of concept ids.
 * Throws UnrecognizedRmacClauseError on any clause not catalogued above —
 * by design, so an unrecognized form fails the corpus build instead of
 * silently being tagged with an incomplete concept set.
 */
export function decodeRmacDescription(code: string, description: string): string[] {
  const parts = description.split(',').map((p) => p.trim())
  const concepts = new Set<string>()

  const posKey = parts[0].toLowerCase()
  const posConcepts = POS_MAP[posKey]
  if (!posConcepts) {
    throw new UnrecognizedRmacClauseError(code, description, parts[0])
  }
  posConcepts.forEach((c) => concepts.add(c))

  for (let i = 1; i < parts.length; i++) {
    const key = parts[i].toLowerCase()
    const mapped = CLAUSE_MAP[key]
    if (mapped) {
      mapped.forEach((c) => concepts.add(c))
      continue
    }
    if (NOOP_CLAUSES.has(key)) continue
    throw new UnrecognizedRmacClauseError(code, description, parts[i])
  }

  return Array.from(concepts)
}
