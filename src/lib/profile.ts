// Local profile storage, keyed by username. This is the test-version stand-in
// for the planned Firebase sync: same shape, same "type your username to load
// your profile" UX, but persisted to localStorage only. Swapping in Firestore
// later is a matter of replacing loadProfile/saveProfile's bodies — the shape
// callers see doesn't need to change.

export interface Profile {
  username: string
  /** Corpus-frequency threshold: lemmas occurring at least this often count as known. */
  vocabThreshold: number
  /** Lemma strings marked known individually, on top of the frequency threshold. */
  extraKnownLemmas: string[]
  /** Lemma strings marked explicitly NOT known, overriding the frequency threshold. */
  excludedLemmas: string[]
  /** Concept ids (see src/data/concepts.ts) marked known. */
  knownConcepts: string[]
  /** How many blocking tokens a verse may have and still count as "readable". */
  tolerance: number
  /** "bookId.chapter.verse" keys the learner has marked read. */
  readVerses: string[]
  updatedAt: number
}

/**
 * Usernames are case/whitespace-insensitive everywhere (storage key, Firestore
 * doc id, and the `username` field itself) so "Josiah" and "josiah" are always
 * the same profile, and so a Firestore rule can check
 * `request.resource.data.username == <doc id>` without a casing mismatch.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function defaultProfile(username: string): Profile {
  return {
    username: normalizeUsername(username),
    vocabThreshold: 50,
    extraKnownLemmas: [],
    excludedLemmas: [],
    knownConcepts: [],
    tolerance: 1,
    readVerses: [],
    updatedAt: Date.now(),
  }
}

function storageKey(username: string): string {
  return `greek-reader:profile:${normalizeUsername(username)}`
}

export function loadProfile(username: string): Profile {
  const raw = localStorage.getItem(storageKey(username))
  if (!raw) return defaultProfile(username)
  try {
    const parsed = JSON.parse(raw) as Partial<Profile>
    return { ...defaultProfile(username), ...parsed, username: normalizeUsername(username) }
  } catch {
    return defaultProfile(username)
  }
}

/** Persists the profile, stamping `updatedAt`, and returns the exact object saved. */
export function saveProfile(profile: Profile): Profile {
  const toSave: Profile = { ...profile, updatedAt: Date.now() }
  localStorage.setItem(storageKey(profile.username), JSON.stringify(toSave))
  return toSave
}

export function listKnownProfiles(): string[] {
  const out: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('greek-reader:profile:')) {
      out.push(key.slice('greek-reader:profile:'.length))
    }
  }
  return out
}
