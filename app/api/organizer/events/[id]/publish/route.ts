import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Review event oleh ADMIN (approve/reject).
 * EO tidak lagi bisa publish sendiri — event butuh approval admin.
 * POST /api/organizer/events/{id}/publish  body: { decision: "approve"|"reject", reason? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await readSession();
  if (!session || session.role !== "ADMIN") return apiError("Hanya admin.", "FORBIDDEN", 403);

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return apiError("Event tidak ditemukan.", "EVENT_NOT_FOUND", 404);
  if (event.status !== "SUBMITTED") return apiError("Event tidak dalam status menunggu review.", "NOT_SUBMITTED", 409);

  const body = (await req.json().catch(() => ({}))) as { decision?: string; reason?: string };
  const approve = body.decision !== "reject";
  const nextStatus = approve ? "PUBLISHED" : "REJECTED";

  const updated = await prisma.event.update({
    where: { id },
    data: { status: nextStatus },
  });

  await prisma.eventLog.create({
    data: {
      eventId: id,
      actorType: "ADMIN",
      action: approve ? "EVENT_APPROVED" : "EVENT_REJECTED",
      dataJson: { reason: body.reason ?? null, adminId: session.sub } as object,
    },
  });

  return Response.json({ event: { id: updated.id, status: updated.status } });
}
