import { NextRequest } from "next/server";
import { chatWithFallback } from "@/lib/ai/manager";
import { ProviderError } from "@/lib/ai/types";
import { buildSoulMessages } from "@/lib/ai/soul";
import { verifyRequest } from "@/lib/serverAuth";
import { logError, trackMessage, trackConversationCreated } from "@/lib/errorLog";
import { getAppConfig } from "@/lib/appConfig";

export const runtime = "nodejs";
export const maxDuration = 60;

// Limitation de débit simple en mémoire (protection de base)
const rateMap = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const e = rateMap.get(ip);
  if (!e || now > e.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  e.count += 1;
  return e.count > 20;
}

interface ChatRequestBody {
  message: string;
  lang?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  memory?: string[];
  userName?: string | null;
  isNewConversation?: boolean;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Trop de requêtes. Attendez une minute avant de réessayer.", code: "rate-limit" },
      { status: 429 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const message = (body.message || "").trim();
  if (!message) {
    return Response.json({ error: "Message vide" }, { status: 400 });
  }
  if (message.length > 4000) {
    return Response.json({ error: "Message trop long (4000 caractères maximum)" }, { status: 413 });
  }

  const ctx = await verifyRequest(req);
  const lang = ["fr", "en", "es"].includes(body.lang || "") ? body.lang! : "fr";

  try {
    const cfg = await getAppConfig();
    const messages = buildSoulMessages({
      systemPrompt: cfg.systemPrompt,
      lang,
      history: Array.isArray(body.history) ? body.history.slice(-16) : [],
      memory: Array.isArray(body.memory) ? body.memory.slice(0, 12) : [],
      userName: body.userName || null,
    });
    messages.push({ role: "user", content: message });

    const result = await chatWithFallback(messages);
    void trackMessage(result.provider);
    if (body.isNewConversation) void trackConversationCreated();
    if (ctx) void ctx; // uid disponible pour d'éventuelles stats par utilisateur

    return Response.json({
      reply: result.text,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
      attempts: result.attempts,
    });
  } catch (e) {
    if (e instanceof ProviderError) {
      const attempts = (e as ProviderError & { attempts?: unknown }).attempts;
      logError({
        ts: Date.now(),
        provider: e.provider,
        code: e.kind,
        message: e.message.slice(0, 500),
        uid: ctx?.uid,
      });
      return Response.json(
        {
          error:
            e.kind === "rate-limit"
              ? "SOUL a atteint la limite d'utilisation du fournisseur IA. Réessayez dans un instant."
              : "SOUL n'a pas réussi à générer une réponse. Tous les fournisseurs IA ont échoué.",
          code: e.kind,
          attempts,
        },
        { status: 502 }
      );
    }
    logError({
      ts: Date.now(),
      provider: "unknown",
      code: "internal",
      message: e instanceof Error ? e.message.slice(0, 500) : String(e),
      uid: ctx?.uid,
    });
    return Response.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
