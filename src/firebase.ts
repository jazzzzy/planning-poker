import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Firebase configuration sourced from Vite environment variables.
 * If VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_API_KEY are configured,
 * the app connects to Cloud Firestore on GCP.
 * Otherwise, it transparently falls back to Local Realtime Mode
 * (BroadcastChannel + localStorage) so you can test multi-tab rooms right away.
 */
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string | undefined,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string | undefined,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string | undefined,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string | undefined,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey.trim() !== '' &&
  firebaseConfig.projectId.trim() !== ''
)

let app: FirebaseApp | null = null
let firestoreDb: Firestore | null = null

if (isFirebaseConfigured) {
  app = initializeApp({
    apiKey:            firebaseConfig.apiKey!,
    authDomain:        firebaseConfig.authDomain || `${firebaseConfig.projectId}.firebaseapp.com`,
    projectId:         firebaseConfig.projectId!,
    storageBucket:     firebaseConfig.storageBucket || `${firebaseConfig.projectId}.firebasestorage.app`,
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId:             firebaseConfig.appId || '',
  })
  firestoreDb = getFirestore(app)
}

export const db = firestoreDb
