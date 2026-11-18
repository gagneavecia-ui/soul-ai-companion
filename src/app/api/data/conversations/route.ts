import { NextRequest } from "next/server";
import { verifyRequest, unauthorized } from "@/lib/serverAuth";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Conversations de l'utilisateur — accès exclusivement via le serveur
 * (SDK admin). Le client ne touche jamais Firestore directement.
 * GET    : liste des conversations (métadonnées)
 * POST   : enregistrement / mise à jour d'une conversation
 * DELETE : suppression complète de l'historique
 */

interface ConversationDoc {
  id: string;
  title: string;
  lang: string;
  createdAt: number;
  updatedAt: number;
  messages: { role: "user" | "assistant"; content: string; ts: number }[];
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
      .collection("conversations")
      .orderBy("updatedAt", "desc")
      .limit(100)
      .get();
    const conversations = snap.docs.map((d) => {
      const v = d.data() as ConversationDoc;
      return {
        id: d.id,
        title: v.title,
        lang: v.lang,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        messageCount: v.messages?.length ?? 0,
        messages: v.messages ?? [],
      };
    });
    return Response.json({ conversations });
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
    const body = (await req.json()) as ConversationDoc;
    const id = body.id || crypto.randomUUID();
    const now = Date.now();
    const doc: ConversationDoc = {
      id,
      title: (body.title || "Conversation").slice(0, 120),
      lang: body.lang || "fr",
      createdAt: body.createdAt || now,
      updatedAt: now,
      messages: (body.messages || []).slice(-200),
    };
    await db.collection("users").doc(ctx.uid).collection("conversations").doc(id).set(doc);
    return Response.json({ ok: true, id, updatedAt: doc.updatedAt });
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
      await db.collection("users").doc(ctx.uid).collection("conversations").doc(id).delete();
    } else {
      const snap = await db
        .collection("users")
        .doc(ctx.uid)
        .collection("conversations")
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
