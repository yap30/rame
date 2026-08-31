import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { SESSION_COOKIE, isSecureRequest, apiError } from "@/lib/session";
import { issueSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Registrasi event organizer (self-service untuk prototype).
 * Membuat: User (role ORGANIZER) + Organization + membership EO + session.
 * Catatan produksi: proses ini sebaiknya digate persetujuan admin/onboarding.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string; orgName?: string };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const orgName = body.orgName?.trim();

  if (!name || !email || !orgName) {
    return apiError("Nama, email, dan nama organisasi wajib diisi.", "REQUIRED_MISSING", 422);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return apiError("Format email tidak valid.", "INVALID_EMAIL", 422);
  }

  // pakai ulang user bila email sudah ada
  let user = await prisma.user.findFirst({ where: { email } });
  if (user) {
    if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
      return apiError("Email sudah terdaftar sebagai partisipan. Gunakan email lain.", "EMAIL_TAKEN", 409);
    }
  } else {
    user = await prisma.user.create({
      data: { name, email, role: "ORGANIZER", avatarUrl: "" },
    });
  }

  // organisasi: cari by slug, buat bila belum ada
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `org-${Date.now().toString(36)}`;
  let org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: orgName, slug, description: null } });
  }

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    create: { organizationId: org.id, userId: user.id, role: "EO" },
    update: {},
  });

  const token = await issueSession(user.id, user.role, org.id);
  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, org: { id: org.id, name: org.name } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
