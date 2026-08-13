import { VERB_FORM_IDS } from '../data/verbForms'
import type { VerbTokenRef } from './quizTypes'

/**
 * Groups eligible tokens (already filtered to known lemma + known form) by
 * their form index, so pickCard can sample the form uniformly rather than by
 * corpus frequency — see the rationale in the plan: without this, a single
 * common bundle like Present Active Indicative (4,571 of 28,113 verb tokens,
 * heavily ἐστίν) would dominate every draw, and a rare checked-off form like
 * Pluperfect Middle Indicative (2 NT tokens) would almost never appear.
 */
export function groupEligibleByForm(
  verbTokens: VerbTokenRef[],
  knownLemmas: ReadonlySet<number>,
  knownForms: ReadonlySet<string>,
): Map<number, VerbTokenRef[]> {
  const groups = new Map<number, VerbTokenRef[]>()
  for (const t of verbTokens) {
    if (!knownLemmas.has(t.lemmaId)) continue
    if (!knownForms.has(VERB_FORM_IDS[t.formIdx])) continue
    const list = groups.get(t.formIdx)
    if (list) list.push(t)
    else groups.set(t.formIdx, [t])
  }
  return groups
}

/**
 * Picks a random eligible card: a form index uniformly at random among the
 * eligible forms, then a random token within that form. Guarantees a
 * different card than `exclude` whenever more than one is eligible (retries
 * until it differs, bounded so a totalEligible === 1 pool can't loop
 * forever) — object identity is enough since the pool array is built once
 * and never recreated, so equal tokens are always the same reference.
 */
export function pickCard(
  eligibleByForm: Map<number, VerbTokenRef[]>,
  exclude?: VerbTokenRef | null,
): VerbTokenRef | null {
  const formIndices = [...eligibleByForm.keys()]
  if (formIndices.length === 0) return null

  function draw(): VerbTokenRef {
    const formIdx = formIndices[Math.floor(Math.random() * formIndices.length)]
    const tokens = eligibleByForm.get(formIdx)!
    return tokens[Math.floor(Math.random() * tokens.length)]
  }

  const totalEligible = [...eligibleByForm.values()].reduce((sum, l) => sum + l.length, 0)
  let card = draw()
  for (let attempt = 0; card === exclude && totalEligible > 1 && attempt < 50; attempt++) {
    card = draw()
  }
  return card
}
