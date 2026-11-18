import { NextRequest } from "next/server";
import { verifyRequest, unauthorized } from "@/lib/serverAuth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Mémoire persistante autorisée — uniquement avec le consentement explicite.
 * GET    : entrées mémorisées
 * POST   : ajout d'une entrée { text }
 * DELETE : suppression d'une entrée (?id=) ou de toute la mémoire
 */

interface MemoryDoc {
  text: string;
  createdAt: number;
}

export async function GET(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx) return unauthorized();
  const db = getAdminDb();
  if (!db) return Response.json({ error: "Base de données indisponible" }, { status: 503 });
  try {
    const snap = await db
      .collection("users")
      .doc(ctx.uid)
      .collection("memory")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    return Response.json({
      memory: snap.docs.map((d) => ({ id: d.id, ...(d.data() as MemoryDoc) })),
    });
  } catch (e) {
    return Response.json(
      { error: "Lecture impossible", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx) return unauthorized();
  const db = getAdminDb();
  if (!db) return Response.json({ error: "Base de données indisponible" }, { status: 503 });
  try {
    const { text } = (await req.json()) as { text?: string };
    const clean = (text || "").trim().slice(0, 240);
    if (!clean) return Response.json({ error: "Texte vide" }, { status: 400 });
    const ref = await db
      .collection("users")
      .doc(ctx.uid)
      .collection("memory")
      .add({ text: clean, createdAt: Date.now() });
    return Response.json({ ok: true, id: ref.id });
  } catch (e) {
    return Response.json(
      { error: "Enregistrement impossible", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await verifyRequest(req);
  if (!ctx) return unauthorized();
  const db = getAdminDb();
  if (!db) return Response.json({ error: "Base de données indisponible" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id");
  try {
    if (id) {
      await db.collection("users").doc(ctx.uid).collection("memory").doc(id).delete();
    } else {
      const snap = await db
        .collection("users")
        .doc(ctx.uid)
        .collection("memory")
        .limit(200)
        .get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: "Suppression impossible", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
