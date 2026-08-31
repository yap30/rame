import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Bundle lengkap event untuk organizer (setup/journey/activity) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "ANALYTICS");
  if (!guard.ok) return guardError(guard);

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organization: true,
      venue: true,
      communities: { include: { community: true } },
      mediaPartners: { include: { mediaPartner: true } },
      journey: { include: { nodes: { orderBy: { position: "asc" }, include: { activity: true } } } },
      activities: { orderBy: { sortOrder: "asc" }, include: { stamp: true, achievement: true } },
      stamps: { orderBy: { sortOrder: "asc" } },
      achievements: { orderBy: { sortOrder: "asc" } },
      credentialConfig: true,
      feedbackForm: { include: { questions: { orderBy: { sortOrder: "asc" } } } },
      scannerDevices: true,
    },
  });
  if (!event) return guardError({ ok: false, status: 404, code: "EVENT_NOT_FOUND", message: "Event tidak ditemukan." });

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
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      identity: event.identityJson ?? {},
      venue: event.venue,
      organization: event.organization,
      communities: event.communities.map((c) => c.community),
      mediaPartners: event.mediaPartners.map((m) => m.mediaPartner),
      userRole: guard.orgRole,
    },
    journey: event.journey,
    activities: event.activities,
    stamps: event.stamps,
    achievements: event.achievements,
    credentialConfig: event.credentialConfig,
    feedbackForm: event.feedbackForm,
    scannerDevices: event.scannerDevices,
  });
}

/** Update pengaturan event (PATCH) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "CREATE_EVENT");
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
  if (body.name) data.name = String(body.name);
  if ("tagline" in body) data.tagline = str(body.tagline);
  if ("description" in body) data.description = str(body.description);
  if ("story" in body) data.story = str(body.story);
  if ("city" in body) data.city = str(body.city);
  if (body.journeyMode) data.journeyMode = String(body.journeyMode);
  if ("status" in body) data.status = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  if (body.startsAt) data.startsAt = new Date(String(body.startsAt));
  if (body.endsAt) data.endsAt = new Date(String(body.endsAt));
  if (body.identity && typeof body.identity === "object") data.identityJson = body.identity as object;
  if (body.venueName && typeof body.venueName === "string") {
    const venue = await prisma.venue.findFirst({ where: { name: body.venueName } });
    if (venue) data.venueId = venue.id;
  }

  const event = await prisma.event.update({ where: { id }, data });
  return Response.json({ event: { id: event.id, slug: event.slug, status: event.status } });
}
