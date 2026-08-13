import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig'

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

let signInPromise: Promise<User> | null = null

/** Signs in anonymously exactly once, reusing any sign-in already in flight or done. */
export function ensureSignedIn(): Promise<User> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser)
  if (signInPromise) return signInPromise

  signInPromise = new Promise<User>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe()
          resolve(user)
        }
      },
      (err) => {
        unsubscribe()
        reject(err)
      },
    )
    signInAnonymously(auth).catch((err) => {
      unsubscribe()
      reject(err)
    })
  })
  return signInPromise
}
