import { NextRequest } from "next/server";
import { findEventByIdOrSlug } from "@/lib/event";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Daftar aktivitas event + status peserta (GET /api/events/{id}/activities) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await findEventByIdOrSlug(eventId);
  if (!event) return apiError("Event tidak ditemukan.", "EVENT_NOT_FOUND", 404);

  const session = await readSession();
  const activities = await prisma.activity.findMany({
    where: { eventId: event.id },
    orderBy: { sortOrder: "asc" },
    include: { stamp: true, achievement: true, journeyNode: true },
  });

  const myCompletions = session
    ? await prisma.activityCompletion.findMany({ where: { eventId: event.id, userId: session.sub } })
    : [];
  const completedIds = new Set(myCompletions.map((c) => c.activityId));

  return Response.json({
    activities: activities.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      completionMethod: a.completionMethod,
      verificationRequired: a.verificationRequired,
      repeatable: a.repeatable,
      xpReward: a.xpReward,
      icon: a.icon,
      position: a.journeyNode?.position ?? null,
      completed: completedIds.has(a.id),
      stamp: a.stamp ? { id: a.stamp.id, name: a.stamp.name, emoji: a.stamp.emoji } : null,
      achievement: a.achievement ? { id: a.achievement.id, name: a.achievement.name } : null,
    })),
  });
}
