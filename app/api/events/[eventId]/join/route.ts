import { NextRequest } from "next/server";
import { findEventByIdOrSlug } from "@/lib/event";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";
import { logEvent } from "@/lib/analytics";
import { LOG_ACTIONS } from "@/lib/const";

export const dynamic = "force-dynamic";

/** Gabung event (POST /api/events/{id}/join) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);

  const event = await findEventByIdOrSlug(eventId);
  if (!event) return apiError("Event tidak ditemukan.", "EVENT_NOT_FOUND", 404);

  const existing = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: session.sub } },
  });
  if (existing) {
    return Response.json({ joined: true, eventId: event.id, message: "ALREADY_JOINED" });
  }

  await prisma.eventParticipant.create({ data: { eventId: event.id, userId: session.sub } });
  await logEvent(event.id, session.sub, "PARTICIPANT", LOG_ACTIONS.EVENT_JOINED, { source: "join" });

  return Response.json({ joined: true, eventId: event.id, message: "JOINED" });
}
