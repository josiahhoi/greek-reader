import { useState } from 'react'
import { useCorpus } from './hooks/useCorpus'
import { useSyncedProfile } from './hooks/useSyncedProfile'
import { UsernameGate } from './components/UsernameGate'
import { Home } from './components/Home'
import { VerbFormSetup } from './components/VerbFormSetup'
import { VocabSetup } from './components/VocabSetup'
import { Reader } from './components/Reader'
import { ReadersText } from './components/ReadersText'
import { Practice } from './components/Practice'
import { Flashcards } from './components/Flashcards'
import { SyncIndicator } from './components/SyncIndicator'

const LAST_USER_KEY = 'greek-reader:last-user'

type Tab = 'home' | 'grammar' | 'vocab' | 'read' | 'readers' | 'practice' | 'flashcards'

function AppShell({ username, onSwitchUser }: { username: string; onSwitchUser: () => void }) {
  const { data: corpus, loading, progress, error } = useCorpus()
  const [profile, updateProfile, syncStatus] = useSyncedProfile(username)
  const [tab, setTab] = useState<Tab>('home')

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

  // Labels say what the tab gives you: "Read" and "Reader's NT" were a coin
  // toss from the outside, and "Practice" could have meant any of four tabs.
  const tabs: { id: Tab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'read', label: 'Passages for you' },
    { id: 'readers', label: 'Read the NT' },
    { id: 'vocab', label: 'Vocabulary' },
    { id: 'flashcards', label: 'Flashcards' },
    { id: 'grammar', label: 'Verb forms' },
    { id: 'practice', label: 'Verb parsing' },
  ]

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="greek text-lg font-semibold">Ἀναγνώστης</span>
          <div className="flex items-center gap-3">
            <SyncIndicator status={syncStatus} />
            <button
              onClick={onSwitchUser}
              className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            >
              {username} · switch
            </button>
          </div>
        </div>
        {/* Wraps rather than scrolls: seven descriptive labels don't fit one
            line on a phone, and a tab you have to scroll sideways to find is a
            tab you won't find. The padding does the separating, so no gap. */}
        <nav className="mx-auto flex max-w-3xl flex-wrap px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'shrink-0 whitespace-nowrap border-b-2 px-2.5 py-2 text-sm font-medium transition-colors ' +
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
        {tab === 'home' && <Home corpus={corpus} profile={profile} />}
        {tab === 'grammar' && (
          <VerbFormSetup profile={profile} formStats={corpus.formStats} onChange={updateProfile} />
        )}
        {tab === 'vocab' && (
          <VocabSetup profile={profile} lemmas={corpus.lemmas} onChange={updateProfile} />
        )}
        {tab === 'read' && <Reader corpus={corpus} profile={profile} onChange={updateProfile} />}
        {tab === 'readers' && (
          <ReadersText corpus={corpus} profile={profile} onChange={updateProfile} />
        )}
        {tab === 'practice' && (
          <Practice corpus={corpus} profile={profile} onChange={updateProfile} />
        )}
        {tab === 'flashcards' && (
          <Flashcards corpus={corpus} profile={profile} onChange={updateProfile} />
        )}
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
