// Renders the English a Greek verb form comes out as: ἦν, parsed Imperfect
// Active Indicative 3rd Singular, is "he/she/it was".
//
// The pieces are already in the corpus — the lemma gloss is headed in the 1st
// person present ("I am", "I come/go", see scripts/lib/verbGloss.ts), the RMAC
// code carries person and number, and the verb form carries tense/voice/mood —
// so this is English morphology plus a table of what each Greek form maps onto.
//
// It is a study aid, not a translation: Greek aspect does not line up with
// English tense, and a participle's case is dropped entirely. What it is good
// for is the thing a beginner keeps stumbling on, which ending goes with which
// English person, and it beats reading "3rd person · Singular" and doing that
// conversion in your head every time.

import type { VerbForm } from '../data/verbForms'

/**
 * English verbs whose past tense and past participle aren't base+ed. Every
 * irregular verb that heads a gloss in the corpus is here; anything missing is
 * treated as regular, so a gap shows up as "he speaked" rather than as a crash.
 * scripts/verify-english.ts walks every lemma to keep that honest.
 */
const IRREGULAR: Record<string, readonly [past: string, participle: string]> = {
  // "be" is listed for its participle; its past is person-dependent and handled
  // by the renderer, which knows whether the subject is plural.
  be: ['was', 'been'],
  arise: ['arose', 'arisen'],
  awake: ['awoke', 'awoken'],
  bear: ['bore', 'borne'],
  beat: ['beat', 'beaten'],
  become: ['became', 'become'],
  beget: ['begot', 'begotten'],
  begin: ['began', 'begun'],
  bend: ['bent', 'bent'],
  bind: ['bound', 'bound'],
  bite: ['bit', 'bitten'],
  bleed: ['bled', 'bled'],
  blow: ['blew', 'blown'],
  break: ['broke', 'broken'],
  bring: ['brought', 'brought'],
  build: ['built', 'built'],
  burst: ['burst', 'burst'],
  buy: ['bought', 'bought'],
  cast: ['cast', 'cast'],
  catch: ['caught', 'caught'],
  choose: ['chose', 'chosen'],
  cling: ['clung', 'clung'],
  come: ['came', 'come'],
  cut: ['cut', 'cut'],
  dig: ['dug', 'dug'],
  do: ['did', 'done'],
  draw: ['drew', 'drawn'],
  drink: ['drank', 'drunk'],
  drive: ['drove', 'driven'],
  dwell: ['dwelt', 'dwelt'],
  eat: ['ate', 'eaten'],
  fall: ['fell', 'fallen'],
  feed: ['fed', 'fed'],
  fight: ['fought', 'fought'],
  find: ['found', 'found'],
  flee: ['fled', 'fled'],
  fly: ['flew', 'flown'],
  foresee: ['foresaw', 'foreseen'],
  foretell: ['foretold', 'foretold'],
  forget: ['forgot', 'forgotten'],
  get: ['got', 'gotten'],
  give: ['gave', 'given'],
  go: ['went', 'gone'],
  grind: ['ground', 'ground'],
  grow: ['grew', 'grown'],
  hang: ['hung', 'hung'],
  have: ['had', 'had'],
  hear: ['heard', 'heard'],
  hew: ['hewed', 'hewn'],
  hide: ['hid', 'hidden'],
  hold: ['held', 'held'],
  hurt: ['hurt', 'hurt'],
  keep: ['kept', 'kept'],
  kneel: ['knelt', 'knelt'],
  know: ['knew', 'known'],
  lay: ['laid', 'laid'],
  lead: ['led', 'led'],
  leave: ['left', 'left'],
  lend: ['lent', 'lent'],
  lie: ['lay', 'lain'],
  lose: ['lost', 'lost'],
  make: ['made', 'made'],
  mean: ['meant', 'meant'],
  meet: ['met', 'met'],
  mow: ['mowed', 'mown'],
  outrun: ['outran', 'outrun'],
  oversee: ['oversaw', 'overseen'],
  pay: ['paid', 'paid'],
  put: ['put', 'put'],
  read: ['read', 'read'],
  rise: ['rose', 'risen'],
  run: ['ran', 'run'],
  saw: ['sawed', 'sawn'],
  say: ['said', 'said'],
  see: ['saw', 'seen'],
  seek: ['sought', 'sought'],
  sell: ['sold', 'sold'],
  send: ['sent', 'sent'],
  set: ['set', 'set'],
  sew: ['sewed', 'sewn'],
  shake: ['shook', 'shaken'],
  shave: ['shaved', 'shaven'],
  shear: ['sheared', 'shorn'],
  shine: ['shone', 'shone'],
  show: ['showed', 'shown'],
  shut: ['shut', 'shut'],
  sing: ['sang', 'sung'],
  sink: ['sank', 'sunk'],
  sit: ['sat', 'sat'],
  sleep: ['slept', 'slept'],
  sow: ['sowed', 'sown'],
  speak: ['spoke', 'spoken'],
  spend: ['spent', 'spent'],
  spin: ['spun', 'spun'],
  spit: ['spat', 'spat'],
  split: ['split', 'split'],
  spread: ['spread', 'spread'],
  spring: ['sprang', 'sprung'],
  stand: ['stood', 'stood'],
  steal: ['stole', 'stolen'],
  stink: ['stank', 'stunk'],
  strike: ['struck', 'struck'],
  strive: ['strove', 'striven'],
  swear: ['swore', 'sworn'],
  sweep: ['swept', 'swept'],
  swell: ['swelled', 'swollen'],
  swim: ['swam', 'swum'],
  take: ['took', 'taken'],
  teach: ['taught', 'taught'],
  tear: ['tore', 'torn'],
  tell: ['told', 'told'],
  think: ['thought', 'thought'],
  throw: ['threw', 'thrown'],
  undergo: ['underwent', 'undergone'],
  understand: ['understood', 'understood'],
  wake: ['woke', 'woken'],
  wear: ['wore', 'worn'],
  weave: ['wove', 'woven'],
  weep: ['wept', 'wept'],
  withdraw: ['withdrew', 'withdrawn'],
  write: ['wrote', 'written'],
}

