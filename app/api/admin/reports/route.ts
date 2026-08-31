import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Daftar laporan (admin) */
export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role !== "ADMIN") return apiError("Khusus admin.", "FORBIDDEN", 403);

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const reports = await prisma.report.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { reporter: { select: { name: true, email: true } } },
  });

  return Response.json({
    reports: reports.map((r) => ({
      id: r.id,
      reporter: r.reporter.name,
      reporterEmail: r.reporter.email,
      targetType: r.targetType,
      targetId: r.targetId,
      category: r.category,
      description: r.description,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt,
    })),
  });
}
