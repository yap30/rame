import { NextRequest, NextResponse } from "next/server";
import { getVerifier, eidMode } from "@/lib/eid";
import prisma from "@/lib/db";
import { findOrCreateUserByEidSubject, issueSession } from "@/lib/auth";
import { SESSION_COOKIE, isSecureRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Poll status Login VC. Browser memanggil tiap ~2 detik.
 * Saat APPROVED: buat/link user RAME dari DID holder → set session cookie.
 */
export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid");
  if (!sid) return Response.json({ ok: false, error: { code: "MISSING_SID", message: "session id wajib." } }, { status: 400 });

  const row = await prisma.authLoginSession.findUnique({ where: { sessionId: sid } });
  if (!row) return Response.json({ ok: false, error: { code: "SESSION_NOT_FOUND", message: "Sesi login tidak ditemukan." } }, { status: 404 });

  // kedaluwarsa
  if (row.status === "PENDING" && row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    await prisma.authLoginSession.update({ where: { id: row.id }, data: { status: "EXPIRED" } });
    return Response.json({ ok: false, status: "EXPIRED" }, { status: 410 });
  }

  // mode nyata: poll gateway untuk status terbaru (webhook mungkin belum sampai)
  if (eidMode() !== "mock" && row.status === "PENDING") {
    try {
      const live = await getVerifier().getSession(sid);
      if (live.status !== "PENDING" && live.status !== row.status) {
        await prisma.authLoginSession.update({
          where: { id: row.id },
          data: { status: live.status, holderDid: live.holderDid ?? row.holderDid, rawJson: { polled: live } as object },
        });
        row.status = live.status;
        row.holderDid = live.holderDid ?? row.holderDid;
      }
    } catch {
      // gateway tidak terjangkau — biarkan polling berikutnya mencoba lagi
    }
  }

  if (row.status === "APPROVED") {
    const did = row.holderDid;
    if (!did) return Response.json({ ok: true, status: "APPROVED", authenticated: false, message: "HOLDER_DID_MISSING" });

    // nama holder dari raw webhook bila ada
    const raw = (row.rawJson ?? {}) as { holderName?: string; holder_account?: { username?: string } };
    const holderName = raw.holderName ?? raw.holder_account?.username;

    const { user, orgId } = await findOrCreateUserByEidSubject(did, holderName ? { name: holderName } : undefined);
    if (!row.userId) {
      await prisma.authLoginSession.update({ where: { id: row.id }, data: { userId: user.id } });
    }
    const token = await issueSession(user.id, user.role, orgId);
    const res = NextResponse.json({ ok: true, status: "APPROVED", authenticated: true, user: { id: user.id, name: user.name, role: user.role } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(req),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  return Response.json({ ok: true, status: row.status, authenticated: false });
}
