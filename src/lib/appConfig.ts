import "server-only";

/**
 * Configuration applicative : valeurs par défaut issues des variables
 * d'environnement, surchargées par le document Firestore app/config
 * (modifiable depuis l'administration). Cache mémoire de 60 s.
 * Aucune clé secrète ne transite par Firestore : uniquement l'ordre des
 * fournisseurs, les modèles et le prompt système.
 */
import { getAdminDb } from "./firebaseAdmin";
import { DEFAULT_SYSTEM_PROMPT } from "./ai/soul";
import type { ProviderId } from "./ai/types";

export interface SoulAppConfig {
  providerOrder: ProviderId[];
  models: Record<ProviderId, string>;
  systemPrompt: string;
  timeoutMs: number;
  maxTokens: number;
  updatedAt?: number;
}

const DEFAULT_MODELS: Record<ProviderId, string> = {
  groq: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  openrouter: process.env.OPENROUTER_MODEL || "inclusionai/ling-3.2-flash:free",
  gemini: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  xai: process.env.XAI_MODEL || "grok-3-mini",
};

let cache: { value: SoulAppConfig; at: number } | null = null;
const TTL = 60_000;

export function envDefaults(): SoulAppConfig {
  return {
    providerOrder: ["groq", "openrouter", "gemini", "xai"],
    models: { ...DEFAULT_MODELS },
    systemPrompt: process.env.SOUL_SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT,
    timeoutMs: 25_000,
    maxTokens: 700,
  };
}

export async function getAppConfig(): Promise<SoulAppConfig> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  const defaults = envDefaults();
  try {
    const db = getAdminDb();
    if (db) {
      const snap = await db.collection("app").doc("config").get();
      if (snap.exists) {
        const data = snap.data() as Partial<SoulAppConfig> | undefined;
        const merged: SoulAppConfig = {
          providerOrder:
            Array.isArray(data?.providerOrder) && data.providerOrder.length
              ? (data.providerOrder as ProviderId[]).filter((p) =>
                  ["groq", "openrouter", "gemini", "xai"].includes(p)
                )
              : defaults.providerOrder,
          models: { ...defaults.models, ...(data?.models || {}) },
          systemPrompt: data?.systemPrompt || defaults.systemPrompt,
          timeoutMs: Number(data?.timeoutMs) > 0 ? Number(data?.timeoutMs) : defaults.timeoutMs,
          maxTokens: Number(data?.maxTokens) > 0 ? Number(data?.maxTokens) : defaults.maxTokens,
          updatedAt: Date.now(),
        };
        cache = { value: merged, at: Date.now() };
        return merged;
      }
    }
  } catch {
    // Firestore indisponible : on retombe sur les valeurs d'environnement
  }
  cache = { value: defaults, at: Date.now() };
  return defaults;
}

export function invalidateConfigCache() {
  cache = null;
}
