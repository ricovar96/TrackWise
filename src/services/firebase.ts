import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

// Firebase web config is an identifier, not a secret (access is enforced by firestore.rules),
// but it is still kept out of source control so each environment can point at its own project.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const app = initializeApp(firebaseConfig);
export const db = env.VITE_FIREBASE_DATABASE_ID ? getFirestore(app, env.VITE_FIREBASE_DATABASE_ID) : getFirestore(app);

/** Resolves true if the `summary_metrics/All` document can be read. */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'summary_metrics', 'All'));
    return true;
  } catch (error) {
    console.warn('Firestore connection check failed:', error);
    return false;
  }
}
