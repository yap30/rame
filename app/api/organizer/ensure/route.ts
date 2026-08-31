import { NextRequest, NextResponse } from "next/server";
import { readSession, apiError, SESSION_COOKIE, isSecureRequest } from "@/lib/session";
import { issueSession } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Aktifkan mode penyelenggara (idempoten) — dipicu dari menu navigasi "Buat Event".
 * Tidak ada pemetaan role saat daftar: role dipilih pengguna setelah login.
 * - User tanpa organisasi → buat "Organisasi <nama>" + membership EO + role ORGANIZER
 * - Sudah EO/berorg → kembalikan keadaan (ALREADY)
 */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role === "ADMIN") return Response.json({ ok: true, role: "ADMIN", status: "ALREADY" });

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return apiError("Sesi tidak valid — silakan masuk ulang.", "SESSION_INVALID", 401);

  // sudah punya org? pakai yang ada (user bisa punya beberapa; ambil pertama)
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, role: { in: ["EO", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
  });
  let org = membership ? await prisma.organization.findUnique({ where: { id: membership.organizationId } }) : null;

  if (!org) {
    const base = (user.name || "Penyelenggara").split(" ")[0] || "Event";
    const slug = `org-${base.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "event"}-${Date.now().toString(36)}`;
    org = await prisma.organization.create({
      data: { name: `Organisasi ${base}`, slug, description: null },
    });
    await prisma.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role: "EO" } });
  }

  const promoted = user.role !== "ORGANIZER";
  if (promoted) {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ORGANIZER" } });
  }

  // role berubah → terbitkan ulang sesi (JWT membawa role)
  const token = await issueSession(user.id, "ORGANIZER", org.id);
  const res = NextResponse.json({
    ok: true,
    role: "ORGANIZER",
    status: promoted ? "PROMOTED" : "ALREADY",
    org: { id: org.id, name: org.name },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
