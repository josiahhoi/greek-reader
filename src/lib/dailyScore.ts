// A local-only (never Firestore-synced) running score for today's practice
// session. Deliberately not part of Profile: it's a daily-resetting counter,
// not cumulative progress, so it fits neither of Profile's two merge rules
// (union-forever, or last-write-wins-whole-bundle) — a synced version would
// need a third rule (sum same-day counts across devices), which this pass
// doesn't need. See the plan for the full rationale.

import { normalizeUsername } from './profile'
import { todayKey } from './dates'

export interface DailyScore {
  date: string // 'YYYY-MM-DD', local time
  correct: number
  total: number
}

function storageKey(username: string): string {
  return `greek-reader:daily-score:${normalizeUsername(username)}`
}

function emptyScore(): DailyScore {
  return { date: todayKey(), correct: 0, total: 0 }
}

export function loadDailyScore(username: string): DailyScore {
  const raw = localStorage.getItem(storageKey(username))
  if (!raw) return emptyScore()
  try {
    const parsed = JSON.parse(raw) as DailyScore
    // A stored score from a previous day doesn't carry forward — it resets.
    return parsed.date === todayKey() ? parsed : emptyScore()
  } catch {
    return emptyScore()
  }
}

function saveDailyScore(username: string, score: DailyScore): DailyScore {
  localStorage.setItem(storageKey(username), JSON.stringify(score))
  return score
}

export function recordAnswer(username: string, correct: boolean): DailyScore {
  const current = loadDailyScore(username)
  return saveDailyScore(username, {
    date: current.date,
    correct: current.correct + (correct ? 1 : 0),
    total: current.total + 1,
  })
}
