import { useState } from 'react'
import { listKnownProfiles } from '../lib/profile'

export function UsernameGate({ onSubmit }: { onSubmit: (username: string) => void }) {
  const [value, setValue] = useState('')
  const known = listKnownProfiles()

  function submit(name: string) {
    const trimmed = name.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h1 className="greek text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Ἀναγνώστης
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Koine Greek Reader</p>

        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            submit(value)
          }}
        >
          <label htmlFor="username" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Username
          </label>
          <input
            id="username"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. josiah"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            Continue
          </button>
        </form>

        {known.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Continue as
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {known.map((name) => (
                <button
                  key={name}
                  onClick={() => submit(name)}
                  className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-stone-400">
          No password — this is a trust-based profile, stored in this browser for now.
        </p>
      </div>
    </div>
  )
}
