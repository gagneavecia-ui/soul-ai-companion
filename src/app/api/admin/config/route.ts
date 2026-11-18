import { NextRequest } from "next/server";
import { verifyRequest, unauthorized } from "@/lib/serverAuth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getAppConfig, invalidateConfigCache, envDefaults } from "@/lib/appConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Configuration applicative (ordre fournisseurs, modèles, prompt système,
 * délais). Écriture contrôlée côté serveur par le claim admin.
 * Les clés API ne sont JAMAIS ici : elles vivent uniquement dans les
 * variables d'environnement chiffrées de l'hébergeur.
 */
export async function GET(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx || !ctx.isAdmin) return unauthorized("Accès administrateur requis");
  const cfg = await getAppConfig();
  return Response.json({ config: cfg, envDefaults: envDefaults() });
}

export async function POST(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx || !ctx.isAdmin) return unauthorized("Accès administrateur requis");
  const db = getAdminDb();
  if (!db) return Response.json({ error: "Base de données indisponible" }, { status: 503 });
  try {
    const body = (await req.json()) as {
      providerOrder?: string[];
      models?: Record<string, string>;
      systemPrompt?: string;
      timeoutMs?: number;
      maxTokens?: number;
    };
    const valid = ["groq", "openrouter", "gemini", "xai"];
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (Array.isArray(body.providerOrder)) {
      const order = body.providerOrder.filter((p) => valid.includes(p));
      if (order.length) patch.providerOrder = order;
    }
    if (body.models && typeof body.models === "object") {
      const models: Record<string, string> = {};
      for (const p of valid) {
        if (typeof body.models[p] === "string" && body.models[p].trim())
          models[p] = body.models[p].trim().slice(0, 120);
      }
      patch.models = models;
    }
    if (typeof body.systemPrompt === "string" && body.systemPrompt.trim().length > 20)
      patch.systemPrompt = body.systemPrompt.slice(0, 8000);
    if (Number(body.timeoutMs) >= 5000 && Number(body.timeoutMs) <= 55000)
      patch.timeoutMs = Number(body.timeoutMs);
    if (Number(body.maxTokens) >= 100 && Number(body.maxTokens) <= 2000)
      patch.maxTokens = Number(body.maxTokens);

    await db.collection("app").doc("config").set(patch, { merge: true });
    invalidateConfigCache();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "Enregistrement impossible", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
