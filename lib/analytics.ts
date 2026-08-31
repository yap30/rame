// ============================================================
// RAME — analytics: event log, metrik, insight berbasis aturan,
// dan event replay (blueprint §11). Deterministik, tanpa AI.
// ============================================================
import prisma from "./db";
import { LOG_ACTIONS } from "./const";

export async function logEvent(
  eventId: string,
  userId: string | null,
  actorType: string,
  action: string,
  dataJson?: unknown,
) {
  return prisma.eventLog.create({
    data: { eventId, userId, actorType, action, dataJson: (dataJson ?? {}) as object },
  });
}

// ---------- Metrik ----------

export interface EventAnalytics {
  eventId: string;
  totalParticipants: number;
  totalCompletions: number;
  completedParticipants: number;
  completionRate: number; // 0..1
  totalStamps: number;
  totalXp: number;
  avgXp: number;
  feedbackScore: number | null;
  feedbackCount: number;
  verifyFailures: number;
  verifySuccess: number;
  verifyFailureRate: number; // 0..1
  rewardDist: { stampId: string; name: string; emoji: string; count: number }[];
  dropOff: { position: number; title: string; icon: string; completed: number; rate: number }[];
  activityPerf: { activityId: string; title: string; icon: string; completed: number; started: number; rate: number }[];
  xpDist: { userId: string; name: string; xp: number }[];
}

export async function computeAnalytics(eventId: string): Promise<EventAnalytics> {
  const [joined, completions, stampRows, xpAgg, feedbackAgg, rejectLogs, verifySuccess, nodes, startedLogs] = await Promise.all([
    prisma.eventParticipant.count({ where: { eventId } }),
    prisma.activityCompletion.count({ where: { eventId } }),
    prisma.participantStamp.findMany({ where: { eventId }, include: { stamp: true } }),
    prisma.xpTransaction.aggregate({ where: { eventId }, _sum: { amount: true } }),
    prisma.feedbackAnswer.findMany({
      where: { response: { eventId }, question: { type: "RATING" } },
      include: { question: true },
    }),
    prisma.eventLog.count({ where: { eventId, action: LOG_ACTIONS.SCAN_REJECTED } }),
    prisma.eventLog.count({ where: { eventId, action: LOG_ACTIONS.VERIFICATION_COMPLETED } }),
    prisma.journeyNode.findMany({
      where: { journey: { eventId } },
      orderBy: { position: "asc" },
      include: { activity: { select: { id: true, title: true, icon: true } } },
    }),
    prisma.eventLog.findMany({ where: { eventId, action: LOG_ACTIONS.ACTIVITY_STARTED }, select: { dataJson: true } }),
  ]);

  const completedParticipants = await prisma.activityCompletion.groupBy({
    by: ["userId"],
    where: { eventId },
    _count: true,
  });

  const startCounts = new Map<string, number>();
  for (const s of startedLogs) {
    const aid = (s.dataJson as { activityId?: string } | null)?.activityId;
    if (aid) startCounts.set(aid, (startCounts.get(aid) ?? 0) + 1);
  }

  const perActivityCounts = new Map<string, number>();
  const compRows = await prisma.activityCompletion.groupBy({ by: ["activityId"], where: { eventId }, _count: true });
  for (const c of compRows) perActivityCounts.set(c.activityId, c._count);

  const rewardDist = new Map<string, { stampId: string; name: string; emoji: string; count: number }>();
  for (const ps of stampRows) {
    const key = ps.stampId;
    const cur = rewardDist.get(key) ?? { stampId: ps.stampId, name: ps.stamp.name, emoji: ps.stamp.emoji, count: 0 };
    cur.count += 1;
    rewardDist.set(key, cur);
  }

  const dropOff: EventAnalytics["dropOff"] = nodes.map((n, idx) => {
    const completed = perActivityCounts.get(n.activity.id) ?? 0;
    return { position: idx, title: n.activity.title, icon: n.activity.icon, completed, rate: joined > 0 ? completed / joined : 0 };
  });

  const activityPerf = nodes.map((n) => {
    const completed = perActivityCounts.get(n.activity.id) ?? 0;
    const started = startCounts.get(n.activity.id) ?? completed;
    return { activityId: n.activity.id, title: n.activity.title, icon: n.activity.icon, completed, started, rate: started > 0 ? completed / started : 0 };
  });

  const ratingValues = feedbackAgg.map((a) => Number(a.value)).filter((v) => Number.isFinite(v) && v >= 1 && v <= 5);
  const feedbackScore = ratingValues.length > 0 ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length : null;

  const xpDist = (
    await prisma.xpTransaction.findMany({
      where: { eventId },
      include: { user: { select: { name: true } } },
    })
  ).reduce<Map<string, { userId: string; name: string; xp: number }>>((m, x) => {
    const cur = m.get(x.userId) ?? { userId: x.userId, name: x.user.name, xp: 0 };
    cur.xp += x.amount;
    m.set(x.userId, cur);
    return m;
  }, new Map());

  const totalXp = xpAgg._sum.amount ?? 0;
  const totalStamps = stampRows.length;
  const verifyTotal = verifySuccess + rejectLogs;

  return {
    eventId,
    totalParticipants: joined,
    totalCompletions: completions,
    completedParticipants: completedParticipants.length,
    completionRate: joined > 0 ? completedParticipants.length / joined : 0,
    totalStamps,
    totalXp,
    avgXp: completedParticipants.length > 0 ? Math.round(totalXp / completedParticipants.length) : 0,
    feedbackScore: feedbackScore ? Math.round(feedbackScore * 10) / 10 : null,
    feedbackCount: ratingValues.length,
    verifyFailures: rejectLogs,
    verifySuccess,
    verifyFailureRate: verifyTotal > 0 ? rejectLogs / verifyTotal : 0,
    rewardDist: [...rewardDist.values()].sort((a, b) => b.count - a.count),
    dropOff,
    activityPerf,
    xpDist: [...xpDist.values()].sort((a, b) => b.xp - a.xp).slice(0, 10),
  };
}

