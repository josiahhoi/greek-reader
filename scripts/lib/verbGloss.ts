// Rewrites TBESG's dictionary glosses for verbs into the form a Greek student
// expects a verb to be listed in: the 1st person present active indicative.
//
// OpenGNT carries TBESG glosses, which name a verb by its English infinitive —
// ἔρχομαι is "to come/go". Greek lexica and grammars head a verb by its 1st
// person singular (the lemma is λύω, "I loose", not λύειν), so the flashcard
// deck should read "I come/go".
//
// Only two shapes are rewritten, an English infinitive with or without its "to",
// and everything else is left exactly as it came from the source. That keeps the
// mapping something you can read off the output and check, and means an odd
// gloss degrades to the original rather than to a wrong guess.

/**
 * Verbs the NT only ever uses impersonally. Their glosses already read as the
 * third person the verb actually appears in ("it is permitted"), and a first
 * person would be nonsense — δεῖ does not mean "I am necessary". Chosen by
 * checking the corpus: none of these occurs in the first or second person.
 */
const IMPERSONAL_LEMMAS: ReadonlySet<string> = new Set([
  'δεῖ',
  'ἔξεστι, ἐξόν',
  'χρή',
  'ἔνι',
  'μέλω',
  'πρέπω',
  'ἀνήκω',
  'καθήκω',
  'ἐνδέχομαι',
  'συμφέρω',
])

/** "be" -> "am" on one alternative of a slashed gloss: "bring/be repaid". */
function firstPerson(alternative: string): string {
  if (alternative === 'be') return 'am'
  if (alternative.startsWith('be ')) return `am ${alternative.slice(3)}`
  return alternative
}

/**
 * The verb gloss rewritten as a 1st person present active indicative, or null
 * if it isn't a shape worth rewriting — in which case the caller keeps the
 * original.
 *
 * "to come/go" -> "I come/go", "to be" -> "I am", "be able" -> "I am able",
 * "to bring/be repaid" -> "I bring/am repaid", "not to be able" -> "I am not
 * able". A handful of TBESG glosses join their words with underscores
 * ("to_boast"), which are unpicked first.
 */
export function firstPersonGloss(lemma: string, gloss: string): string | null {
  if (IMPERSONAL_LEMMAS.has(lemma)) return null

  const text = gloss.includes('_') ? gloss.replace(/_/g, ' ') : gloss

  // "not to be able" — rewrite the positive gloss, then negate it the way
  // English does: "I am able" -> "I am not able", "I care" -> "I do not care".
  if (text.startsWith('not ')) {
    const positive = firstPersonGloss(lemma, text.slice(4))
    if (positive === null) return null
    return positive.startsWith('I am ')
      ? `I am not ${positive.slice(5)}`
      : `I do not ${positive.slice(2)}`
  }

  // The infinitive, with the "to" TBESG usually but not always writes.
  let body: string
  if (text.startsWith('to ')) body = text.slice(3)
  else if (text === 'be' || text.startsWith('be ')) body = text
  else return null
  if (body.length === 0) return null

  return `I ${body.split('/').map(firstPerson).join('/')}`
}
