import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";
import { logEvent } from "@/lib/analytics";
import { LOG_ACTIONS } from "@/lib/const";

export const dynamic = "force-dynamic";

/** Mulai aktivitas — catat event log ACTIVITY_STARTED */
export async function POST(req: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);

  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) return apiError("Aktivitas tidak ditemukan.", "ACTIVITY_NOT_FOUND", 404);

  const joined = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId: activity.eventId, userId: session.sub } },
  });
  if (!joined) return apiError("Gabung event terlebih dahulu.", "NOT_JOINED", 403);

  // idempotensi: satu log start per aktivitas per peserta
  const starts = await prisma.eventLog.findMany({
    where: { eventId: activity.eventId, userId: session.sub, action: LOG_ACTIONS.ACTIVITY_STARTED },
  });
  const alreadyStarted = starts.some((s) => (s.dataJson as { activityId?: string } | null)?.activityId === activityId);
  if (!alreadyStarted) {
    await logEvent(activity.eventId, session.sub, "PARTICIPANT", LOG_ACTIONS.ACTIVITY_STARTED, { activityId });
  }
  return Response.json({ started: true, activityId });
}
