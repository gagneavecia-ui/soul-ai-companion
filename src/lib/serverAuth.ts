import "server-only";

/**
 * Authentification des requêtes serveur : vérifie le token ID Firebase
 * envoyé par le client et expose des helpers admin/uid.
 * L'accès admin est contrôlé ICI (serveur), jamais côté interface.
 */
import { getAdminAuth } from "./firebaseAdmin";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface RequestContext {
  uid: string;
  email: string | null;
  isAdmin: boolean;
  token: DecodedIdToken;
}

export function bearerFrom(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

export async function verifyRequest(req: Request): Promise<RequestContext | null> {
  const token = bearerFrom(req);
  if (!token) return null;
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(token, true);
    const adminList = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin =
      decoded.admin === true ||
      (!!decoded.email && adminList.includes(decoded.email.toLowerCase()));
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      isAdmin,
      token: decoded,
    };
  } catch {
    return null;
  }
}

export function unauthorized(message = "Authentification requise") {
  return Response.json({ error: message }, { status: 401 });
}
