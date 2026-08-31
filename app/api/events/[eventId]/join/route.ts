import { NextRequest } from "next/server";
import { findEventByIdOrSlug } from "@/lib/event";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";
import { logEvent } from "@/lib/analytics";
import { LOG_ACTIONS } from "@/lib/const";

export const dynamic = "force-dynamic";

/** Status partisipasi yang terhitung sebagai slot terpakai */
const CONFIRMED_STATUSES = ["JOINED", "COMPLETED"];

/** Gabung event (POST /api/events/{id}/join) — kuota penuh → waiting list */
export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);

  const event = await findEventByIdOrSlug(eventId);
  if (!event) return apiError("Event tidak ditemukan.", "EVENT_NOT_FOUND", 404);

  // sesi bisa menunjuk user yang sudah terhapus (mis. setelah reseed) → cek eksistensi
  if (!(await prisma.user.findUnique({ where: { id: session.sub } }))) {
    return apiError("Sesi tidak valid — silakan masuk ulang.", "SESSION_INVALID", 401);
  }

  const existing = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: session.sub } },
  });
  if (existing) {
    if (existing.status === "WAITLIST") {
      return Response.json({ joined: false, waitlisted: true, status: "WAITLIST", eventId: event.id, message: "ALREADY_WAITLISTED" });
    }
    if (existing.status === "REJECTED") {
      return Response.json({ joined: false, waitlisted: false, status: "REJECTED", eventId: event.id, message: "WAITLIST_REJECTED" });
    }
    return Response.json({ joined: true, eventId: event.id, message: "ALREADY_JOINED" });
  }

  // kuota: hitung slot terpakai (JOINED + COMPLETED); penuh → WAITLIST
  const quota = event.quota;
  if (quota && quota > 0) {
    const confirmedCount = await prisma.eventParticipant.count({
      where: { eventId: event.id, status: { in: CONFIRMED_STATUSES } },
    });
    if (confirmedCount >= quota) {
      await prisma.eventParticipant.create({ data: { eventId: event.id, userId: session.sub, status: "WAITLIST" } });
      await logEvent(event.id, session.sub, "PARTICIPANT", "EVENT_WAITLISTED", { quota, confirmedCount });
      return Response.json({ joined: false, waitlisted: true, status: "WAITLIST", eventId: event.id, quota, message: "QUOTA_FULL_WAITLIST" });
    }
  }

  await prisma.eventParticipant.create({ data: { eventId: event.id, userId: session.sub, status: "JOINED" } });
  await logEvent(event.id, session.sub, "PARTICIPANT", LOG_ACTIONS.EVENT_JOINED, { source: "join" });

  return Response.json({ joined: true, eventId: event.id, message: "JOINED" });
}
