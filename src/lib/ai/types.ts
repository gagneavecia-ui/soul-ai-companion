import "server-only";

/** Contrat commun à tous les fournisseurs IA de SOUL. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderCallOptions {
  messages: ChatMessage[];
  model: string;
  apiKey: string;
  timeoutMs: number;
  maxTokens?: number;
  temperature?: number;
}

export interface ProviderResult {
  text: string;
  model: string;
  provider: string;
  usage?: { promptTokens?: number; completionTokens?: number };
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly status?: number,
    public readonly kind: "auth" | "rate-limit" | "timeout" | "network" | "server" | "invalid" = "server"
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export type ProviderId = "groq" | "openrouter" | "gemini" | "xai";
export const PROVIDER_IDS: ProviderId[] = ["groq", "openrouter", "gemini", "xai"];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  groq: "Groq (Llama 3.3)",
  openrouter: "OpenRouter",
  gemini: "Google Gemini",
  xai: "xAI Grok",
};
