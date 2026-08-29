import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, ensureSignedIn } from './firebase'
import { EMPTY_DAY, type ActivityLog, type DayActivity } from './activity'
import { defaultProfile, normalizeUsername, type Profile } from './profile'
import { isSafeCardKey, type SrsDeck } from './srs'

function profileDoc(username: string) {
  return doc(db, 'profiles', normalizeUsername(username))
}

/**
 * The SRS deck crosses the Firestore boundary as a JSON string, not as a map.
 *
 * Firestore automatically indexes every subfield of a stored map, ascending and
 * descending, and caps a document at 40,000 index entries. A card has 7 fields,
 * so a map-shaped deck burns 14 entries per card and a deck would be *rejected
 * outright* — not degraded — somewhere around 1,700 cards. (readVerses already
 * spends ~15,900 of that budget at its maximum.) A single string field costs 2
 * entries no matter how large the deck grows, which keeps the whole feature
 * inside the existing profile document with no console-side index exemptions.
 *
 * The tradeoff is that the deck can't be queried server-side — which costs
 * nothing here, because every read loads the whole profile anyway.
 */
function encodeMap(map: object | undefined): string {
  return JSON.stringify(map ?? {})
}

function decodeMap<T extends object>(raw: unknown): T {
  if (raw && typeof raw === 'object') return raw as T // pre-encoding documents
  if (typeof raw !== 'string') return {} as T
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as T) : ({} as T)
  } catch {
    return {} as T
  }
}

export async function fetchRemoteProfile(username: string): Promise<Profile | null> {
  await ensureSignedIn()
  const snap = await getDoc(profileDoc(username))
  if (!snap.exists()) return null
  // Spread over the defaults the same way loadProfile does. A document written
  // by an older build simply won't have fields added since, and casting the
  // raw data straight to Profile would hand back `undefined` for them — which
  // then wins the last-write-wins merge whenever the remote is newer, silently
  // resetting a setting to neither its default nor the user's choice.
  const data = snap.data() as Partial<Profile> & {
    srs?: unknown
    activity?: unknown
    readLog?: unknown
    glosses?: unknown
  }
  return {
    ...defaultProfile(username),
    ...(data as Partial<Profile>),
    srs: decodeMap<SrsDeck>(data.srs),
    activity: decodeMap<ActivityLog>(data.activity),
    readLog: decodeMap<Record<string, string>>(data.readLog),
    glosses: decodeMap<Record<string, string>>(data.glosses),
    username: normalizeUsername(username),
  }
}

export async function pushProfile(profile: Profile): Promise<void> {
  await ensureSignedIn()
  await setDoc(profileDoc(profile.username), {
    ...profile,
    srs: encodeMap(profile.srs),
    activity: encodeMap(profile.activity),
    readLog: encodeMap(profile.readLog),
    glosses: encodeMap(profile.glosses),
  })
}

function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])]
}

/**
 * Third merge rule: per-card review state.
 *
 * Neither existing rule fits. Union-forever is half right — the *keys* are
 * cumulative, since a card studied on either device must survive — but the
 * *values* are mutable state, and two devices can hold different versions of
 * the same card. Last-write-wins on the settings bundle is the other half
 * wrong: it would discard every review done on the losing device.
 *
 * So: union the keys, and where a key is on both sides keep the record with the
 * later `reviewed`. That field is epoch ms, deliberately not the local
 * 'YYYY-MM-DD' `due`, so the comparison is a total order even across
 * timezones. Because each card resolves independently, two offline sessions
 * both survive in full as long as they touched different cards; where they
 * touched the same card, the later answer is the better evidence of current
 * recall — which is exactly what SM-2 wants.
 */
export function mergeSrsDecks(local: SrsDeck | undefined, remote: SrsDeck | undefined): SrsDeck {
  const out: SrsDeck = {}
  for (const [lemma, card] of Object.entries(local ?? {})) {
    if (isSafeCardKey(lemma)) out[lemma] = card
  }
  for (const [lemma, card] of Object.entries(remote ?? {})) {
    if (!isSafeCardKey(lemma)) continue
    const mine = out[lemma]
    if (!mine || card.reviewed > mine.reviewed) out[lemma] = card
  }
  return out
}

