import { CONCEPTS, GROUP_LABELS, GROUP_ORDER } from '../data/concepts'
import type { Profile } from '../lib/profile'

export function GrammarSetup({
  profile,
  conceptStats,
  onChange,
}: {
  profile: Profile
  conceptStats: Record<string, number>
  onChange: (updater: (p: Profile) => Profile) => void
}) {
  const known = new Set(profile.knownConcepts)

  function toggle(id: string) {
    onChange((p) => {
      const set = new Set(p.knownConcepts)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...p, knownConcepts: [...set] }
    })
  }

  function setGroup(ids: string[], value: boolean) {
    onChange((p) => {
      const set = new Set(p.knownConcepts)
      for (const id of ids) {
        if (value) set.add(id)
        else set.delete(id)
      }
      return { ...p, knownConcepts: [...set] }
    })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Mark the grammar you've learned. A word only counts as readable when both its
        vocabulary <em>and</em> every grammatical feature of its form are known.
      </p>

      {GROUP_ORDER.map((group) => {
        const items = CONCEPTS.filter((c) => c.group === group)
        if (items.length === 0) return null
        const ids = items.map((c) => c.id)
        const allKnown = ids.every((id) => known.has(id))

        return (
          <div key={group}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                {GROUP_LABELS[group]}
              </h3>
              <button
                className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                onClick={() => setGroup(ids, !allKnown)}
              >
                {allKnown ? 'Clear' : 'Select all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((c) => {
                const isKnown = known.has(c.id)
                const count = conceptStats[c.id] ?? 0
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    title={`${count.toLocaleString()} tokens in the NT`}
                    className={
                      'rounded-full border px-3 py-1 text-sm transition-colors ' +
                      (isKnown
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800')
                    }
                  >
                    {c.short ?? c.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
