import { NextRequest } from "next/server";
import { eidMode } from "@/lib/eid";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Simulasi scan + approve Login VC (HANYA mode mock).
 * Di mode nyata, approval datang dari aplikasi e.id via webhook.
 */
export async function POST(req: NextRequest) {
  if (eidMode() !== "mock") {
    return Response.json({ ok: false, error: { code: "MOCK_ONLY", message: "Simulasi hanya tersedia di mode mock." } }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { sid?: string; kind?: string };
  if (!body.sid) return Response.json({ ok: false, error: { code: "MISSING_SID", message: "session id wajib." } }, { status: 400 });

  const row = await prisma.authLoginSession.findUnique({ where: { sessionId: body.sid } });
  if (!row) return Response.json({ ok: false, error: { code: "SESSION_NOT_FOUND", message: "Sesi tidak ditemukan." } }, { status: 404 });

  const did = body.kind === "organizer" ? "did:idchain:demo:rara" : "did:idchain:demo:putri";
  await prisma.authLoginSession.update({ where: { id: row.id }, data: { status: "APPROVED", holderDid: did } });

  return Response.json({ ok: true, status: "APPROVED", holderDid: did });
}
