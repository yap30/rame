// ============================================================
// RAME — auth: linking profil e.id + penerbitan session
// Dipakai route /api/auth/eid/* dan /api/auth/mock-login
// ============================================================
import prisma from "./db";
import { createSessionToken, SessionPayload } from "./session";
import { EidProfile } from "./eid/types";

export async function findOrCreateUserByEid(profile: EidProfile): Promise<{ user: { id: string; name: string; email: string | null; role: string; status: string; suspendReason: string | null }; orgId?: string }> {
  const ext = await prisma.externalIdentity.findUnique({
    where: { provider_providerSubject: { provider: "e.id", providerSubject: profile.subject } },
    include: { user: true },
  });

  let user = ext?.user ?? null;
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: profile.name ?? (profile.email ? profile.email.split("@")[0] : "Peserta"),
        email: profile.email,
        role: "PARTICIPANT",
        avatarUrl: "",
        externalIdentities: {
          create: {
            provider: "e.id",
            providerSubject: profile.subject,
            providerEmail: profile.email,
            profileJson: (profile.raw ?? { name: profile.name, trustLevel: profile.trustLevel }) as object,
          },
        },
      },
    });
  } else if (profile.email && !user.email) {
    user = await prisma.user.update({ where: { id: user.id }, data: { email: profile.email } });
  }

  // self-heal nama: user lama yg dibuat dgn fallback ("Peserta e.id") → nama dari
  // metadata e.id (fullname OAuth / awalan email) agar profile menampilkan nama asli.
  if ((user.name === "Peserta e.id" || user.name === "Peserta" || !user.name) && profile.email) {
    const nameFromMeta = profile.name && !profile.name.includes("@") ? profile.name : profile.email.split("@")[0];
    user = await prisma.user.update({ where: { id: user.id }, data: { name: nameFromMeta } });
  }

  // Super Admin: email yang terverifikasi via e.id tercantum di SUPER_ADMIN_EMAILS
  // (env produksi) → naikkan role ke ADMIN. Aman: identitas datang dari verifikasi e.id,
  // bukan klaim klien.
  const superAdmins = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const verifiedEmail = profile.email?.trim().toLowerCase();
  if (verifiedEmail && superAdmins.includes(verifiedEmail) && user.role !== "ADMIN") {
    user = await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }

  let orgId: string | undefined;
  if (user.role === "ORGANIZER") {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    orgId = membership?.organizationId;
  }

  return { user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, suspendReason: user.suspendReason }, orgId };
}

export async function issueSession(userId: string, role: string, orgId?: string): Promise<string> {
  const payload: SessionPayload = { sub: userId, role, orgId };
  return createSessionToken(payload);
}

export async function demoLogin(kind: "participant" | "organizer" | "admin") {
  // blokir login utk akun yang disuspend
  const blocked = await prisma.user.findFirst({
    where: {
      OR: [
        { email: kind === "participant" ? "putri@semilir.id" : kind === "organizer" ? "rara@semilir.id" : "admin@rame.id" },
        { id: kind === "participant" ? "user-putri" : kind === "organizer" ? "user-rara" : "user-admin" },
      ],
      status: { in: ["SUSPENDED", "DISABLED"] },
    },
  });
  if (blocked) {
    throw new Error(blocked.suspendReason ? `ACCOUNT_SUSPENDED:${blocked.suspendReason}` : "ACCOUNT_SUSPENDED");
  }
  const profile: EidProfile =
    kind === "organizer"
      ? { subject: "did:idchain:demo:rara", email: "rara@semilir.id", name: "Rara Semilir", trustLevel: "Moderate — Tier 2" }
      : kind === "admin"
        ? { subject: "did:idchain:demo:admin", email: "admin@rame.id", name: "Admin RAME", trustLevel: "Tier 2" }
        : { subject: "did:idchain:demo:putri", email: "putri@semilir.id", name: "Putri Anggraini", trustLevel: "Moderate — Tier 2" };
  const { user, orgId } = await findOrCreateUserByEid(profile);
  // admin demo: pastikan role ADMIN (seed mungkin belum ada)
  if (kind === "admin" && user.role !== "ADMIN") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }
  const token = await issueSession(user.id, user.role === "ADMIN" ? "ADMIN" : user.role, orgId);
  return { user: { ...user, role: user.role === "ADMIN" ? "ADMIN" : user.role }, token };
}

/** Variant untuk Login with VC: subject = DID holder, tanpa profil OAuth */
export async function findOrCreateUserByEidSubject(subject: string, extra?: { name?: string; email?: string }) {
  return findOrCreateUserByEid({
    subject,
    name: extra?.name,
    email: extra?.email,
    trustLevel: "Tier 1",
    raw: { source: "login-vc" },
  });
}
