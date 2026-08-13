import { useMemo, useState } from 'react'
import type { LemmaEntry } from '../lib/corpusTypes'
import type { Profile } from '../lib/profile'

const TIERS = [100, 50, 30, 20, 15, 10, 5, 1]

export function VocabSetup({
  profile,
  lemmas,
  onChange,
}: {
  profile: Profile
  lemmas: LemmaEntry[]
  onChange: (updater: (p: Profile) => Profile) => void
}) {
  const [search, setSearch] = useState('')

  const tierCounts = useMemo(() => {
    const out = new Map<number, number>()
    for (const tier of TIERS) out.set(tier, lemmas.filter((l) => l.freq >= tier).length)
    return out
  }, [lemmas])

  const extra = new Set(profile.extraKnownLemmas)
  const excluded = new Set(profile.excludedLemmas)

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.trim().toLowerCase()
    return lemmas
      .filter((l) => l.lemma.toLowerCase().includes(q) || l.gloss.toLowerCase().includes(q))
      .slice(0, 30)
  }, [search, lemmas])

  function isKnown(l: LemmaEntry): boolean {
    if (excluded.has(l.lemma)) return false
    return l.freq >= profile.vocabThreshold || extra.has(l.lemma)
  }

  function toggleLemma(l: LemmaEntry) {
    onChange((p) => {
      const nextExtra = new Set(p.extraKnownLemmas)
      const nextExcluded = new Set(p.excludedLemmas)
      const currentlyKnown = isKnown(l)
      if (currentlyKnown) {
        // Turning off: if it's above threshold, must exclude explicitly.
        nextExtra.delete(l.lemma)
        if (l.freq >= p.vocabThreshold) nextExcluded.add(l.lemma)
      } else {
        nextExcluded.delete(l.lemma)
        nextExtra.add(l.lemma)
      }
      return { ...p, extraKnownLemmas: [...nextExtra], excludedLemmas: [...nextExcluded] }
    })
  }

  const knownCount = lemmas.filter(isKnown).length

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Set a frequency threshold — every lemma occurring at least that often in the NT counts
        as known — then fine-tune individual words below.
      </p>

      <div>
        <div className="flex flex-wrap gap-2">
          {TIERS.map((tier) => (
            <button
              key={tier}
              onClick={() => onChange((p) => ({ ...p, vocabThreshold: tier }))}
              className={
                'rounded-full border px-3 py-1 text-sm transition-colors ' +
                (profile.vocabThreshold === tier
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800')
              }
            >
              {tier}+ ({tierCounts.get(tier)})
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-400">
          Currently known: <strong>{knownCount.toLocaleString()}</strong> of {lemmas.length.toLocaleString()} lemmas
          {(profile.extraKnownLemmas.length > 0 || profile.excludedLemmas.length > 0) && (
            <> ({profile.extraKnownLemmas.length} added, {profile.excludedLemmas.length} removed individually)</>
          )}
        </p>
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
                onClick={() => toggleLemma(l)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <span>
                  <span className="greek font-medium">{l.lemma}</span>
                  <span className="ml-2 text-stone-400">{l.gloss}</span>
                  <span className="ml-2 text-xs text-stone-400">×{l.freq}</span>
                </span>
                <span
                  className={
                    'ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs ' +
                    (isKnown(l)
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400')
                  }
                >
                  {isKnown(l) ? 'known' : 'unknown'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