// ---------- Insight berbasis aturan ----------

export async function generateInsights(eventId: string) {
  const [analytics, rules] = await Promise.all([
    computeAnalytics(eventId),
    prisma.insightRule.findMany({ where: { enabled: true } }),
  ]);
  const insights: { title: string; body: string; severity: string; ruleId: string; dataJson: object }[] = [];

  for (const rule of rules) {
    if (rule.key === "drop_off_gap" && analytics.dropOff.length > 1) {
      const threshold = (rule.thresholdJson as { gapPct?: number } | null)?.gapPct ?? 35;
      for (let i = 1; i < analytics.dropOff.length; i++) {
        const prev = analytics.dropOff[i - 1].completed;
        const cur = analytics.dropOff[i].completed;
        if (prev > 0 && prev - cur > (prev * threshold) / 100) {
          insights.push({
            title: `Penurunan besar di titik "${analytics.dropOff[i].title}"`,
            body: `Penyelesaian turun dari ${prev} ke ${cur} peserta (${Math.round(((prev - cur) / prev) * 100)}%). Periksa antrean atau kejelasan petunjuk di titik ini.`,
            severity: "WARNING",
            ruleId: rule.id,
            dataJson: { position: i, prev, cur },
          });
        }
      }
    }
    if (rule.key === "low_feedback_score" && analytics.feedbackScore !== null) {
      const minScore = (rule.thresholdJson as { minScore?: number } | null)?.minScore ?? 3.5;
      if (analytics.feedbackScore < minScore) {
        insights.push({
          title: `Skor umpan balik rendah (${analytics.feedbackScore}/5)`,
          body: `Rata-rata rating ${analytics.feedbackScore} dari ${analytics.feedbackCount} responden. Pertimbangkan meninjau pengalaman peserta.`,
          severity: "WARNING",
          ruleId: rule.id,
          dataJson: { score: analytics.feedbackScore },
        });
      } else {
        insights.push({
          title: `Skor umpan balik sehat (${analytics.feedbackScore}/5)`,
          body: `Rata-rata rating ${analytics.feedbackScore} dari ${analytics.feedbackCount} responden.`,
          severity: "SUCCESS",
          ruleId: rule.id,
          dataJson: { score: analytics.feedbackScore },
        });
      }
    }
    if (rule.key === "verify_failure_rate" && analytics.verifyFailures > 0) {
      const maxRate = (rule.thresholdJson as { maxRate?: number } | null)?.maxRate ?? 0.15;
      if (analytics.verifyFailureRate > maxRate) {
        insights.push({
          title: `Tingkat kegagalan verifikasi tinggi (${Math.round(analytics.verifyFailureRate * 100)}%)`,
          body: `${analytics.verifyFailures} scan ditolak dari ${analytics.verifyFailures + analytics.verifySuccess} percobaan. QR kedaluwarsa atau perangkat tidak terotorisasi?`,
          severity: "WARNING",
          ruleId: rule.id,
          dataJson: { rate: analytics.verifyFailureRate },
        });
      }
    }
    if (rule.key === "reward_participation" && analytics.totalParticipants > 0) {
      const minRate = (rule.thresholdJson as { minRate?: number } | null)?.minRate ?? 0.3;
      const stampRate = analytics.totalStamps / analytics.totalParticipants;
      if (stampRate < minRate) {
        insights.push({
          title: "Partisipasi stempel masih rendah",
          body: `${Math.round(stampRate * 100)}% peserta sudah menerima stempel. Dorong penyelesaian aktivitas pertama.`,
          severity: "INFO",
          ruleId: rule.id,
          dataJson: { rate: stampRate },
        });
      }
    }
  }

  // simpan fresh (ganti insight lama event ini)
  await prisma.$transaction([
    prisma.insight.deleteMany({ where: { eventId } }),
    ...insights.map((i) => prisma.insight.create({ data: { ...i, eventId } })),
  ]);
  return insights;
}

// ---------- Event replay ----------

export async function replayEvent(eventId: string, limit = 100, offset = 0) {
  const [logs, total] = await Promise.all([
    prisma.eventLog.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.eventLog.count({ where: { eventId } }),
  ]);
  return { logs, total, limit, offset };
}
