import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, ensureSignedIn } from './firebase'
import { defaultProfile, normalizeUsername, type Profile } from './profile'

function profileDoc(username: string) {
  return doc(db, 'profiles', normalizeUsername(username))
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
  return {
    ...defaultProfile(username),
    ...(snap.data() as Partial<Profile>),
    username: normalizeUsername(username),
  }
}

export async function pushProfile(profile: Profile): Promise<void> {
  await ensureSignedIn()
  await setDoc(profileDoc(profile.username), profile)
}

function union(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])]
}

/**
 * Merges a local and remote profile for the same username.
 *
 * `readVerses`, `knownVerbForms`, and `extraKnownLemmas` are cumulative
 * progress — union them so nothing marked known/read on either side is ever
 * lost, without needing per-field timestamps.
 *
 * Everything else (`vocabThreshold`, `excludedLemmas`, `tolerance`, and the
 * Reader's NT settings `readerThreshold`/`readerPersonalized`/`readerBookId`/
 * `readerChapter`) is current *settings*, not accumulated history, so
 * whichever side has the newer `updatedAt` wins for that whole bundle.
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
    extraKnownLemmas: union(local.extraKnownLemmas, remote.extraKnownLemmas),
    knownVerbForms: union(local.knownVerbForms ?? [], remote.knownVerbForms ?? []),
    readVerses: union(local.readVerses, remote.readVerses),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  }
}
