import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, ensureSignedIn } from './firebase'
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
function encodeDeck(deck: SrsDeck): string {
  return JSON.stringify(deck ?? {})
}

function decodeDeck(raw: unknown): SrsDeck {
  if (raw && typeof raw === 'object') return raw as SrsDeck // pre-encoding documents
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as SrsDeck) : {}
  } catch {
    return {}
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
  const data = snap.data() as Partial<Profile> & { srs?: unknown }
  return {
    ...defaultProfile(username),
    ...(data as Partial<Profile>),
    srs: decodeDeck(data.srs),
    username: normalizeUsername(username),
  }
}

export async function pushProfile(profile: Profile): Promise<void> {
  await ensureSignedIn()
  await setDoc(profileDoc(profile.username), { ...profile, srs: encodeDeck(profile.srs) })
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
 * Merges a local and remote profile for the same username. Three rules:
 *
 * 1. `readVerses`, `knownVerbForms`, and `extraKnownLemmas` are cumulative
 *    progress — union them so nothing marked known/read on either side is ever
 *    lost, without needing per-field timestamps.
 * 2. `srs` is per-card mutable state — merged card by card, newest review wins
 *    (see mergeSrsDecks).
 * 3. Everything else (`vocabThreshold`, `excludedLemmas`, `tolerance`, the
 *    Reader's NT settings, and `srsNewPerDay`) is current *settings*, not
 *    accumulated history, so whichever side has the newer `updatedAt` wins for
 *    that whole bundle.
 */
export function mergeProfiles(local: Profile, remote: Profile): Profile {
  const settingsSource = local.updatedAt >= remote.updatedAt ? local : remote
  return {
    username: local.username,
    vocabThreshold: settingsSource.vocabThreshold,
    excludedLemmas: settingsSource.excludedLemmas,
    tolerance: settingsSource.tolerance,
    readerThreshold: settingsSource.readerThreshold,
    readerPersonalized: settingsSource.readerPersonalized,
    readerAnnotateForms: settingsSource.readerAnnotateForms,
    readerBookId: settingsSource.readerBookId,
    readerChapter: settingsSource.readerChapter,
    srsNewPerDay: settingsSource.srsNewPerDay,
    srs: mergeSrsDecks(local.srs, remote.srs),
    extraKnownLemmas: union(local.extraKnownLemmas, remote.extraKnownLemmas),
    knownVerbForms: union(local.knownVerbForms ?? [], remote.knownVerbForms ?? []),
    readVerses: union(local.readVerses, remote.readVerses),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  }
}
