// The 90 verb forms attested in the Greek New Testament.
//
// A "form" is a tense+voice+mood bundle — the unit a learner actually studies
// and marks off ("Present Active Indicative", "Aorist (2nd) Active
// Subjunctive"). Person/number on finite verbs, and case/number/gender on
// participles, are NOT part of the bundle: those are inflection *within* a
// paradigm you've already learned.
//
// This list is generated from the corpus, not hand-written — it is exactly the
// set of bundles attested in OpenGNT, covering all 28,113 verb tokens. The full
// 7x4x6 cross-product would be 168, so 78 combinations never occur in the NT
// and are deliberately absent; the setup grid greys those cells out.
//
// Two collapses are baked in here and in the RMAC decoder (src/lib/rmac.ts):
//   - Deponent voices fold into the voice they are spelled as. Deponency is a
//     lexical property of a word, not a paradigm: a middle-deponent aorist
//     takes the same endings as a middle aorist.
//   - 1st/2nd perfect unify into "Perfect". The aorist stays split, because
//     the 1st/2nd aorist distinction is a major topic (5,236 tokens) while the
//     2nd perfect is a footnote (~167).

export type Tense =
  | 'Present'
  | 'Imperfect'
  | 'Future'
  | 'Aorist (1st)'
  | 'Aorist (2nd)'
  | 'Perfect'
  | 'Pluperfect'

export type Voice = 'Active' | 'Middle' | 'Passive' | 'Middle/Passive'

export type Mood =
  | 'Indicative'
  | 'Subjunctive'
  | 'Imperative'
  | 'Infinitive'
  | 'Participle'
  | 'Optative'

export interface VerbForm {
  /** Stable id, e.g. "aor2.act.subj". Persisted in profiles — never renumber. */
  id: string
  tense: Tense
  voice: Voice
  mood: Mood
}

/** Row/column ordering for the paradigm grid. */
export const TENSE_ORDER: Tense[] = [
  'Present',
  'Imperfect',
  'Future',
  'Aorist (1st)',
  'Aorist (2nd)',
  'Perfect',
  'Pluperfect',
]
export const VOICE_ORDER: Voice[] = ['Active', 'Middle', 'Passive', 'Middle/Passive']
export const MOOD_ORDER: Mood[] = [
  'Indicative',
  'Subjunctive',
  'Imperative',
  'Infinitive',
  'Participle',
  'Optative',
]