/**
 * Fourth merge rule: per-day activity counters.
 *
 * None of the first three fit. Union is for sets, not numbers. Whole-bundle
 * LWW would throw away a whole day's work done on the losing device. Summing
 * is the intuitive answer and is *wrong*: merges re-run on every sync, so
 * a + b would be added again on the next reconcile and the heatmap would
 * inflate without bound.
 *
 * So: per day, per counter, take the max. That's a max-register join —
 * idempotent, commutative and associative like every other rule here, so
 * re-merging is free. The cost is that two devices studying the same day
 * report the larger rather than the sum. That under-reports, which is the
 * right direction to be wrong for a habit tracker: it can never invent work
 * you didn't do. It also self-corrects, because once the devices sync each
 * one's counter is raised to the merged value and subsequent grades build on
 * that.
 */
export function mergeActivityLogs(
  local: ActivityLog | undefined,
  remote: ActivityLog | undefined,
): ActivityLog {
  const out: ActivityLog = { ...(local ?? {}) }
  for (const [day, counts] of Object.entries(remote ?? {})) {
    const mine = out[day]
    if (!mine) {
      out[day] = counts
      continue
    }
    const merged = { ...EMPTY_DAY }
    for (const key of Object.keys(EMPTY_DAY) as (keyof DayActivity)[]) {
      merged[key] = Math.max(mine[key] ?? 0, counts[key] ?? 0)
    }
    out[day] = merged
  }
  return out
}

/**
 * Fifth rule, and the simplest: when each verse was first read.
 *
 * Write-once per key, so "earliest wins" is all it takes — and because the
 * value never changes after the first write, this is idempotent for free.
 * This is why verses use a dated log rather than a counter: the count for any
 * day falls out of it, with no additive merge needed anywhere.
 */
export function mergeReadLogs(
  local: Record<string, string> | undefined,
  remote: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = { ...(local ?? {}) }
  for (const [verse, day] of Object.entries(remote ?? {})) {
    const mine = out[verse]
    if (!mine || day < mine) out[verse] = day
  }
  return out
}

/**
 * Merges a local and remote profile for the same username. Five rules:
 *
 * 1. `readVerses`, `knownVerbForms`, and `extraKnownLemmas` are cumulative
 *    progress — union them so nothing marked known/read on either side is ever
 *    lost, without needing per-field timestamps.
 * 2. `srs` is per-card mutable state — merged card by card, newest review wins
 *    (see mergeSrsDecks).
 * 3. `activity` is per-day counters — merged per day per counter by max
 *    (see mergeActivityLogs).
 * 4. `readLog` is write-once per verse — earliest date wins (see mergeReadLogs).
 * 5. Everything else (`excludedLemmas`, `tolerance`, `glosses`, the legacy
 *    `vocabThreshold`,
 *    Reader's NT settings, and `srsNewPerDay`) is current *settings*, not
 *    accumulated history, so whichever side has the newer `updatedAt` wins for
 *    that whole bundle.
 *
 * Every rule is idempotent, commutative and associative, so a merge can be
 * re-run any number of times without drift.
 */
export function mergeProfiles(local: Profile, remote: Profile): Profile {
  const settingsSource = local.updatedAt >= remote.updatedAt ? local : remote
  return {
    username: local.username,
    // Spread rather than assigned: a migrated profile has no vocabThreshold at
    // all, and writing the key as undefined would make Firestore reject the
    // whole document. Present on either side, it survives until whichever
    // device still has it runs migrateKnownVocab.
    ...(settingsSource.vocabThreshold !== undefined && {
      vocabThreshold: settingsSource.vocabThreshold,
    }),
    excludedLemmas: settingsSource.excludedLemmas,
    // Imported wholesale rather than accumulated, so the newer import wins
    // entire. Merging key by key would need per-entry timestamps the file
    // doesn't carry, and would leave a half-and-half dictionary behind.
    glosses: settingsSource.glosses,
    tolerance: settingsSource.tolerance,
    readerThreshold: settingsSource.readerThreshold,
    readerPersonalized: settingsSource.readerPersonalized,
    readerAnnotateForms: settingsSource.readerAnnotateForms,
    readerBookId: settingsSource.readerBookId,
    readerChapter: settingsSource.readerChapter,
    srsNewPerDay: settingsSource.srsNewPerDay,
    srsMinFreq: settingsSource.srsMinFreq,
    srs: mergeSrsDecks(local.srs, remote.srs),
    activity: mergeActivityLogs(local.activity, remote.activity),
    readLog: mergeReadLogs(local.readLog, remote.readLog),
    extraKnownLemmas: union(local.extraKnownLemmas, remote.extraKnownLemmas),
    knownVerbForms: union(local.knownVerbForms ?? [], remote.knownVerbForms ?? []),
    readVerses: union(local.readVerses, remote.readVerses),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  }
}
