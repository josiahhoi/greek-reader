import { useState } from 'react'
import { useCorpus } from './hooks/useCorpus'
import { useProfile } from './hooks/useProfile'
import { UsernameGate } from './components/UsernameGate'
import { GrammarSetup } from './components/GrammarSetup'
import { VocabSetup } from './components/VocabSetup'
import { Reader } from './components/Reader'
import { Progress } from './components/Progress'

const LAST_USER_KEY = 'greek-reader:last-user'

type Tab = 'grammar' | 'vocab' | 'read' | 'progress'

function AppShell({ username, onSwitchUser }: { username: string; onSwitchUser: () => void }) {
  const { data: corpus, loading, progress, error } = useCorpus()
  const [profile, updateProfile] = useProfile(username)
  const [tab, setTab] = useState<Tab>('grammar')

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        Failed to load corpus data: {error}
      </div>
    )
  }

  if (loading || !corpus) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-stone-500">
        <p className="greek text-2xl">Ἀναγνώστης</p>
        <p className="text-sm">Loading the Greek New Testament… {Math.round(progress * 100)}%</p>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
          <div className="h-full bg-stone-900 dark:bg-stone-100" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'grammar', label: 'Grammar' },
    { id: 'vocab', label: 'Vocabulary' },
    { id: 'read', label: 'Read' },
    { id: 'progress', label: 'Progress' },
  ]

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="greek text-lg font-semibold">Ἀναγνώστης</span>
          <button
            onClick={onSwitchUser}
            className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          >
            {username} · switch
          </button>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
                (tab === t.id
                  ? 'border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100'
                  : 'border-transparent text-stone-400 hover:text-stone-700 dark:hover:text-stone-300')
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {tab === 'grammar' && (
          <GrammarSetup profile={profile} conceptStats={corpus.conceptStats} onChange={updateProfile} />
        )}
        {tab === 'vocab' && (
          <VocabSetup profile={profile} lemmas={corpus.lemmas} onChange={updateProfile} />
        )}
        {tab === 'read' && <Reader corpus={corpus} profile={profile} onChange={updateProfile} />}
        {tab === 'progress' && <Progress corpus={corpus} profile={profile} />}
      </main>
    </div>
  )
}

export default function App() {
  const [username, setUsername] = useState<string | null>(() =>
    localStorage.getItem(LAST_USER_KEY),
  )

  if (!username) {
    return (
      <UsernameGate
        onSubmit={(name) => {
          localStorage.setItem(LAST_USER_KEY, name)
          setUsername(name)
        }}
      />
    )
  }

  return (
    <AppShell
      username={username}
      onSwitchUser={() => {
        localStorage.removeItem(LAST_USER_KEY)
        setUsername(null)
      }}
    />
  )
}
