import "server-only";
import {
  ProviderCallOptions,
  ProviderError,
  ProviderResult,
} from "./types";

/**
 * Fournisseurs compatibles OpenAI : Groq et OpenRouter (+ xAI Grok).
 * Endpoints vérifiés contre les documentations officielles :
 *  - Groq        : https://api.groq.com/openai/v1/chat/completions
 *  - OpenRouter  : https://openrouter.ai/api/v1/chat/completions
 *  - xAI         : https://api.x.ai/v1/chat/completions
 */

function classify(status: number, provider: string, body: string): ProviderError {
  if (status === 401 || status === 403)
    return new ProviderError(`Clé ${provider} refusée (${status})`, provider, status, "auth");
  if (status === 429)
    return new ProviderError(`Limite d'utilisation atteinte sur ${provider}`, provider, status, "rate-limit");
  if (status >= 500)
    return new ProviderError(`${provider} indisponible (${status})`, provider, status, "server");
  return new ProviderError(
    `${provider} a renvoyé ${status}: ${body.slice(0, 180)}`,
    provider,
    status,
    "invalid"
  );
}

export async function callOpenAiCompatible(
  provider: "groq" | "openrouter" | "xai",
  endpoint: string,
  extraHeaders: Record<string, string>,
  opts: ProviderCallOptions
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens ?? 700,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw classify(res.status, provider, body);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      error?: { message?: string };
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ProviderError(`${provider}: réponse vide`, provider, 200, "invalid");
    return {
      text,
      model: opts.model,
      provider,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
    };
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e instanceof Error && e.name === "AbortError")
      throw new ProviderError(`${provider}: délai dépassé (${opts.timeoutMs} ms)`, provider, 408, "timeout");
    throw new ProviderError(
      `${provider}: erreur réseau (${e instanceof Error ? e.message : "inconnue"})`,
      provider,
      undefined,
      "network"
    );
  } finally {
    clearTimeout(timer);
  }
}

export const groqProvider = {
  call: (opts: ProviderCallOptions) =>
    callOpenAiCompatible("groq", "https://api.groq.com/openai/v1/chat/completions", {}, opts),
};

export const openRouterProvider = {
  call: (opts: ProviderCallOptions) =>
    callOpenAiCompatible(
      "openrouter",
      "https://openrouter.ai/api/v1/chat/completions",
      {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://soul-ai-companion.vercel.app",
        "X-Title": "SOUL AI",
      },
      opts
    ),
};

export const xaiProvider = {
  call: (opts: ProviderCallOptions) =>
    callOpenAiCompatible("xai", "https://api.x.ai/v1/chat/completions", {}, opts),
};
