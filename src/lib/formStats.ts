// Cumulative, all-time per-verb-form accuracy — how many times you've graded
// each form right vs. wrong across every practice session, never resetting.
//
// Local-only (never Firestore-synced), for the same reason as dailyScore.ts:
// this is a pair of counters that would need to be *summed* across devices
// for the same form, which fits neither of Profile's two merge rules
// (union-forever, or last-write-wins-whole-bundle). A synced version is a
// clean follow-up once this shape (and dailyScore's) is proven — the two
// would likely want the same additive-merge rule at once.

import { normalizeUsername } from './profile'

export interface FormAccuracy {
  correct: number
  total: number
}

export type FormStats = Record<string, FormAccuracy>

function storageKey(username: string): string {
  return `greek-reader:form-stats:${normalizeUsername(username)}`
}

export function loadFormStats(username: string): FormStats {
  const raw = localStorage.getItem(storageKey(username))
  if (!raw) return {}
  try {
    return JSON.parse(raw) as FormStats
  } catch {
    return {}
  }
}

function saveFormStats(username: string, stats: FormStats): FormStats {
  localStorage.setItem(storageKey(username), JSON.stringify(stats))
  return stats
}

export function recordFormAnswer(username: string, formId: string, correct: boolean): FormStats {
  const stats = loadFormStats(username)
  const entry = stats[formId] ?? { correct: 0, total: 0 }
  stats[formId] = { correct: entry.correct + (correct ? 1 : 0), total: entry.total + 1 }
  return saveFormStats(username, stats)
}
