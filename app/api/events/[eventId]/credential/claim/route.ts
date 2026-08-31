import { NextRequest } from "next/server";
import { findEventByIdOrSlug } from "@/lib/event";
import { readSession, apiError } from "@/lib/session";
import { claimCredential } from "@/lib/credential";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Klaim kredensial event (POST /api/events/{id}/credential/claim) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);

  const event = await findEventByIdOrSlug(eventId);
  if (!event) return apiError("Event tidak ditemukan.", "EVENT_NOT_FOUND", 404);

  const joined = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: session.sub } },
  });
  if (!joined) return apiError("Gabung event terlebih dahulu.", "NOT_JOINED", 403);

  const result = await claimCredential(event.id, session.sub);
  return Response.json(result);
}