// Trailing comment on each line is its NT token count at time of generation.
export const VERB_FORMS: VerbForm[] = [
  { id: 'pres.act.ind', tense: 'Present', voice: 'Active', mood: 'Indicative' }, // 4571
  { id: 'pres.act.subj', tense: 'Present', voice: 'Active', mood: 'Subjunctive' }, // 405
  { id: 'pres.act.impv', tense: 'Present', voice: 'Active', mood: 'Imperative' }, // 610
  { id: 'pres.act.inf', tense: 'Present', voice: 'Active', mood: 'Infinitive' }, // 758
  { id: 'pres.act.ptcp', tense: 'Present', voice: 'Active', mood: 'Participle' }, // 2684
  { id: 'pres.act.opt', tense: 'Present', voice: 'Active', mood: 'Optative' }, // 19
  { id: 'pres.mid.ind', tense: 'Present', voice: 'Middle', mood: 'Indicative' }, // 73
  { id: 'pres.mid.subj', tense: 'Present', voice: 'Middle', mood: 'Subjunctive' }, // 8
  { id: 'pres.mid.impv', tense: 'Present', voice: 'Middle', mood: 'Imperative' }, // 23
  { id: 'pres.mid.inf', tense: 'Present', voice: 'Middle', mood: 'Infinitive' }, // 25
  { id: 'pres.mid.ptcp', tense: 'Present', voice: 'Middle', mood: 'Participle' }, // 114
  { id: 'pres.pass.ind', tense: 'Present', voice: 'Passive', mood: 'Indicative' }, // 263
  { id: 'pres.pass.subj', tense: 'Present', voice: 'Passive', mood: 'Subjunctive' }, // 16
  { id: 'pres.pass.impv', tense: 'Present', voice: 'Passive', mood: 'Imperative' }, // 45
  { id: 'pres.pass.inf', tense: 'Present', voice: 'Passive', mood: 'Infinitive' }, // 96
  { id: 'pres.pass.ptcp', tense: 'Present', voice: 'Passive', mood: 'Participle' }, // 345
  { id: 'pres.midpass.ind', tense: 'Present', voice: 'Middle/Passive', mood: 'Indicative' }, // 620
  { id: 'pres.midpass.subj', tense: 'Present', voice: 'Middle/Passive', mood: 'Subjunctive' }, // 36
  { id: 'pres.midpass.impv', tense: 'Present', voice: 'Middle/Passive', mood: 'Imperative' }, // 177
  { id: 'pres.midpass.inf', tense: 'Present', voice: 'Middle/Passive', mood: 'Infinitive' }, // 114
  { id: 'pres.midpass.ptcp', tense: 'Present', voice: 'Middle/Passive', mood: 'Participle' }, // 548
  { id: 'pres.midpass.opt', tense: 'Present', voice: 'Middle/Passive', mood: 'Optative' }, // 4
  { id: 'impf.act.ind', tense: 'Imperfect', voice: 'Active', mood: 'Indicative' }, // 1361
  { id: 'impf.mid.ind', tense: 'Imperfect', voice: 'Middle', mood: 'Indicative' }, // 60
  { id: 'impf.pass.ind', tense: 'Imperfect', voice: 'Passive', mood: 'Indicative' }, // 83
  { id: 'impf.midpass.ind', tense: 'Imperfect', voice: 'Middle/Passive', mood: 'Indicative' }, // 178
  { id: 'fut.act.ind', tense: 'Future', voice: 'Active', mood: 'Indicative' }, // 828
  { id: 'fut.act.inf', tense: 'Future', voice: 'Active', mood: 'Infinitive' }, // 1
  { id: 'fut.act.ptcp', tense: 'Future', voice: 'Active', mood: 'Participle' }, // 9
  { id: 'fut.mid.ind', tense: 'Future', voice: 'Middle', mood: 'Indicative' }, // 485
  { id: 'fut.mid.inf', tense: 'Future', voice: 'Middle', mood: 'Infinitive' }, // 5
  { id: 'fut.mid.ptcp', tense: 'Future', voice: 'Middle', mood: 'Participle' }, // 2
  { id: 'fut.pass.ind', tense: 'Future', voice: 'Passive', mood: 'Indicative' }, // 289
  { id: 'fut.pass.ptcp', tense: 'Future', voice: 'Passive', mood: 'Participle' }, // 1
  { id: 'fut.midpass.ind', tense: 'Future', voice: 'Middle/Passive', mood: 'Indicative' }, // 8
  { id: 'aor1.act.ind', tense: 'Aorist (1st)', voice: 'Active', mood: 'Indicative' }, // 2191
  { id: 'aor1.act.subj', tense: 'Aorist (1st)', voice: 'Active', mood: 'Subjunctive' }, // 524
  { id: 'aor1.act.impv', tense: 'Aorist (1st)', voice: 'Active', mood: 'Imperative' }, // 363
  { id: 'aor1.act.inf', tense: 'Aorist (1st)', voice: 'Active', mood: 'Infinitive' }, // 533
  { id: 'aor1.act.ptcp', tense: 'Aorist (1st)', voice: 'Active', mood: 'Participle' }, // 703
  { id: 'aor1.act.opt', tense: 'Aorist (1st)', voice: 'Active', mood: 'Optative' }, // 13
  { id: 'aor1.mid.ind', tense: 'Aorist (1st)', voice: 'Middle', mood: 'Indicative' }, // 425
  { id: 'aor1.mid.subj', tense: 'Aorist (1st)', voice: 'Middle', mood: 'Subjunctive' }, // 89
  { id: 'aor1.mid.impv', tense: 'Aorist (1st)', voice: 'Middle', mood: 'Imperative' }, // 70
  { id: 'aor1.mid.inf', tense: 'Aorist (1st)', voice: 'Middle', mood: 'Infinitive' }, // 64
  { id: 'aor1.mid.ptcp', tense: 'Aorist (1st)', voice: 'Middle', mood: 'Participle' }, // 151
  { id: 'aor1.mid.opt', tense: 'Aorist (1st)', voice: 'Middle', mood: 'Optative' }, // 1
  { id: 'aor1.pass.ind', tense: 'Aorist (1st)', voice: 'Passive', mood: 'Indicative' }, // 645
  { id: 'aor1.pass.subj', tense: 'Aorist (1st)', voice: 'Passive', mood: 'Subjunctive' }, // 235
  { id: 'aor1.pass.impv', tense: 'Aorist (1st)', voice: 'Passive', mood: 'Imperative' }, // 65
  { id: 'aor1.pass.inf', tense: 'Aorist (1st)', voice: 'Passive', mood: 'Infinitive' }, // 165
  { id: 'aor1.pass.ptcp', tense: 'Aorist (1st)', voice: 'Passive', mood: 'Participle' }, // 358
  { id: 'aor1.pass.opt', tense: 'Aorist (1st)', voice: 'Passive', mood: 'Optative' }, // 5
  { id: 'aor1.midpass.ind', tense: 'Aorist (1st)', voice: 'Middle/Passive', mood: 'Indicative' }, // 5
  { id: 'aor1.midpass.ptcp', tense: 'Aorist (1st)', voice: 'Middle/Passive', mood: 'Participle' }, // 2
  { id: 'aor2.act.ind', tense: 'Aorist (2nd)', voice: 'Active', mood: 'Indicative' }, // 2178
  { id: 'aor2.act.subj', tense: 'Aorist (2nd)', voice: 'Active', mood: 'Subjunctive' }, // 430
  { id: 'aor2.act.impv', tense: 'Aorist (2nd)', voice: 'Active', mood: 'Imperative' }, // 244
  { id: 'aor2.act.inf', tense: 'Aorist (2nd)', voice: 'Active', mood: 'Infinitive' }, // 425
  { id: 'aor2.act.ptcp', tense: 'Aorist (2nd)', voice: 'Active', mood: 'Participle' }, // 881
  { id: 'aor2.act.opt', tense: 'Aorist (2nd)', voice: 'Active', mood: 'Optative' }, // 8
  { id: 'aor2.mid.ind', tense: 'Aorist (2nd)', voice: 'Middle', mood: 'Indicative' }, // 317
  { id: 'aor2.mid.subj', tense: 'Aorist (2nd)', voice: 'Middle', mood: 'Subjunctive' }, // 82
  { id: 'aor2.mid.impv', tense: 'Aorist (2nd)', voice: 'Middle', mood: 'Imperative' }, // 7
  { id: 'aor2.mid.inf', tense: 'Aorist (2nd)', voice: 'Middle', mood: 'Infinitive' }, // 49
  { id: 'aor2.mid.ptcp', tense: 'Aorist (2nd)', voice: 'Middle', mood: 'Participle' }, // 154
  { id: 'aor2.mid.opt', tense: 'Aorist (2nd)', voice: 'Middle', mood: 'Optative' }, // 18
  { id: 'aor2.pass.ind', tense: 'Aorist (2nd)', voice: 'Passive', mood: 'Indicative' }, // 115
  { id: 'aor2.pass.subj', tense: 'Aorist (2nd)', voice: 'Passive', mood: 'Subjunctive' }, // 22
  { id: 'aor2.pass.impv', tense: 'Aorist (2nd)', voice: 'Passive', mood: 'Imperative' }, // 12
  { id: 'aor2.pass.inf', tense: 'Aorist (2nd)', voice: 'Passive', mood: 'Infinitive' }, // 6
  { id: 'aor2.pass.ptcp', tense: 'Aorist (2nd)', voice: 'Passive', mood: 'Participle' }, // 34
  { id: 'perf.act.ind', tense: 'Perfect', voice: 'Active', mood: 'Indicative' }, // 604
  { id: 'perf.act.subj', tense: 'Perfect', voice: 'Active', mood: 'Subjunctive' }, // 10
  { id: 'perf.act.impv', tense: 'Perfect', voice: 'Active', mood: 'Imperative' }, // 2
  { id: 'perf.act.inf', tense: 'Perfect', voice: 'Active', mood: 'Infinitive' }, // 38
  { id: 'perf.act.ptcp', tense: 'Perfect', voice: 'Active', mood: 'Participle' }, // 224
  { id: 'perf.mid.ind', tense: 'Perfect', voice: 'Middle', mood: 'Indicative' }, // 11
  { id: 'perf.mid.impv', tense: 'Perfect', voice: 'Middle', mood: 'Imperative' }, // 1
  { id: 'perf.mid.ptcp', tense: 'Perfect', voice: 'Middle', mood: 'Participle' }, // 27
  { id: 'perf.pass.ind', tense: 'Perfect', voice: 'Passive', mood: 'Indicative' }, // 202
  { id: 'perf.pass.impv', tense: 'Perfect', voice: 'Passive', mood: 'Imperative' }, // 1
  { id: 'perf.pass.inf', tense: 'Perfect', voice: 'Passive', mood: 'Infinitive' }, // 10
  { id: 'perf.pass.ptcp', tense: 'Perfect', voice: 'Passive', mood: 'Participle' }, // 414
  { id: 'perf.midpass.ind', tense: 'Perfect', voice: 'Middle/Passive', mood: 'Indicative' }, // 21
  { id: 'perf.midpass.inf', tense: 'Perfect', voice: 'Middle/Passive', mood: 'Infinitive' }, // 1
  { id: 'perf.midpass.ptcp', tense: 'Perfect', voice: 'Middle/Passive', mood: 'Participle' }, // 8
  { id: 'plup.act.ind', tense: 'Pluperfect', voice: 'Active', mood: 'Indicative' }, // 79
  { id: 'plup.mid.ind', tense: 'Pluperfect', voice: 'Middle', mood: 'Indicative' }, // 2
  { id: 'plup.pass.ind', tense: 'Pluperfect', voice: 'Passive', mood: 'Indicative' }, // 5
]

export const VERB_FORM_BY_ID: Record<string, VerbForm> = Object.fromEntries(
  VERB_FORMS.map((f) => [f.id, f]),
)

export const VERB_FORM_IDS: string[] = VERB_FORMS.map((f) => f.id)

export function verbFormLabel(f: VerbForm): string {
  return `${f.tense} ${f.voice} ${f.mood}`
}

/** Grid lookup: which forms actually exist for a given tense. */
export function formFor(tense: Tense, voice: Voice, mood: Mood): VerbForm | undefined {
  return VERB_FORMS.find((f) => f.tense === tense && f.voice === voice && f.mood === mood)
}
