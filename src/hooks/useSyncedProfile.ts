import { useCallback, useEffect, useRef, useState } from 'react'
import { loadProfile, saveProfile, type Profile } from '../lib/profile'
import { fetchRemoteProfile, mergeProfiles, pushProfile } from '../lib/sync'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error'

const PUSH_DEBOUNCE_MS = 1500

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function useSyncedProfile(
  username: string,
): [Profile, (updater: (p: Profile) => Profile) => void, SyncStatus] {
  const [profile, setProfile] = useState<Profile>(() => loadProfile(username))
  const [status, setStatus] = useState<SyncStatus>('local')
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Authoritative "current profile" for synchronous reads inside update() —
  // updated imperatively (not just via the render-body), so two update()
  // calls in the same tick each see the other's result instead of racing.
  const latest = useRef(profile)

  function applyProfile(p: Profile) {
    latest.current = p
    setProfile(p)
  }

  // Username changed: show the local copy immediately (no loading flash), then
  // reconcile with Firestore in the background and push the merged result both ways.
  useEffect(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current)

    const local = loadProfile(username)
    applyProfile(local)
    setStatus('local')

    let cancelled = false
    setStatus('syncing')
    fetchRemoteProfile(username)
      .then((remote) => {
        if (cancelled) return null
        const merged = remote ? mergeProfiles(local, remote) : local
        const saved = saveProfile(merged)
        applyProfile(saved)
        return pushProfile(saved)
      })
      .then(() => {
        if (!cancelled) setStatus('synced')
      })
      .catch(() => {
        if (!cancelled) setStatus(isOffline() ? 'offline' : 'error')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  const update = useCallback((updater: (p: Profile) => Profile) => {
    const saved = saveProfile(updater(latest.current))
    applyProfile(saved)

    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      setStatus('syncing')
      pushProfile(latest.current)
        .then(() => setStatus('synced'))
        .catch(() => setStatus(isOffline() ? 'offline' : 'error'))
    }, PUSH_DEBOUNCE_MS)
  }, [])

  return [profile, update, status]
}
