// Marking verses read, in one place.
//
// Reader.tsx (passages) and ReadersText.tsx (chapters) both do this and used to
// carry their own copy of verseKey plus their own set-union logic. Reading now
// also has to record *when* it happened for the Home heatmap, which is exactly
// the kind of detail that drifts if it lives in two components.

import { bump } from './activity'
import type { Profile } from './profile'

export function verseKey(bookId: number, chapter: number, verse: number): string {
  return `${bookId}.${chapter}.${verse}`
}

/**
 * Marks verses read: set-union into `readVerses`, a write-once dated entry in
 * `readLog`, and an activity bump for however many were genuinely new.
 *
 * "New" is judged by `readLog`, not `readVerses`, because a verse can be
 * unmarked and marked again — `readLog` is the write-once record, so the day's
 * count can never be inflated by toggling.
 */
export function markRead(p: Profile, keys: string[], today: string): Profile {
  const readSet = new Set(p.readVerses)
  const readLog = { ...p.readLog }
  let newlyRead = 0

  for (const key of keys) {
    readSet.add(key)
    if (!readLog[key]) {
      readLog[key] = today
      newlyRead++
    }
  }

  return {
    ...p,
    readVerses: [...readSet],
    readLog,
    activity: bump(p.activity, 'v', newlyRead, today),
  }
}

/**
 * Unmarks one verse. Deliberately leaves `readLog` and `activity` untouched:
 * they record what you did on a given day, and un-ticking a checkbox today
 * doesn't mean you didn't read it. Decrementing would also break the activity
 * merge, which takes a per-counter max and so needs counters to only ever grow.
 */
export function unmarkRead(p: Profile, key: string): Profile {
  return { ...p, readVerses: p.readVerses.filter((k) => k !== key) }
}
