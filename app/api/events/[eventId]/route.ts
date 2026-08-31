import { NextRequest } from "next/server";
import { findEventByIdOrSlug } from "@/lib/event";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";
import { JOURNEY_MODE_LABEL } from "@/lib/const";

const CONFIRMED_STATUSES = ["JOINED", "COMPLETED"];

export const dynamic = "force-dynamic";

/** Detail event + bundle untuk participant (story, journey, stamps, achievement, credential, feedback) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await findEventByIdOrSlug(eventId);
  if (!event) return apiError("Event tidak ditemukan.", "EVENT_NOT_FOUND", 404);

  const session = await readSession();
  const me = session ? { id: session.sub, role: session.role } : null;

  const [credentialConfig, feedbackForm] = await Promise.all([
    prisma.credentialConfig.findUnique({ where: { eventId: event.id } }),
    prisma.feedbackForm.findUnique({ where: { eventId: event.id }, include: { questions: { orderBy: { sortOrder: "asc" } } } }),
  ]);

  const [journey, stamps, achievements, participantCount, confirmedCount, waitlistCount, myParticipation, myCompletions, myStamps, myAchievements, myIssuance, myFeedback] =
    await Promise.all([
      prisma.journey.findUnique({
        where: { eventId: event.id },
        include: {
          nodes: { orderBy: { position: "asc" }, include: { activity: { include: { stamp: true } }, edgesFrom: true, edgesTo: true } },
        },
      }),
      prisma.stamp.findMany({ where: { eventId: event.id }, orderBy: { sortOrder: "asc" } }),
      prisma.achievement.findMany({ where: { eventId: event.id }, orderBy: { sortOrder: "asc" } }),
      prisma.eventParticipant.count({ where: { eventId: event.id } }),
      prisma.eventParticipant.count({ where: { eventId: event.id, status: { in: ["JOINED", "COMPLETED"] } } }),
      prisma.eventParticipant.count({ where: { eventId: event.id, status: "WAITLIST" } }),
      me ? prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId: event.id, userId: me.id } } }) : null,
      me ? prisma.activityCompletion.findMany({ where: { eventId: event.id, userId: me.id } }) : [],
      me ? prisma.participantStamp.findMany({ where: { eventId: event.id, userId: me.id } }) : [],
      me ? prisma.participantAchievement.findMany({ where: { eventId: event.id, userId: me.id } }) : [],
      me && credentialConfig
        ? prisma.credentialIssuance.findUnique({ where: { credentialConfigId_userId: { credentialConfigId: credentialConfig.id, userId: me.id } } })
        : null,
      me && feedbackForm ? prisma.feedbackResponse.findUnique({ where: { formId_userId: { formId: feedbackForm.id, userId: me.id } } }) : null,
    ]);

  const [communities, mediaPartners, venue, organization] = await Promise.all([
    prisma.eventCommunity.findMany({ where: { eventId: event.id }, include: { community: true } }),
    prisma.eventMediaPartner.findMany({ where: { eventId: event.id }, include: { mediaPartner: true } }),
    prisma.venue.findUnique({ where: { id: event.venueId } }),
    prisma.organization.findUnique({ where: { id: event.organizationId } }),
  ]);

  // status tiap aktivitas + kunci dependensi sederhana
  const completedActivityIds = new Set(myCompletions.map((c) => c.activityId));
  const nodes = journey?.nodes ?? [];
  const activityStatus = new Map<string, { done: boolean; locked: boolean }>();
  let sawIncomplete = false;
  for (const node of nodes) {
    const done = completedActivityIds.has(node.activityId);
    activityStatus.set(node.activityId, { done, locked: sawIncomplete && event.journeyMode !== "FREE_EXPLORATION" });
    if (!done) sawIncomplete = true;
  }

  return Response.json({
    event: {
      id: event.id,
      slug: event.slug,
      name: event.name,
      tagline: event.tagline,
      description: event.description,
      story: event.story,
      city: event.city,
      status: event.status,
      journeyMode: event.journeyMode,
      journeyModeLabel: JOURNEY_MODE_LABEL[event.journeyMode] ?? event.journeyMode,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      identity: event.identityJson ?? {},
      coverUrl: event.coverUrl,
      venue: venue ? { id: venue.id, name: venue.name, address: venue.address, city: venue.city } : null,
      organization: organization ? { id: organization.id, name: organization.name, description: organization.description } : null,
      communities: communities.map((c) => ({ id: c.community.id, name: c.community.name })),
      mediaPartners: mediaPartners.map((m) => ({ id: m.mediaPartner.id, name: m.mediaPartner.name, url: m.mediaPartner.url })),
      participants: participantCount,
      confirmedCount,
      waitlistCount,
      pricing: { model: event.pricingModel, price: event.price },
      quota: event.quota,
      joined: myParticipation ? CONFIRMED_STATUSES.includes(myParticipation.status) : false,
      waitlisted: myParticipation?.status === "WAITLIST",
      participationStatus: myParticipation?.status ?? null,
      joinedAt: myParticipation?.joinedAt ?? null,
    },
    journey: journey
      ? {
          id: journey.id,
          mode: journey.mode,
          title: journey.title,
          nodes: nodes.map((n) => ({
            id: n.id,
            position: n.position,
            activityId: n.activityId,
            title: n.titleOverride ?? n.activity.title,
            description: n.descriptionOverride ?? n.activity.description,
            icon: n.activity.icon,
            xpReward: n.activity.xpReward,
            stamp: n.activity.stamp ? { id: n.activity.stamp.id, name: n.activity.stamp.name, emoji: n.activity.stamp.emoji } : null,
            done: activityStatus.get(n.activityId)?.done ?? false,
            locked: activityStatus.get(n.activityId)?.locked ?? false,
          })),
          edges: (journey.nodes.flatMap((n) => n.edgesFrom.map((e) => ({ from: e.fromNodeId, to: e.toNodeId, required: e.required, label: e.label })))),
        }
      : null,
    stamps: stamps.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      emoji: s.emoji,
      color: s.color,
      rarity: s.rarity,
      collected: me ? myStamps.some((ms) => ms.stampId === s.id) : false,
      collectedAt: me ? myStamps.find((ms) => ms.stampId === s.id)?.awardedAt ?? null : null,
    })),
    achievements: achievements.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      emoji: a.emoji,
      secret: a.secret,
      unlocked: me ? myAchievements.some((ma) => ma.achievementId === a.id) : false,
    })),
    credential: credentialConfig
      ? {
          id: credentialConfig.id,
          enabled: credentialConfig.enabled,
          title: credentialConfig.title,
          description: credentialConfig.description,
          schemaId: credentialConfig.schemaId,
          eligibilityPolicy: credentialConfig.eligibilityPolicy,
          issuerOrgName: credentialConfig.issuerOrgName,
          status: myIssuance?.status ?? (me ? "ELIGIBLE_PENDING_CHECK" : null),
          providerReference: myIssuance?.providerReference ?? null,
        }
      : null,
    feedback: feedbackForm
      ? {
          id: feedbackForm.id,
          title: feedbackForm.title,
          description: feedbackForm.description,
          required: feedbackForm.required,
          submitted: Boolean(myFeedback),
          questions: feedbackForm.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            type: q.type,
            required: q.required,
            options: ((q.optionsJson as { options?: string[] } | null)?.options) ?? [],
          })),
        }
      : null,
    progress: me
      ? {
          completed: myCompletions.length,
          total: nodes.length,
          xp: (await prisma.xpTransaction.aggregate({ where: { eventId: event.id, userId: me.id }, _sum: { amount: true } }))._sum.amount ?? 0,
          stamps: myStamps.length,
        }
      : null,
  });
}
