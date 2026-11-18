import "server-only";
import {
  ProviderCallOptions,
  ProviderError,
  ProviderResult,
} from "./types";

/**
 * Google Gemini — Generative Language API (v1beta).
 * Auth par en-tête x-goog-api-key (clé AI Studio).
 * NB : la clé "AQ.…" fournie est rejetée hors des régions autorisées
 * (« User location is not supported ») : le basculement gère ce cas.
 */
export const geminiProvider = {
  async call(opts: ProviderCallOptions): Promise<ProviderResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      opts.model
    )}:generateContent`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": opts.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: opts.messages.find((m) => m.role === "system")
            ? { parts: [{ text: opts.messages.find((m) => m.role === "system")!.content }] }
            : undefined,
          contents: opts.messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          generationConfig: {
            temperature: opts.temperature ?? 0.8,
            maxOutputTokens: opts.maxTokens ?? 700,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 401 || res.status === 403)
          throw new ProviderError(`Clé Gemini refusée (${res.status})`, "gemini", res.status, "auth");
        if (res.status === 429)
          throw new ProviderError("Limite Gemini atteinte", "gemini", res.status, "rate-limit");
        if (res.status === 400 && body.includes("location is not supported"))
          throw new ProviderError(
            "Gemini indisponible depuis cette région",
            "gemini",
            res.status,
            "invalid"
          );
        if (res.status >= 500)
          throw new ProviderError(`Gemini indisponible (${res.status})`, "gemini", res.status, "server");
        throw new ProviderError(
          `Gemini a renvoyé ${res.status}: ${body.slice(0, 180)}`,
          "gemini",
          res.status,
          "invalid"
        );
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      const text = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim();
      if (!text) throw new ProviderError("Gemini: réponse vide", "gemini", 200, "invalid");
      return {
        text,
        model: opts.model,
        provider: "gemini",
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount,
          completionTokens: data.usageMetadata?.candidatesTokenCount,
        },
      };
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      if (e instanceof Error && e.name === "AbortError")
        throw new ProviderError(`Gemini: délai dépassé (${opts.timeoutMs} ms)`, "gemini", 408, "timeout");
      throw new ProviderError(
        `Gemini: erreur réseau (${e instanceof Error ? e.message : "inconnue"})`,
        "gemini",
        undefined,
        "network"
      );
    } finally {
      clearTimeout(timer);
    }
  },
};
