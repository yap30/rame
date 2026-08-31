import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";
import { logEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Approve / reject peserta waiting list (POST /api/organizer/events/{id}/waitlist/{pid})
 * Body: { action: "approve" | "reject" }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const guard = await requireCapability(id, "CREATE_EVENT");
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action === "reject" ? "REJECTED" : "JOINED"; // default approve

  const entry = await prisma.eventParticipant.findUnique({ where: { id: pid } });
  if (!entry || entry.eventId !== id) {
    return guardError({ ok: false, status: 404, code: "WAITLIST_ENTRY_NOT_FOUND", message: "Entri waiting list tidak ditemukan." });
  }
  if (entry.status !== "WAITLIST") {
    return guardError({ ok: false, status: 409, code: "NOT_WAITLIST", message: "Peserta bukan status waiting list." });
  }

  await prisma.eventParticipant.update({ where: { id: pid }, data: { status: action } });
  await logEvent(id, entry.userId, "ORGANIZER", action === "JOINED" ? "WAITLIST_APPROVED" : "WAITLIST_REJECTED", { by: guard.session.sub });

  return Response.json({ ok: true, status: action, participant: { id: entry.id, userId: entry.userId } });
}
