import "server-only";

/**
 * Journalisation des erreurs et compteurs d'usage.
 * Buffer mémoire + persistance Firestore best-effort (collection admin_errors).
 */
import { getAdminDb } from "./firebaseAdmin";

export interface ErrorEntry {
  ts: number;
  provider: string;
  code: string;
  message: string;
  uid?: string;
}

const buffer: ErrorEntry[] = [];
const MAX_BUFFER = 200;

export function logError(entry: ErrorEntry) {
  buffer.unshift(entry);
  if (buffer.length > MAX_BUFFER) buffer.pop();
  const db = getAdminDb();
  if (db) {
    // Firestore refuse les valeurs undefined : on ne garde que les champs définis
    const clean = Object.fromEntries(
      Object.entries(entry).filter(([, v]) => v !== undefined)
    );
    db.collection("admin_errors")
      .add(clean)
      .catch(() => undefined);
  }
}

export function recentErrors(limit = 50): ErrorEntry[] {
  return buffer.slice(0, limit);
}

const counters = { messages: 0, conversations: 0, errors: 0 };
let countersLoaded = false;

export async function trackMessage(providerUsed: string) {
  counters.messages += 1;
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection("stats").doc("usage").set(
      {
        totalMessages: increment(1),
        [`byProvider.${providerUsed}`]: increment(1),
        lastMessageAt: Date.now(),
      },
      { merge: true }
    );
  } catch {
    // best effort
  }
}

export async function trackConversationCreated() {
  const db = getAdminDb();
  if (!db) return;
  try {
    await db.collection("stats").doc("usage").set(
      { totalConversations: increment(1) },
      { merge: true }
    );
  } catch {
    // best effort
  }
}

export async function trackErrorLogged() {
  counters.errors += 1;
}

export async function getUsageStats() {
  const db = getAdminDb();
  if (!db) return { totalMessages: counters.messages, totalConversations: counters.conversations, byProvider: {} };
  try {
    const snap = await db.collection("stats").doc("usage").get();
    if (!countersLoaded) countersLoaded = true;
    const d = snap.data() || {};
    return {
      totalMessages: d.totalMessages ?? counters.messages,
      totalConversations: d.totalConversations ?? counters.conversations,
      byProvider: d.byProvider ?? {},
      lastMessageAt: d.lastMessageAt ?? null,
    };
  } catch {
    return { totalMessages: counters.messages, totalConversations: counters.conversations, byProvider: {} };
  }
}

// FieldValue.increment sans importer firebase-admin/firestore ici
import { FieldValue } from "firebase-admin/firestore";
function increment(n: number) {
  return FieldValue.increment(n);
}
