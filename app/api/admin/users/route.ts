import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Daftar pengguna (admin) */
export async function GET() {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role !== "ADMIN") return apiError("Khusus admin.", "FORBIDDEN", 403);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      externalIdentities: { where: { provider: "e.id" }, select: { providerSubject: true }, take: 1 },
      memberships: { include: { organization: { select: { name: true } } } },
    },
  });
  return Response.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      eidSubject: u.externalIdentities[0]?.providerSubject ?? null,
      orgs: u.memberships.map((m) => ({ name: m.organization.name, role: m.role })),
      createdAt: u.createdAt,
    })),
  });
}
