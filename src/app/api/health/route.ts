import { NextRequest } from "next/server";
import { providerStatus } from "@/lib/ai/manager";
import { getAppConfig } from "@/lib/appConfig";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { PROVIDER_LABELS, type ProviderId } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await getAppConfig();
  const db = getAdminDb();
  let firestore = "unconfigured";
  if (db) {
    try {
      await db.collection("app").doc("health").get();
      firestore = "ok";
    } catch {
      firestore = "unreachable";
    }
  }
  return Response.json({
    status: "ok",
    app: "SOUL AI",
    time: new Date().toISOString(),
    services: {
      firestore,
    },
    providers: providerStatus().map((p) => ({
      id: p.id,
      label: PROVIDER_LABELS[p.id as ProviderId],
      configured: p.configured,
    })),
    activeOrder: cfg.providerOrder,
    models: cfg.models,
  });
}