/** Single-syllable consonant-vowel-consonant verbs that double before -ed/-ing. */
const DOUBLES_FINAL = /^[^aeiou]*[aeiou][^aeiouwxy]$/

const PRONOUNS: Record<string, string> = {
  '1S': 'I',
  '2S': 'you',
  '3S': 'he/she/it',
  '1P': 'we',
  '2P': 'you (pl)',
  '3P': 'they',
}

export interface ParsedCode {
  /** Finite forms only: '1' | '2' | '3'. */
  person?: string
  /** 'S' | 'P'. Absent on infinitives. */
  number?: string
  /**
   * RMAC's voice letter, which VERB_FORMS deliberately does not keep: it folds
   * each deponent onto the voice it is spelled as, because that is the paradigm
   * you learn. Meaning needs the distinction back — 'O' (passive deponent)
   * ἀπεκρίθη is "he answered", not "he was answered" — so only a plain 'P' is
   * really passive.
   */
  voice: string
  /** True for an infinitive, which has neither person nor number. */
  infinitive: boolean
}

/**
 * Person and number out of an RMAC code. Finite verbs end in a person/number
 * pair (V-IAI-3S), participles in case/number/gender whose middle letter is the
 * same number (V-PAP-NSM), and infinitives carry neither (V-PAN).
 */
