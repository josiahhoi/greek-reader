import { useEffect, useState } from 'react'
import { loadProfile, saveProfile, type Profile } from '../lib/profile'

export function useProfile(username: string): [Profile, (updater: (p: Profile) => Profile) => void] {
  const [profile, setProfile] = useState<Profile>(() => loadProfile(username))

  // Re-load when switching usernames.
  useEffect(() => {
    setProfile(loadProfile(username))
  }, [username])

  function update(updater: (p: Profile) => Profile) {
    setProfile((prev) => {
      const next = updater(prev)
      saveProfile(next)
      return next
    })
  }

  return [profile, update]
}
