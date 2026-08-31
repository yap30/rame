import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Dashboard partisipan: ringkasan keikutsertaan + progres */
export async function GET() {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);

  const [user, joins, stamps, xpAgg, achievements] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.sub }, include: { externalIdentities: { where: { provider: "e.id" }, take: 1 } } }),
    prisma.eventParticipant.findMany({
      where: { userId: session.sub },
      orderBy: { joinedAt: "desc" },
      include: {
        event: {
          select: { id: true, slug: true, name: true, city: true, identityJson: true, journeyMode: true },
        },
      },
    }),
    prisma.participantStamp.count({ where: { userId: session.sub } }),
    prisma.xpTransaction.aggregate({ where: { userId: session.sub }, _sum: { amount: true } }),
    prisma.participantAchievement.count({ where: { userId: session.sub } }),
  ]);

  if (!user) return apiError("Pengguna tidak ditemukan.", "USER_NOT_FOUND", 404);

  // progres per event
  const joinedEvents = await Promise.all(
    joins.map(async (j) => {
      const [completed, totalActivities] = await Promise.all([
        prisma.activityCompletion.count({ where: { eventId: j.eventId, userId: session.sub } }),
        prisma.activity.count({ where: { eventId: j.eventId } }),
      ]);
      const identity = (j.event.identityJson as { logoEmoji?: string; brand?: string } | null) ?? {};
      return {
        eventId: j.eventId,
        slug: j.event.slug,
        name: j.event.name,
        city: j.event.city,
        emoji: identity.logoEmoji ?? "🎪",
        brand: identity.brand ?? "#1e3a34",
        joinedAt: j.joinedAt,
        completed,
        totalActivities,
        status: j.status,
      };
    }),
  );

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      eidSubject: user.externalIdentities[0]?.providerSubject ?? null,
    },
    summary: { stamps: stamps, xp: xpAgg._sum.amount ?? 0, achievements },
    joinedEvents,
  });
}
