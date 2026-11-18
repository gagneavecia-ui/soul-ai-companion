import { NextRequest } from "next/server";
import { verifyRequest, unauthorized } from "@/lib/serverAuth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { recentErrors } from "@/lib/errorLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Journal des erreurs (suivi côté administration).
 * Buffer mémoire temps réel + historique persistant Firestore si disponible.
 */
export async function GET(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx || !ctx.isAdmin) return unauthorized("Accès administrateur requis");
  const db = getAdminDb();
  let persisted: unknown[] = [];
  if (db) {
    try {
      const snap = await db
        .collection("admin_errors")
        .orderBy("ts", "desc")
        .limit(100)
        .get();
      persisted = snap.docs.map((d) => d.data());
    } catch {
      persisted = [];
    }
  }
  return Response.json({ live: recentErrors(100), persisted: persisted.slice(0, 50) });
}
