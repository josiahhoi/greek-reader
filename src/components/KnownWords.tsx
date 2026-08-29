import { useMemo, useState } from 'react'
import type { LemmaEntry } from '../lib/corpusTypes'
import type { Profile } from '../lib/profile'
import { isLemmaKnown } from '../lib/deriveKnown'
import { countNewlyKnownAbove, markKnownAbove, toggleKnown, KNOWN_TIERS } from '../lib/knownVocab'
import { glossOf, parseGlossFile } from '../lib/glosses'

/**
 * "Words I already know", under the flashcard deck. This was the Vocabulary
 * tab: a frequency threshold plus per-word tuning. It sits here now because
 * both it and the deck answer the same question — which words do you know —
 * and marking a word known writes the same mature card the "I already know
 * this" button on the card writes.
 */
export function KnownWords({
  profile,
  lemmas,
  onChange,
}: {
  profile: Profile
  lemmas: LemmaEntry[]
  onChange: (updater: (p: Profile) => Profile) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null)
  const glossCount = Object.keys(profile.glosses ?? {}).length

  async function importGlosses(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared so picking the same file twice still fires a change event.
    event.target.value = ''
    if (!file) return
    try {
      const { glosses, skipped } = parseGlossFile(await file.text())
      onChange((p) => ({ ...p, glosses }))
      const count = Object.keys(glosses).length
      setImportResult({
        ok: true,
        message: `${count.toLocaleString()} definitions imported${skipped ? `, ${skipped} skipped` : ''}.`,
      })
    } catch (err) {
      setImportResult({ ok: false, message: err instanceof Error ? err.message : 'Could not read that file.' })
    }
  }

  const knownCount = useMemo(
    () => lemmas.filter((l) => isLemmaKnown(profile, l)).length,
    [lemmas, profile],
  )

  const tierCounts = useMemo(() => {
    const out = new Map<number, number>()
    for (const tier of KNOWN_TIERS) out.set(tier, countNewlyKnownAbove(profile, lemmas, tier))
    return out
  }, [profile, lemmas])

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.trim().toLowerCase()
    return lemmas
      .filter(
        (l) =>
          l.lemma.toLowerCase().includes(q) || glossOf(profile, l).toLowerCase().includes(q),
      )
      .slice(0, 30)
  }, [search, lemmas, profile])

  return (
    <div className="mt-8 rounded-lg border border-stone-200 dark:border-stone-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-stone-700 dark:text-stone-300"
      >
        <span>Words I already know</span>
        <span className="text-xs font-normal text-stone-400">
          {knownCount.toLocaleString()} of {lemmas.length.toLocaleString()} · {open ? 'hide' : 'show'}
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-stone-200 px-4 py-4 dark:border-stone-800">
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Mark everything this common as known. Each word gets a card that&apos;s already
              mature, so it counts as known vocabulary straight away and still comes back once
              to be confirmed.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {KNOWN_TIERS.map((tier) => {
                const remaining = tierCounts.get(tier) ?? 0
                return (
                  <button
                    key={tier}
                    disabled={remaining === 0}
                    onClick={() => onChange((p) => markKnownAbove(p, lemmas, tier))}
                    className={
                      'rounded-full border px-3 py-1 text-sm transition-colors ' +
                      (remaining === 0
                        ? 'cursor-default border-stone-200 text-stone-300 dark:border-stone-800 dark:text-stone-600'
                        : 'border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800')
                    }
                  >
                    {tier}+ {remaining > 0 && <span className="text-xs">(+{remaining})</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              Search a word
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="λόγος, or 'word'..."
              className="greek mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-64 divide-y divide-stone-100 overflow-y-auto rounded-md border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                {searchResults.map((l) => (
                  <button
                    key={l.lemma}
                    onClick={() => onChange((p) => toggleKnown(p, l))}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800"
                  >
                    <span>
                      <span className="greek font-medium">{l.lemma}</span>
                      <span className="ml-2 text-stone-400">{glossOf(profile, l)}</span>
                      <span className="ml-2 text-xs text-stone-400">×{l.freq}</span>
                    </span>
                    <span
                      className={
                        'ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs ' +
                        (isLemmaKnown(profile, l)
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                          : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400')
                      }
                    >
                      {isLemmaKnown(profile, l) ? 'known' : 'unknown'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-stone-400">
              Marking a known word unknown puts it back in the deck, due today.
            </p>
          </div>

          <div className="border-t border-stone-200 pt-4 dark:border-stone-800">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">My definitions</p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {glossCount > 0
                ? `${glossCount.toLocaleString()} of your own definitions are in use, shown instead of the built-in gloss wherever a word appears.`
                : 'Import your own definitions — from your Anki deck or any word list — and they replace the built-in glosses everywhere. They stay on your profile and sync to your other devices.'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
                {glossCount > 0 ? 'Replace file' : 'Choose file'}
                <input type="file" accept=".json,application/json" onChange={importGlosses} className="hidden" />
              </label>
              {glossCount > 0 && (
                <button
                  onClick={() => {
                    onChange((p) => ({ ...p, glosses: {} }))
                    setImportResult(null)
                  }}
                  className="text-xs text-stone-400 underline hover:text-stone-700 dark:hover:text-stone-200"
                >
                  Use the built-in glosses again
                </button>
              )}
            </div>
            {importResult && (
              <p
                className={
                  'mt-2 text-xs ' +
                  (importResult.ok
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400')
                }
              >
                {importResult.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
