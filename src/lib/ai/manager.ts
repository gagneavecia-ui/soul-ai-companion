import "server-only";

/**
 * Manager de fournisseurs IA : essaie chaque fournisseur de la chaîne
 * (ordre configurable), gère délais d'attente, erreurs et limites d'usage,
 * puis bascule vers le fournisseur suivant.
 */
import { getAppConfig } from "@/lib/appConfig";
import { groqProvider, openRouterProvider, xaiProvider } from "./openaiCompatible";
import { geminiProvider } from "./gemini";
import {
  ChatMessage,
  ProviderError,
  ProviderId,
  ProviderResult,
} from "./types";

const KEYS: Record<ProviderId, string | undefined> = {
  groq: process.env.GROQ_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  xai: process.env.XAI_API_KEY,
};

export function providerConfigured(id: ProviderId): boolean {
  return !!KEYS[id];
}

export function providerStatus() {
  return (["groq", "openrouter", "gemini", "xai"] as ProviderId[]).map((id) => ({
    id,
    configured: providerConfigured(id),
  }));
}

async function callOne(id: ProviderId, model: string, messages: ChatMessage[], timeoutMs: number, maxTokens: number): Promise<ProviderResult> {
  const apiKey = KEYS[id];
  if (!apiKey) throw new ProviderError(`${id}: clé API absente`, id, undefined, "auth");
  const opts = { messages, model, apiKey, timeoutMs, maxTokens };
  switch (id) {
    case "groq":
      return groqProvider.call(opts);
    case "openrouter":
      return openRouterProvider.call(opts);
    case "gemini":
      return geminiProvider.call(opts);
    case "xai":
      return xaiProvider.call(opts);
  }
}

export interface ManagedChatResult extends ProviderResult {
  attempts: { provider: ProviderId; model: string; error?: string; kind?: string }[];
}

export async function chatWithFallback(
  messages: ChatMessage[]
): Promise<ManagedChatResult> {
  const cfg = await getAppConfig();
  const attempts: ManagedChatResult["attempts"] = [];
  for (const id of cfg.providerOrder) {
    if (!providerConfigured(id)) {
      attempts.push({ provider: id, model: cfg.models[id], error: "clé API absente", kind: "auth" });
      continue;
    }
    try {
      const result = await callOne(id, cfg.models[id], messages, cfg.timeoutMs, cfg.maxTokens);
      attempts.push({ provider: id, model: result.model });
      return { ...result, attempts };
    } catch (e) {
      const pe = e instanceof ProviderError ? e : new ProviderError(String(e), id);
      attempts.push({
        provider: id,
        model: cfg.models[id],
        error: pe.message,
        kind: pe.kind,
      });
    }
  }
  const err = new ProviderError(
    "Tous les fournisseurs IA ont échoué. Vérifiez les clés API côté serveur.",
    "manager",
    503,
    "server"
  );
  (err as ProviderError & { attempts?: unknown }).attempts = attempts;
  throw err;
}
