import { NextRequest } from "next/server";
import { verifyRequest, unauthorized } from "@/lib/serverAuth";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getUsageStats, recentErrors } from "@/lib/errorLog";
import { getAppConfig } from "@/lib/appConfig";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Statistiques administrateur — accès serveur uniquement.
 * Aucune clé API n'est renvoyée : seulement "configuré" oui/non.
 */
export async function GET(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx || !ctx.isAdmin) return unauthorized("Accès administrateur requis");
  const auth = getAdminAuth();
  if (!auth) return Response.json({ error: "Firebase admin indisponible" }, { status: 503 });

  let users = -1;
  let recent: { email: string | null; createdAt: string; lastSignIn: string }[] | null = null;
  try {
    const listUsers = await auth.listUsers(1000);
    users = listUsers.users.length;
    recent = listUsers.users
      .sort((a, b) => (b.metadata.lastSignInTime || "").localeCompare(a.metadata.lastSignInTime || ""))
      .slice(0, 8)
      .map((u) => ({
        email: u.email ? u.email.replace(/^(.{2}).*(@.*)$/, "$1…$2") : null,
        createdAt: u.metadata.creationTime,
        lastSignIn: u.metadata.lastSignInTime,
      }));
  } catch {
    users = -1;
  }

  const cfg = await getAppConfig();
  const usage = await getUsageStats();
  const errors = recentErrors(50);
  const errorsByKind: Record<string, number> = {};
  errors.forEach((e) => {
    errorsByKind[e.code] = (errorsByKind[e.code] || 0) + 1;
  });

  const keysConfigured = {
    groq: !!process.env.GROQ_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    xai: !!process.env.XAI_API_KEY,
  };

  return Response.json({
    users,
    recentUsers: recent,
    usage,
    providers: (["groq", "openrouter", "gemini", "xai"] as ProviderId[]).map((id) => ({
      id,
      label: PROVIDER_LABELS[id],
      configured: keysConfigured[id as keyof typeof keysConfigured],
      model: cfg.models[id],
    })),
    activeOrder: cfg.providerOrder,
    systemPromptModified: cfg.updatedAt ? true : false,
    errors: {
      recentCount: errors.length,
      byKind: errorsByKind,
      recent: errors.slice(0, 10).map((e) => ({
        ts: e.ts,
        provider: e.provider,
        code: e.code,
        message: e.message.slice(0, 140),
      })),
    },
  });
}
