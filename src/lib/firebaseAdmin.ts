import "server-only";

/**
 * Firebase Admin — initialisation côté serveur uniquement.
 * Le JSON du compte de service arrive en variable d'environnement (base64),
 * jamais dans le dépôt ni dans le navigateur.
 */
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let cachedApp: App | null = null;
let initError: string | null = null;

export function getFirebaseAdmin(): App | null {
  if (cachedApp) return cachedApp;
  try {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
    if (!b64) {
      initError = "FIREBASE_SERVICE_ACCOUNT_B64 manquant";
      return null;
    }
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
    const existing = getApps().find((a) => a.name === "soul-admin");
    cachedApp =
      existing ??
      initializeApp(
        {
          credential: cert(json),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || json.project_id,
        },
        "soul-admin"
      );
    initError = null;
    return cachedApp;
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdmin();
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  const app = getFirebaseAdmin();
  return app ? getFirestore(app) : null;
}

export function adminInitError(): string | null {
  return initError;
}
