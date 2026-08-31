// ============================================================
// RAME — mesin gamification (blueprint §9)
// Reward: XP, stamp kustom, achievement, kelayakan kredensial.
// Idempotensi: seluruh reward memakai idempotency key.
// ============================================================
import prisma from "./db";
import { LOG_ACTIONS, ACHIEVEMENT_CONDITIONS } from "./const";
import { logEvent } from "./analytics";
import { evaluateEligibility } from "./credential";

export interface CompleteActivityInput {
  activityId: string;
  userId: string;
  eventId: string;
  method: string;
  dataJson?: unknown;
  idempotencyKey: string;
}

export interface CompletionSummary {
  duplicate: boolean;
  completionId: string;
  xp: number;
  stamp: { id: string; name: string; emoji: string } | null;
  achievementsUnlocked: { id: string; name: string; emoji: string }[];
  credentialEligible: boolean;
  activityTitle: string;
}

export async function completeActivity(input: CompleteActivityInput): Promise<CompletionSummary> {
  const existing = await prisma.activityCompletion.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    const summary = await summarize(existing.activityId, input.userId, input.eventId);
    return { ...summary, duplicate: true };
  }

  const activity = await prisma.activity.findUnique({
    where: { id: input.activityId },
    include: { stamp: true },
  });
  if (!activity) throw new Error("ACTIVITY_NOT_FOUND");
  if (activity.eventId !== input.eventId) throw new Error("EVENT_MISMATCH");

  // aktivitas dengan verifikasi panitia: HANYA jalur scan (QR_VERIFY) yang boleh
  // menyelesaikan — partisipan tidak bisa self-complete (blueprint: verifikasi).
  if (activity.verificationRequired && input.method !== "QR_VERIFY") {
    throw new Error("VERIFICATION_REQUIRED");
  }

  // kebijakan pengulangan
  if (!activity.repeatable) {
    const done = await prisma.activityCompletion.findFirst({
      where: { activityId: input.activityId, userId: input.userId },
    });
    if (done) {
      const summary = await summarize(input.activityId, input.userId, input.eventId);
      return { ...summary, duplicate: true };
    }
  }

  // jendela ketersediaan
  const now = new Date();
  if (activity.availabilityStartsAt && now < activity.availabilityStartsAt) throw new Error("ACTIVITY_NOT_OPEN");
  if (activity.availabilityEndsAt && now > activity.availabilityEndsAt) throw new Error("ACTIVITY_CLOSED");

  return prisma.$transaction(async (tx) => {
    const completion = await tx.activityCompletion.create({
      data: {
        activityId: input.activityId,
        eventId: input.eventId,
        userId: input.userId,
        method: input.method,
        idempotencyKey: input.idempotencyKey,
        dataJson: (input.dataJson ?? {}) as object,
      },
    });

    let xp = 0;
    let stamp: CompletionSummary["stamp"] = null;

    if (activity.xpReward > 0) {
      await tx.xpTransaction.create({
        data: {
          userId: input.userId,
          eventId: input.eventId,
          amount: activity.xpReward,
          reason: `Aktivitas: ${activity.title}`,
          refId: completion.id,
          idempotencyKey: `xp:${input.idempotencyKey}`,
        },
      });
      xp = activity.xpReward;
      await tx.eventLog.create({
        data: { eventId: input.eventId, userId: input.userId, actorType: "SYSTEM", action: LOG_ACTIONS.XP_AWARDED, dataJson: { amount: xp, activityId: activity.id } },
      });
    }

    if (activity.stampId && activity.stamp) {
      await tx.participantStamp.create({
        data: {
          userId: input.userId,
          stampId: activity.stampId,
          eventId: input.eventId,
          completionId: completion.id,
          idempotencyKey: `stamp:${input.idempotencyKey}`,
        },
      });
      stamp = { id: activity.stamp.id, name: activity.stamp.name, emoji: activity.stamp.emoji };
      await tx.eventLog.create({
        data: { eventId: input.eventId, userId: input.userId, actorType: "SYSTEM", action: LOG_ACTIONS.STAMP_AWARDED, dataJson: { stampId: activity.stampId, stamp: stamp.name } },
      });
    }

    await tx.eventLog.create({
      data: {
        eventId: input.eventId,
        userId: input.userId,
        actorType: "PARTICIPANT",
        action: LOG_ACTIONS.ACTIVITY_COMPLETED,
        dataJson: { activityId: activity.id, method: input.method },
      },
    });

    // achievement
    const achievementsUnlocked = await checkAchievementsTx(tx, input.userId, input.eventId);

    // kelayakan kredensial
    let credentialEligible = false;
    try {
      const elig = await evaluateEligibility(input.eventId, input.userId);
      credentialEligible = elig.eligible;
    } catch {
      credentialEligible = false;
    }

    return { duplicate: false, completionId: completion.id, xp, stamp, achievementsUnlocked, credentialEligible, activityTitle: activity.title };
  });
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function checkAchievementsTx(tx: Tx, userId: string, eventId: string) {
  const [achievements, completions, stamps, awarded] = await Promise.all([
    tx.achievement.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } }),
    tx.activityCompletion.findMany({ where: { eventId, userId }, select: { activityId: true } }),
    tx.participantStamp.findMany({ where: { eventId, userId }, select: { stampId: true } }),
    tx.participantAchievement.findMany({ where: { eventId, userId }, select: { achievementId: true } }),
  ]);

  const totalActivities = await tx.activity.count({ where: { eventId } });
  const awardedIds = new Set(awarded.map((a) => a.achievementId));
  const unlocked: { id: string; name: string; emoji: string }[] = [];

  for (const ach of achievements) {
    if (awardedIds.has(ach.id)) continue;
    let met = false;
    if (ach.conditionType === ACHIEVEMENT_CONDITIONS.ALL_ACTIVITIES) {
      met = totalActivities > 0 && completions.length >= totalActivities;
    } else if (ach.conditionType === ACHIEVEMENT_CONDITIONS.N_ACTIVITIES) {
      met = completions.length >= ach.conditionValue;
    } else if (ach.conditionType === ACHIEVEMENT_CONDITIONS.STAMPS_COUNT) {
      met = new Set(stamps.map((s) => s.stampId)).size >= ach.conditionValue;
    } else if (ach.conditionType === ACHIEVEMENT_CONDITIONS.CUSTOM) {
      met = completions.length >= Math.max(1, ach.conditionValue);
    }
    if (met) {
      await tx.participantAchievement.create({
        data: { userId, achievementId: ach.id, eventId, idempotencyKey: `ach:${userId}:${ach.id}` },
      });
      await tx.eventLog.create({
        data: { eventId, userId, actorType: "SYSTEM", action: LOG_ACTIONS.ACHIEVEMENT_UNLOCKED, dataJson: { achievementId: ach.id, name: ach.name } },
      });
      unlocked.push({ id: ach.id, name: ach.name, emoji: ach.emoji });
    }
  }
  return unlocked;
}

async function summarize(activityId: string, userId: string, eventId: string): Promise<Omit<CompletionSummary, "duplicate">> {
  const [completion, xpAgg, stamp, achievements] = await Promise.all([
    prisma.activityCompletion.findFirst({ where: { activityId, userId } }),
    prisma.xpTransaction.aggregate({ where: { userId, eventId }, _sum: { amount: true } }),
    prisma.participantStamp.findFirst({ where: { eventId, userId }, include: { stamp: true } }),
    prisma.participantAchievement.findMany({ where: { eventId, userId }, include: { achievement: true } }),
  ]);
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  return {
    completionId: completion?.id ?? "",
    xp: xpAgg._sum.amount ?? 0,
    stamp: stamp ? { id: stamp.stamp.id, name: stamp.stamp.name, emoji: stamp.stamp.emoji } : null,
    achievementsUnlocked: achievements.map((a) => ({ id: a.achievement.id, name: a.achievement.name, emoji: a.achievement.emoji })),
    credentialEligible: false,
    activityTitle: activity?.title ?? "",
  };
}
