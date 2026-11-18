"use client";

/**
 * Client API authentifié : attache le token ID Firebase frais à chaque
 * requête vers les routes serveur. Mode démonstration si Firebase absent.
 */
import { getFirebaseAuth, firebaseConfigured } from "./firebase";

let cachedToken: { value: string; at: number } | null = null;

export async function getFreshIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return null;
  // Token en cache < 5 minutes pour limiter les appels getToken
  if (cachedToken && Date.now() - cachedToken.at < 4 * 60_000) return cachedToken.value;
  try {
    const token = await user.getIdToken(false);
    cachedToken = { value: token, at: Date.now() };
    return token;
  } catch {
    try {
      const token = await user.getIdToken(true);
      cachedToken = { value: token, at: Date.now() };
      return token;
    } catch {
      return null;
    }
  }
}

export function invalidateTokenCache() {
  cachedToken = null;
}

export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (firebaseConfigured) {
    const token = await getFreshIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, {
    method: options.method || (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new ApiError(data?.error || `Erreur ${res.status}`, res.status, data);
  }
  return data;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}
