// Grammar concept taxonomy.
//
// Each concept is something a learner can mark "known". A token's `concepts`
// array (assigned at corpus-build time, see scripts/build-corpus.ts) is
// exactly the set of concepts required to parse that token. A verse is
// blocked by a token when the token's concept set is not a subset of the
// learner's known-concept set.
//
// IDs are stable strings (not array indices) so the build pipeline and the
// app can evolve independently without silently mis-aligning.

export type ConceptGroup =
  | 'pos'
  | 'pronoun-type'
  | 'case'
  | 'number'
  | 'gender'
  | 'tense'
  | 'aorist-type'
  | 'perfect-type'
  | 'voice'
  | 'mood'
  | 'person'
  | 'degree'
  | 'verb-class'

export interface Concept {
  id: string
  group: ConceptGroup
  label: string
  /** Short parenthetical shown next to the label in dense UI. */
  short?: string
}

export const CONCEPTS: Concept[] = [
  // Part of speech
  { id: 'pos.noun', group: 'pos', label: 'Noun' },
  { id: 'pos.verb', group: 'pos', label: 'Verb' },
  { id: 'pos.adjective', group: 'pos', label: 'Adjective' },
  { id: 'pos.article', group: 'pos', label: 'Article' },
  { id: 'pos.pronoun', group: 'pos', label: 'Pronoun' },
  { id: 'pos.preposition', group: 'pos', label: 'Preposition' },
  { id: 'pos.conjunction', group: 'pos', label: 'Conjunction' },
  { id: 'pos.adverb', group: 'pos', label: 'Adverb' },
  { id: 'pos.particle', group: 'pos', label: 'Particle' },
  { id: 'pos.interjection', group: 'pos', label: 'Interjection' },
  { id: 'pos.numeral', group: 'pos', label: 'Numeral' },

  // Pronoun subtype (only tagged alongside pos.pronoun)
  { id: 'pronoun.personal', group: 'pronoun-type', label: 'Personal pronoun' },
  { id: 'pronoun.demonstrative', group: 'pronoun-type', label: 'Demonstrative pronoun' },
  { id: 'pronoun.relative', group: 'pronoun-type', label: 'Relative pronoun' },
  { id: 'pronoun.interrogative', group: 'pronoun-type', label: 'Interrogative pronoun' },
  { id: 'pronoun.indefinite', group: 'pronoun-type', label: 'Indefinite pronoun' },
  { id: 'pronoun.reciprocal', group: 'pronoun-type', label: 'Reciprocal pronoun' },
  { id: 'pronoun.possessive', group: 'pronoun-type', label: 'Possessive pronoun' },
  { id: 'pronoun.reflexive', group: 'pronoun-type', label: 'Reflexive pronoun' },
  { id: 'pronoun.correlative', group: 'pronoun-type', label: 'Correlative pronoun' },

  // Case
  { id: 'case.nominative', group: 'case', label: 'Nominative', short: 'Nom' },
  { id: 'case.genitive', group: 'case', label: 'Genitive', short: 'Gen' },
  { id: 'case.dative', group: 'case', label: 'Dative', short: 'Dat' },
  { id: 'case.accusative', group: 'case', label: 'Accusative', short: 'Acc' },
  { id: 'case.vocative', group: 'case', label: 'Vocative', short: 'Voc' },

  // Number
  { id: 'number.singular', group: 'number', label: 'Singular', short: 'Sg' },
  { id: 'number.plural', group: 'number', label: 'Plural', short: 'Pl' },

  // Gender
  { id: 'gender.masculine', group: 'gender', label: 'Masculine', short: 'Masc' },
  { id: 'gender.feminine', group: 'gender', label: 'Feminine', short: 'Fem' },
  { id: 'gender.neuter', group: 'gender', label: 'Neuter', short: 'Neut' },

  // Tense
  { id: 'tense.present', group: 'tense', label: 'Present' },
  { id: 'tense.imperfect', group: 'tense', label: 'Imperfect' },
  { id: 'tense.future', group: 'tense', label: 'Future' },
  { id: 'tense.aorist', group: 'tense', label: 'Aorist' },
  { id: 'tense.perfect', group: 'tense', label: 'Perfect' },
  { id: 'tense.pluperfect', group: 'tense', label: 'Pluperfect' },

  // Aorist / perfect subtype (tagged alongside the matching tense concept)
  { id: 'aorist.first', group: 'aorist-type', label: '1st aorist' },
  { id: 'aorist.second', group: 'aorist-type', label: '2nd aorist' },
  { id: 'perfect.first', group: 'perfect-type', label: '1st perfect' },
  { id: 'perfect.second', group: 'perfect-type', label: '2nd perfect' },

  // Voice
  { id: 'voice.active', group: 'voice', label: 'Active' },
  { id: 'voice.middle', group: 'voice', label: 'Middle' },
  { id: 'voice.passive', group: 'voice', label: 'Passive' },
  { id: 'voice.middle-or-passive', group: 'voice', label: 'Middle or passive (ambiguous form)' },
  { id: 'voice.deponent-middle', group: 'voice', label: 'Deponent (middle form)' },
  { id: 'voice.deponent-passive', group: 'voice', label: 'Deponent (passive form)' },
  { id: 'voice.deponent-middle-or-passive', group: 'voice', label: 'Deponent (ambiguous form)' },

  // Mood
  { id: 'mood.indicative', group: 'mood', label: 'Indicative' },
  { id: 'mood.imperative', group: 'mood', label: 'Imperative' },
  { id: 'mood.subjunctive', group: 'mood', label: 'Subjunctive' },
  { id: 'mood.optative', group: 'mood', label: 'Optative' },
  { id: 'mood.infinitive', group: 'mood', label: 'Infinitive' },
  { id: 'mood.participle', group: 'mood', label: 'Participle' },

  // Person
  { id: 'person.first', group: 'person', label: '1st person' },
  { id: 'person.second', group: 'person', label: '2nd person' },
  { id: 'person.third', group: 'person', label: '3rd person' },

  // Degree
  { id: 'degree.comparative', group: 'degree', label: 'Comparative' },
  { id: 'degree.superlative', group: 'degree', label: 'Superlative' },

  // Verb class (derived from the lemma shape at build time, not from RMAC)
  { id: 'verb.contract', group: 'verb-class', label: 'Contract verb (-άω/-έω/-όω)' },
  { id: 'verb.mi', group: 'verb-class', label: 'μι-verb' },
]

export const CONCEPT_BY_ID: Record<string, Concept> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c]),
)

export const CONCEPT_IDS: string[] = CONCEPTS.map((c) => c.id)

export const GROUP_LABELS: Record<ConceptGroup, string> = {
  pos: 'Part of speech',
  'pronoun-type': 'Pronoun type',
  case: 'Case',
  number: 'Number',
  gender: 'Gender',
  tense: 'Tense',
  'aorist-type': 'Aorist type',
  'perfect-type': 'Perfect type',
  voice: 'Voice',
  mood: 'Mood',
  person: 'Person',
  degree: 'Degree',
  'verb-class': 'Verb class',
}

export const GROUP_ORDER: ConceptGroup[] = [
  'pos',
  'pronoun-type',
  'case',
  'number',
  'gender',
  'tense',
  'aorist-type',
  'perfect-type',
  'voice',
  'mood',
  'person',
  'degree',
  'verb-class',
]
