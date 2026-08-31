import { NextRequest } from "next/server";
import { getVerifier } from "@/lib/eid";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Presentation Webhook (Gateway e.id -> RAME).
 * Dikirim gateway saat event presentasi: scan / reject / approve.
 * Idempoten: status APPROVED hanya diproses sekali (APPROVED final).
 */
export async function POST(req: NextRequest) {
  const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const hook = getVerifier().parseWebhook(raw ?? {});

  if (!hook.sessionId) {
    return Response.json({ ok: true, message: "MISSING_SESSION_ACKNOWLEDGED" });
  }

  const row = await prisma.authLoginSession.findUnique({ where: { sessionId: hook.sessionId } });
  if (!row) {
    // webhook untuk sesi yang tidak dikenal — akui agar gateway tidak retry (idempoten)
    return Response.json({ ok: true, message: "UNKNOWN_SESSION_ACKNOWLEDGED" });
  }

  // APPROVED bersifat final — jangan timpa dengan event scan berikutnya
  const nextStatus = hook.status === "APPROVED" || hook.status === "REJECTED" ? hook.status : row.status === "APPROVED" ? "APPROVED" : hook.status;

  await prisma.authLoginSession.update({
    where: { id: row.id },
    data: {
      status: nextStatus,
      holderDid: hook.holderDid ?? row.holderDid,
      rawJson: hook.raw as object,
    },
  });

  return Response.json({ ok: true, status: nextStatus });
}
