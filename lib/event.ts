// ============================================================
// RAME — helper lookup & serialisasi event
// ============================================================
import prisma from "./db";

export async function findEventByIdOrSlug(idOrSlug: string) {
  return prisma.event.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
  });
}

export interface EventCard {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  city: string | null;
  status: string;
  journeyMode: string;
  startsAt: Date | null;
  endsAt: Date | null;
  logoEmoji: string;
  brand: string;
  organizerName: string;
  venueName: string;
  participants: number;
  activityCount: number;
}

export async function listEventCards(statuses: string[] = ["PUBLISHED"]): Promise<EventCard[]> {
  const events = await prisma.event.findMany({
    where: { status: { in: statuses } },
    orderBy: { startsAt: "asc" },
    include: {
      organization: { select: { name: true } },
      venue: { select: { name: true, city: true } },
      _count: { select: { participants: true, activities: true } },
    },
  });
  return events.map((ev) => {
    const identity = (ev.identityJson as { logoEmoji?: string; brand?: string } | null) ?? {};
    return {
      id: ev.id,
      slug: ev.slug,
      name: ev.name,
      tagline: ev.tagline,
      description: ev.description,
      city: ev.city ?? ev.venue?.city ?? null,
      status: ev.status,
      journeyMode: ev.journeyMode,
      startsAt: ev.startsAt,
      endsAt: ev.endsAt,
      logoEmoji: identity.logoEmoji ?? "🎪",
      brand: identity.brand ?? "#1e3a34",
      organizerName: ev.organization.name,
      venueName: ev.venue?.name ?? "",
      participants: ev._count.participants,
      activityCount: ev._count.activities,
    };
  });
}
