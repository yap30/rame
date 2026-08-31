import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Daftar event untuk admin (semua status, dengan filter) */
export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role !== "ADMIN") return apiError("Khusus admin.", "FORBIDDEN", 403);

  const status = req.nextUrl.searchParams.get("status"); // opsional filter
  const where = status ? { status } : {};

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      organization: { select: { name: true } },
      _count: { select: { participants: true, activities: true } },
    },
  });

  return Response.json({
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      status: e.status,
      city: e.city,
      createdAt: e.createdAt,
      organization: e.organization.name,
      participants: e._count.participants,
      activities: e._count.activities,
    })),
  });
}
