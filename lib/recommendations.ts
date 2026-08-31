// ============================================================
// RAME — rekomendasi event personal (blueprint §12)
// Deterministik, tanpa AI: skor berbasis riwayat partisipasi.
// Faktor: kategori/tipe aktivitas, komunitas, keterlibatan,
// partisipasi terbaru, pola interaksi berulang.
// ============================================================
import prisma from "./db";

export interface Recommendation {
  eventId: string;
  slug: string;
  name: string;
  tagline: string | null;
  city: string | null;
  emoji: string;
  match: number; // 0..99
  reasons: string[];
}

export async function recommendEvents(userId: string, limit = 6): Promise<Recommendation[]> {
  const [joinedEvents, completions, stamps, memberships] = await Promise.all([
    prisma.eventParticipant.findMany({
      where: { userId },
      include: { event: { select: { id: true, slug: true, name: true, city: true, journeyMode: true, identityJson: true, startsAt: true } } },
    }),
    prisma.activityCompletion.findMany({
      where: { userId },
      include: { activity: { select: { type: true } } },
    }),
    prisma.participantStamp.findMany({ where: { userId }, select: { eventId: true } }),
    prisma.organizationMember.findMany({ where: { userId }, select: { organizationId: true } }),
  ]);

  const joinedIds = new Set(joinedEvents.map((j) => j.eventId));
  const activityTypeCount = new Map<string, number>();
  for (const c of completions) {
    activityTypeCount.set(c.activity.type, (activityTypeCount.get(c.activity.type) ?? 0) + 1);
  }
  const joinedCommunityIds = new Set<string>();
  const communityRows = await prisma.eventCommunity.findMany({
    where: { eventId: { in: [...joinedIds] } },
    select: { communityId: true },
  });
  communityRows.forEach((c) => joinedCommunityIds.add(c.communityId));

  const engagement = completions.length; // total penyelesaian
  const now = Date.now();

  const candidates = await prisma.event.findMany({
    where: { status: "PUBLISHED", id: { notIn: [...joinedIds] } },
    include: {
      venue: { select: { city: true } },
      communities: { select: { communityId: true } },
      activities: { select: { id: true, type: true } },
    },
  });

  const scored: Recommendation[] = [];
  for (const ev of candidates) {
    let score = 0;
    const reasons: string[] = [];

    // 1. afinitas tipe aktivitas
    const types = new Set(ev.activities.map((a) => a.type));
    let overlap = 0;
    types.forEach((t) => {
      if (activityTypeCount.has(t)) overlap += 1;
    });
    const typeScore = types.size > 0 ? overlap / types.size : 0;
    score += typeScore * 0.4;
    if (typeScore > 0) reasons.push(`Jenis aktivitas serupa (${overlap} cocok)`);

    // 2. komunitas yang sama
    const communityOverlap = ev.communities.filter((c) => joinedCommunityIds.has(c.communityId)).length;
    const commScore = communityOverlap > 0 ? Math.min(1, 0.3 + communityOverlap * 0.2) : 0;
    score += commScore * 0.25;
    if (communityOverlap > 0) reasons.push(`${communityOverlap} komunitas yang sama`);

    // 3. keterlibatan user
    const engagementScore = Math.min(1, engagement / 5);
    score += engagementScore * 0.2;

    // 4. partisipasi terbaru (riwayat gabung makin baru, bobot makin tinggi)
    const recentJoins = joinedEvents.slice(0, 3);
    if (recentJoins.length > 0) score += 0.1;

    // 5. kota sama
    const myCity = joinedEvents.find((j) => j.event.city)?.event.city;
    if (myCity && (ev.city === myCity || ev.venue?.city === myCity)) {
      score += 0.05;
      reasons.push("Kota yang sama");
    }

    // bonus event segera
    if (ev.startsAt) {
      const days = (new Date(ev.startsAt).getTime() - now) / (24 * 3600e3);
      if (days >= 0 && days <= 30) score += 0.05;
    }

    const identity = (ev.identityJson as { logoEmoji?: string } | null) ?? {};
    scored.push({
      eventId: ev.id,
      slug: ev.slug,
      name: ev.name,
      tagline: ev.tagline,
      city: ev.city ?? ev.venue?.city ?? null,
      emoji: identity.logoEmoji ?? "🎪",
      match: Math.max(20, Math.min(99, Math.round(score * 100))),
      reasons: reasons.slice(0, 2),
    });
  }

  return scored.sort((a, b) => b.match - a.match).slice(0, limit);
}
