import { NextRequest } from "next/server";
import { verifyRequest, unauthorized } from "@/lib/serverAuth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Profil & préférences utilisateur (langue, audio, consentement mémoire).
 * GET : profil   PUT : mise à jour partielle
 */

export interface SoulProfile {
  displayName?: string;
  lang?: "fr" | "en" | "es";
  voice?: {
    ttsEnabled?: boolean;
    voiceURI?: string | null;
    pitch?: number;
    rate?: number;
    volume?: number;
  };
  memoryConsent?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export async function GET(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx) return unauthorized();
  const db = getAdminDb();
  if (!db) return Response.json({ error: "Base de données indisponible" }, { status: 503 });
  try {
    const snap = await db.collection("users").doc(ctx.uid).get();
    const data = (snap.data() as SoulProfile | undefined) || {};
    return Response.json({
      profile: {
        ...data,
        email: ctx.email,
        displayName: data.displayName || ctx.email?.split("@")[0] || null,
      },
    });
  } catch (e) {
    return Response.json(
      { error: "Lecture impossible", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx) return unauthorized();
  const db = getAdminDb();
  if (!db) return Response.json({ error: "Base de données indisponible" }, { status: 503 });
  try {
    const body = (await req.json()) as Partial<SoulProfile>;
    // Champs autorisés uniquement — validation stricte
    const patch: Partial<SoulProfile> = {};
    if (typeof body.displayName === "string") patch.displayName = body.displayName.slice(0, 60);
    if (body.lang && ["fr", "en", "es"].includes(body.lang)) patch.lang = body.lang;
    if (body.voice && typeof body.voice === "object") {
      patch.voice = {
        ttsEnabled: !!body.voice.ttsEnabled,
        voiceURI: body.voice.voiceURI || null,
        pitch: Math.min(1.5, Math.max(0.3, Number(body.voice.pitch) || 0.8)),
        rate: Math.min(1.5, Math.max(0.5, Number(body.voice.rate) || 1)),
        volume: Math.min(1, Math.max(0, Number(body.voice.volume ?? 1))),
      };
    }
    if (typeof body.memoryConsent === "boolean") patch.memoryConsent = body.memoryConsent;
    patch.updatedAt = Date.now();
    await db
      .collection("users")
      .doc(ctx.uid)
      .set(patch, { merge: true, mergeFields: Object.keys(patch) as never[] });
    return Response.json({ ok: true, profile: patch });
  } catch (e) {
    return Response.json(
      { error: "Enregistrement impossible", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
