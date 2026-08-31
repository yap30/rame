import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Update status laporan: OPEN → INVESTIGATING → ACTION_REQUIRED → RESOLVED | DISMISSED */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role !== "ADMIN") return apiError("Khusus admin.", "FORBIDDEN", 403);

  const body = (await req.json().catch(() => ({}))) as { status?: string; resolution?: string };
  const VALID = ["OPEN", "INVESTIGATING", "ACTION_REQUIRED", "RESOLVED", "DISMISSED"];
  const nextStatus = body.status && VALID.includes(body.status) ? body.status : null;
  if (!nextStatus) return apiError("Status tidak valid.", "INVALID_STATUS", 400);

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return apiError("Laporan tidak ditemukan.", "REPORT_NOT_FOUND", 404);

  const resolved = nextStatus === "RESOLVED" || nextStatus === "DISMISSED";
  const updated = await prisma.report.update({
    where: { id },
    data: {
      status: nextStatus,
      resolution: body.resolution?.trim() ?? report.resolution,
      resolvedBy: resolved ? session.sub : null,
      resolvedAt: resolved ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.sub,
      action: "REPORT_STATUS_CHANGED",
      resourceType: "REPORT",
      resourceId: id,
      reason: body.resolution?.trim() ?? null,
      before: { status: report.status } as object,
      after: { status: updated.status } as object,
    },
  });

  return Response.json({ report: { id: updated.id, status: updated.status } });
}
