// ============================================================
// RAME — guard route organizer (RBAC scope-aware)
// ============================================================
import { readSession, SessionPayload } from "./session";
import { canOnEvent, Capability } from "./permissions";
import prisma from "./db";

export type GuardResult =
  | { ok: true; session: SessionPayload; orgRole: string | null }
  | { ok: false; status: number; code: string; message: string };

/** Wajib login + role organizer/admin */
export async function requireOrgUser(): Promise<GuardResult> {
  const session = await readSession();
  if (!session) return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Silakan masuk terlebih dahulu." };
  if (session.role !== "ORGANIZER" && session.role !== "ADMIN") {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "Akun bukan organizer." };
  }
  return { ok: true, session, orgRole: session.role === "ADMIN" ? "ADMIN" : null };
}

/** Wajib kapabilitas terhadap event tertentu (scope-aware) */
export async function requireCapability(eventId: string, capability: Capability): Promise<GuardResult> {
  const base = await requireOrgUser();
  if (!base.ok) return base;
  if (base.session.role === "ADMIN") return { ...base, orgRole: "ADMIN" };
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizationId: true } });
  if (!event) return { ok: false, status: 404, code: "EVENT_NOT_FOUND", message: "Event tidak ditemukan." };
  const allowed = await canOnEvent({ id: base.session.sub, role: base.session.role }, eventId, capability);
  if (!allowed) return { ok: false, status: 403, code: "FORBIDDEN", message: "Tidak memiliki izin untuk event ini." };
  return base;
}

export function guardError(res: Extract<GuardResult, { ok: false }>) {
  return Response.json({ error: { code: res.code, message: res.message } }, { status: res.status });
}
