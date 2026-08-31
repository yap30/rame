import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";
import { COMPLETION_METHOD_LABEL } from "@/lib/const";

export const dynamic = "force-dynamic";

/** Detail aktivitas + status peserta */
export async function GET(req: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  const session = await readSession();

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { event: { select: { id: true, slug: true, name: true } }, stamp: true, achievement: true, template: true },
  });
  if (!activity) return apiError("Aktivitas tidak ditemukan.", "ACTIVITY_NOT_FOUND", 404);

  const [myCompletion, qrSession, participantCount] = await Promise.all([
    session ? prisma.activityCompletion.findFirst({ where: { activityId, userId: session.sub } }) : null,
    session ? prisma.qrSession.findFirst({ where: { activityId, userId: session.sub, usedAt: null }, orderBy: { createdAt: "desc" } }) : null,
    prisma.activityCompletion.count({ where: { activityId } }),
  ]);

  return Response.json({
    activity: {
      id: activity.id,
      eventId: activity.eventId,
      eventSlug: activity.event.slug,
      eventName: activity.event.name,
      title: activity.title,
      description: activity.description,
      type: activity.type,
      completionMethod: activity.completionMethod,
      completionMethodLabel: COMPLETION_METHOD_LABEL[activity.completionMethod] ?? activity.completionMethod,
      verificationRequired: activity.verificationRequired,
      repeatable: activity.repeatable,
      xpReward: activity.xpReward,
      icon: activity.icon,
      availabilityStartsAt: activity.availabilityStartsAt,
      availabilityEndsAt: activity.availabilityEndsAt,
      config: activity.configJson ?? {},
      stamp: activity.stamp ? { id: activity.stamp.id, name: activity.stamp.name, emoji: activity.stamp.emoji, color: activity.stamp.color } : null,
      templateName: activity.template?.name ?? null,
      completedCount: participantCount,
    },
    myStatus: session
      ? {
          completed: Boolean(myCompletion),
          completion: myCompletion ? { id: myCompletion.id, method: myCompletion.method, completedAt: myCompletion.completedAt, data: myCompletion.dataJson } : null,
          qrAvailable: Boolean(qrSession) && new Date(qrSession!.expiresAt).getTime() > Date.now(),
          qrExpiresAt: qrSession?.expiresAt ?? null,
        }
      : null,
  });
}
