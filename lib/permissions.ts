// ============================================================
// RAME — RBAC (User -> Organization -> Event -> Permission)
// Sebuah role tidak otomatis memberi akses ke semua event
// (blueprint §3): komunitas/venue/media hanya mengakses resource
// yang ditugaskan ke organisasinya.
// ============================================================
import prisma from "./db";
import { ROLES } from "./const";

export type Capability =
  | "CREATE_EVENT"
  | "MANAGE_JOURNEY"
  | "CREATE_ACTIVITY"
  | "SCANNER"
  | "ANALYTICS"
  | "CREDENTIAL"
  | "EVENT_REPLAY";

const CAPABILITY_MATRIX: Record<Capability, string[]> = {
  CREATE_EVENT: [ROLES.EO, ROLES.ADMIN],
  MANAGE_JOURNEY: [ROLES.EO, ROLES.COMMUNITY, ROLES.ADMIN],
  CREATE_ACTIVITY: [ROLES.EO, ROLES.COMMUNITY, ROLES.MEDIA, ROLES.ADMIN],
  SCANNER: [ROLES.EO, ROLES.COMMUNITY, ROLES.VENUE, ROLES.ADMIN],
  ANALYTICS: [ROLES.EO, ROLES.COMMUNITY, ROLES.VENUE, ROLES.MEDIA, ROLES.ADMIN],
  CREDENTIAL: [ROLES.EO, ROLES.ADMIN],
  EVENT_REPLAY: [ROLES.EO, ROLES.COMMUNITY, ROLES.ADMIN],
};

export interface SessionUser {
  id: string;
  role: string; // PARTICIPANT | ORGANIZER | ADMIN
  orgId?: string;
}

/** Role user di organisasi pemilik event (atau null bila tidak terafiliasi) */
export async function orgRoleForEvent(userId: string, eventId: string): Promise<string | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizationId: true },
  });
  if (!event) return null;
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: event.organizationId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

export function can(role: string, capability: Capability): boolean {
  if (role === ROLES.ADMIN) return true;
  return CAPABILITY_MATRIX[capability].includes(role);
}

/** Cek kemampuan organizer terhadap event tertentu (scope-aware) */
export async function canOnEvent(user: SessionUser, eventId: string, capability: Capability): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const role = await orgRoleForEvent(user.id, eventId);
  if (!role) return false;
  return can(role, capability);
}

/** Daftar event yang boleh dikelola user (EO/anggota organisasinya) */
export async function manageableEvents(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });
  if (memberships.length === 0) return [];
  const events = await prisma.event.findMany({
    where: { organizationId: { in: memberships.map((m) => m.organizationId) } },
    orderBy: { createdAt: "desc" },
    include: { venue: true, organization: true },
  });
  return events.map((ev) => ({
    ...ev,
    userRole: memberships.find((m) => m.organizationId === ev.organizationId)?.role ?? null,
  }));
}
