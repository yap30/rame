import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Ajukan event ke review admin (EO).
 * POST /api/organizer/events/{id}/submit  — DRAFT → SUBMITTED (menunggu approval admin)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "CREATE_EVENT");
  if (!guard.ok) return guardError(guard);

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return guardError({ ok: false, status: 404, code: "EVENT_NOT_FOUND", message: "Event tidak ditemukan." });
  if (event.status !== "DRAFT") {
    return guardError({ ok: false, status: 409, code: "NOT_DRAFT", message: "Hanya event berstatus DRAFT yang bisa diajukan review." });
  }

  const updated = await prisma.event.update({ where: { id }, data: { status: "SUBMITTED" } });

  await prisma.eventLog.create({
    data: {
      eventId: id,
      actorType: "SYSTEM",
      action: "EVENT_SUBMITTED",
      dataJson: { by: guard.session.sub } as object,
    },
  });

  return Response.json({ event: { id: updated.id, status: updated.status } });
}