export function parseVerbCode(code: string): ParsedCode | null {
  const segments = code.split('-')
  if (segments[0] !== 'V') return null
  // The tense/voice/mood triple, after any 2nd-aorist or 2nd-perfect prefix.
  const voice = segments[1].replace(/^\d+/, '')[1] ?? ''
  if (segments.length === 2) return { voice, infinitive: true }
  const tail = segments[2]
  if (/^[123][SP]$/.test(tail)) {
    return { person: tail[0], number: tail[1], voice, infinitive: false }
  }
  if (/^[NVGDA][SP][MFN]$/.test(tail)) return { number: tail[1], voice, infinitive: false }
  return null
}

function thirdPerson(base: string): string {
  if (base === 'be') return 'is'
  if (base === 'have') return 'has'
  if (/(s|sh|ch|x|z|o)$/.test(base)) return `${base}es`
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ies`
  return `${base}s`
}

function pastTense(base: string): string {
  const irregular = IRREGULAR[base]
  if (irregular) return irregular[0]
  if (base.endsWith('e')) return `${base}d`
  if (/[^aeiou]y$/.test(base)) return `${base.slice(0, -1)}ied`
  if (DOUBLES_FINAL.test(base)) return `${base + base.slice(-1)}ed`
  return `${base}ed`
}

function pastParticiple(base: string): string {
  const irregular = IRREGULAR[base]
  return irregular ? irregular[1] : pastTense(base)
}

/** "am" / "is" / "are" — the one English present tense that isn't just the stem. */
function presentBe(person: string | undefined, plural: boolean): string {
  if (plural) return 'are'
  if (person === '1') return 'am'
  if (person === '3') return 'is'
  return 'are'
}

function gerund(base: string): string {
  if (base === 'be') return 'being'
  if (base.endsWith('ie')) return `${base.slice(0, -2)}ying`
  if (base.endsWith('e') && !base.endsWith('ee')) return `${base.slice(0, -1)}ing`
  if (DOUBLES_FINAL.test(base)) return `${base + base.slice(-1)}ing`
  return `${base}ing`
}

/**
 * The gloss split into the verb being conjugated and whatever trails it.
 * "I go out" -> heads ['go'], tail 'out'. "I have/am" -> heads ['have', 'be'].
 * "I say, speak" -> heads ['say'], the second sense dropped.
 * The 1st person present that heads the gloss is the bare stem for every English
 * verb except "am", which is where the whole irregular paradigm of "be" hangs.
 */
function splitGloss(gloss: string): { heads: string[]; tail: string } | null {
  if (!gloss.startsWith('I ')) return null
  // Only the first sense is conjugated. A gloss often lists several ("I say,
  // speak" — and an imported one may list six), and conjugating every one turns
  // a one-line study aid into a paragraph. The full definition is on the line
  // above; this line exists to answer which person and number the ending is.
  const words = gloss.slice(2).split(',')[0].trim().split(' ')
  const heads = words[0].split('/').map((word) => (word === 'am' ? 'be' : word))
  if (heads.some((head) => !/^[a-z()-]+$/.test(head))) return null
  return { heads, tail: words.slice(1).join(' ') }
}

/** Applies one word-form to every alternative: ['come','go'] -> "came/went". */
function inflect(heads: string[], form: (base: string) => string): string {
  return heads.map(form).join('/')
}

/**
 * The English a verb form comes out as, or null when the gloss isn't one that
 * can be conjugated (a transliteration, an interjection, an impersonal verb
 * left in the 3rd person).
 *
 * Only a plain passive is rendered as an English passive. Middles read as
 * actives — the gloss is the lexical meaning already, and a middle rarely comes
 * out passive in English — and so do the deponents, which is why the voice is
 * read off the RMAC code rather than off the (deponent-collapsing) verb form:
 * ἐπορεύθη is passive in shape and "he went" in meaning.
 */
export function englishVerbForm(gloss: string, code: string, form: VerbForm): string | null {
  const parsed = parseVerbCode(code)
  const split = splitGloss(gloss)
  if (!parsed || !split) return null
  const { heads, tail } = split

  const plural = parsed.number === 'P'
  const key = parsed.person && parsed.number ? parsed.person + parsed.number : null
  const subject = key ? PRONOUNS[key] : ''
  const passive = parsed.voice === 'P'
  const isBe = heads[0] === 'be'
  const past = plural ? 'were' : 'was'
  /** Simple past, with "be" taking the was/were the subject calls for. */
  const pastOf = (base: string) => (base === 'be' ? past : pastTense(base))
  const has = plural || parsed.person !== '3' ? 'have' : 'has'

  const withTail = (phrase: string) => (tail ? `${phrase} ${tail}` : phrase)
  const clause = (predicate: string) => withTail(subject ? `${subject} ${predicate}` : predicate)

  // Non-indicative moods carry aspect rather than time in Greek, so English
  // renders them the same whichever tense they are built on — bar the perfect,
  // which really is anterior.
  const perfect = form.tense === 'Perfect' || form.tense === 'Pluperfect'

  if (form.mood === 'Infinitive') {
    const participle = inflect(heads, pastParticiple)
    if (passive) return withTail(perfect ? `to have been ${participle}` : `to be ${participle}`)
    return withTail(perfect ? `to have ${participle}` : `to ${heads.join('/')}`)
  }

  if (form.mood === 'Participle') {
    if (passive) {
      const participle = inflect(heads, pastParticiple)
      return withTail(form.tense === 'Present' ? `being ${participle}` : `having been ${participle}`)
    }
    if (form.tense === 'Present') return withTail(inflect(heads, gerund))
    if (form.tense === 'Future') return withTail(`about to ${heads.join('/')}`)
    return withTail(`having ${inflect(heads, pastParticiple)}`)
  }

  if (form.mood === 'Imperative') {
    const stem = passive ? `be ${inflect(heads, pastParticiple)}` : heads.join('/')
    if (parsed.person === '2') return `${withTail(stem)}!`
    const them = plural ? 'them' : 'him/her/it'
    return withTail(`let ${them} ${stem}`)
  }

  if (form.mood === 'Subjunctive' || form.mood === 'Optative') {
    const stem = passive ? `be ${inflect(heads, pastParticiple)}` : heads.join('/')
    const body = perfect ? `have ${inflect(heads, pastParticiple)}` : stem
    if (form.mood === 'Optative') return withTail(`may ${subject} ${body}`)
    return `(that) ${clause(`may ${body}`)}`
  }

  // Indicative.
  if (passive) {
    switch (form.tense) {
      case 'Present':
        return clause(`${presentBe(parsed.person, plural)} ${inflect(heads, pastParticiple)}`)
      case 'Imperfect':
        return clause(`${past} being ${inflect(heads, pastParticiple)}`)
      case 'Future':
        return clause(`will be ${inflect(heads, pastParticiple)}`)
      case 'Perfect':
        return clause(`${has} been ${inflect(heads, pastParticiple)}`)
      case 'Pluperfect':
        return clause(`had been ${inflect(heads, pastParticiple)}`)
      default:
        return clause(`${past} ${inflect(heads, pastParticiple)}`)
    }
  }

  switch (form.tense) {
    case 'Present':
      if (isBe) return clause(presentBe(parsed.person, plural))
      return clause(parsed.person === '3' && !plural ? inflect(heads, thirdPerson) : heads.join('/'))
    case 'Imperfect':
      // "he was" for εἰμί, "he was coming" for everything else: the imperfect is
      // the past continuous, but "was being" is not how anyone renders ἦν.
      return clause(isBe ? past : `${past} ${inflect(heads, gerund)}`)
    case 'Future':
      return clause(`will ${heads.join('/')}`)
    case 'Perfect':
      return clause(`${has} ${inflect(heads, pastParticiple)}`)
    case 'Pluperfect':
      return clause(`had ${inflect(heads, pastParticiple)}`)
    default:
      return clause(inflect(heads, pastOf))
  }
}
