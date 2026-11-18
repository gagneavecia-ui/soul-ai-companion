import { NextRequest } from "next/server";
import { verifyRequest, unauthorized } from "@/lib/serverAuth";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Attribution du claim admin — contrôlée exclusivement côté serveur.
 * Deux voies :
 *  1. email figurant dans ADMIN_EMAILS (claim auto, idempotent)
 *  2. clé de configuration unique ADMIN_SETUP_KEY fournie une fois par le
 *     propriétaire (l'email du compte connecté est alors promu admin).
 * Jamais de condition frontend : le claim est vérifié par verifyRequest
 * (décodage du token) sur toutes les routes /api/admin/*.
 */
export async function POST(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx) return unauthorized();
  const auth = getAdminAuth();
  if (!auth) return Response.json({ error: "Firebase admin indisponible" }, { status: 503 });

  const adminList = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const setupKey = process.env.ADMIN_SETUP_KEY || "";

  let body: { setupKey?: string } = {};
  try {
    body = (await req.json()) as { setupKey?: string };
  } catch {
    // corps optionnel
  }

  const emailMatches = !!ctx.email && adminList.includes(ctx.email.toLowerCase());
  const keyMatches =
    !!setupKey && !!body.setupKey && body.setupKey.trim() === setupKey;

  if (!emailMatches && !keyMatches) {
    return Response.json(
      { error: "Email non autorisé ou clé de configuration invalide" },
      { status: 403 }
    );
  }

  await auth.setCustomUserClaims(ctx.uid, { admin: true });
  // Le client doit rafraîchir son token pour récupérer le claim
  return Response.json({ ok: true, admin: true, email: ctx.email });
}
