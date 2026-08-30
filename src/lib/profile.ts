// Local profile storage, keyed by username. This is the test-version stand-in
// for the planned Firebase sync: same shape, same "type your username to load
// your profile" UX, but persisted to localStorage only. Swapping in Firestore
// later is a matter of replacing loadProfile/saveProfile's bodies — the shape
// callers see doesn't need to change.

import { backfillFromIntroduced, type ActivityLog } from './activity'
import type { SrsDeck } from './srs'

export interface Profile {
  username: string
  /** Corpus-frequency threshold: lemmas occurring at least this often count as known. */
  /**
   * Legacy: "every lemma this frequent counts as known", the setting the old
   * Vocabulary tab wrote. Superseded by marking words known in the deck, which
   * is one source of truth and lets a missed review un-know a word. Still
   * honoured while present so nobody's known vocabulary drops out from under
   * them; migrateKnownVocab converts it into cards and clears it.
   */
  vocabThreshold?: number
  /** Lemma strings marked known individually, on top of the frequency threshold. */
  extraKnownLemmas: string[]
  /** Lemma strings marked explicitly NOT known, overriding the frequency threshold. */
  excludedLemmas: string[]
  /** Verb form ids (see src/data/verbForms.ts) marked known. */
  knownVerbForms: string[]
  /** How many blocking tokens a verse may have and still count as "readable". */
  tolerance: number
  /** "bookId.chapter.verse" keys the learner has marked read. */
  readVerses: string[]
  /** Reader's NT: annotate lemmas occurring fewer than this many times in the NT. */
  readerThreshold: number
  /** Reader's NT: annotate by known-vocabulary instead of raw frequency. */
  readerPersonalized: boolean
  /**
   * Reader's NT: also annotate verbs whose tense/voice/mood you haven't marked
   * known. Independent of the vocabulary axis above — the two are separate
   * kinds of "I can't read this", exactly as the scorer already treats them.
   */
  readerAnnotateForms: boolean
  /** Reader's NT: book/chapter last viewed, so it resumes where you left off. */
  readerBookId: number
  readerChapter: number
  /**
   * Vocabulary flashcards: per-lemma spaced-repetition state, keyed by lemma
   * string. Merged by its own third rule (see mergeSrsDecks in sync.ts) and
   * serialized as a JSON string at the Firestore boundary — see pushProfile.
   */
  srs: SrsDeck
  /** Vocabulary flashcards: cap on new cards introduced per day. */
  srsNewPerDay: number
  /**
   * Vocabulary flashcards: the deck covers lemmas occurring at least this many
   * times, most frequent first. Deliberately separate from `vocabThreshold` —
   * that one says what you can read without a gloss, which is a weaker claim
   * than being able to recall the word, and using it here hid the commonest
   * vocabulary from the deck entirely. 1 means every lemma in the corpus.
   */
  srsMinFreq: number
  /**
   * Home heatmap: per-day activity counters, 'YYYY-MM-DD' -> DayActivity.
   * Merged per day per counter by max (see mergeActivityLogs) and serialized
   * as a JSON string at the Firestore boundary, like `srs`.
   */
  activity: ActivityLog
  /**
   * When each verse was first read, "bookId.chapter.verse" -> 'YYYY-MM-DD'.
   * Write-once per verse, so it merges by earliest-wins and is fully
   * idempotent — the same trick buildQueue uses with SrsCard.introduced,
   * rather than a counter that would need an additive merge.
   */
  readLog: Record<string, string>
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
    extraKnownLemmas: [],
    excludedLemmas: [],
    knownVerbForms: [],
    tolerance: 1,
    readVerses: [],
    readerThreshold: 30,
    readerPersonalized: false,
    readerAnnotateForms: true,
    readerBookId: 40,
    readerChapter: 1,
    srs: {},
    srsNewPerDay: 10,
    srsMinFreq: 1,
    activity: {},
    readLog: {},
    // Deliberately 0 (epoch), not Date.now(): this timestamp feeds the
    // sync merge's last-write-wins comparison (see mergeProfiles in
    // src/lib/sync.ts). A never-touched default must always lose to a real
    // saved profile — local or remote — or a brand-new device would look
    // "more recent" than another device's actual settings and clobber them
    // on first sync, just because it happened to load a moment later.
    updatedAt: 0,
  }
}

function storageKey(username: string): string {
  return `greek-reader:profile:${normalizeUsername(username)}`
}

/**
 * Strips fields from superseded profile versions.
 *
 * `knownConcepts` held the old atomic-grammar ids (`pos.noun`, `tense.aorist`,
 * …). There is no honest migration to the verb-form model that replaced it:
 * knowing "aorist" and "subjunctive" as independent checkboxes never implied
 * knowing the aorist subjunctive, so mapping them forward would overstate what
 * the learner actually knows. Grammar selections reset; vocabulary is kept.
 *
 * Dropping the key here (rather than just ignoring it) matters because the
 * Firestore sync union-merges array fields — left in place, dead ids would be
 * carried in the remote document forever.
 */
const LEGACY_KEYS = ['knownConcepts'] as const

function stripLegacyFields(parsed: Record<string, unknown>): {
  cleaned: Record<string, unknown>
  didStrip: boolean
} {
  const cleaned = { ...parsed }
  let didStrip = false
  for (const key of LEGACY_KEYS) {
    if (key in cleaned) {
      delete cleaned[key]
      didStrip = true
    }
  }
  return { cleaned, didStrip }
}

export function loadProfile(username: string): Profile {
  const raw = localStorage.getItem(storageKey(username))
  if (!raw) return defaultProfile(username)
  try {
    const { cleaned, didStrip } = stripLegacyFields(JSON.parse(raw) as Record<string, unknown>)
    const loaded: Profile = {
      ...defaultProfile(username),
      ...(cleaned as Partial<Profile>),
      username: normalizeUsername(username),
    }

    // Seed the heatmap from the one slice of history that predates it. Only on
    // a log that has never recorded anything, so it can't run twice and can't
    // overwrite real activity.
    const needsBackfill =
      Object.keys(loaded.activity ?? {}).length === 0 &&
      Object.keys(loaded.srs ?? {}).length > 0
    const profile: Profile = needsBackfill
      ? {
          ...loaded,
          activity: backfillFromIntroduced(
            loaded.activity,
            Object.values(loaded.srs).map((c) => c.introduced),
          ),
        }
      : loaded
    // Persist the migration immediately rather than waiting for the next edit
    // or a successful sync — otherwise a profile that's only ever read keeps
    // the dead key forever, and an offline/failed first sync leaves it there
    // indefinitely.
    if (didStrip || needsBackfill) saveProfile(profile)
    return profile
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
