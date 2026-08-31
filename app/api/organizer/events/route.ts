import { NextRequest } from "next/server";
import { requireOrgUser, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";
import { manageableEvents } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Daftar event yang bisa dikelola (GET) */
export async function GET() {
  const guard = await requireOrgUser();
  if (!guard.ok) return guardError(guard);
  const events = await manageableEvents(guard.session.sub);
  return Response.json({ events });
}

/** Buat event baru (POST) — hanya EO/ADMIN */
export async function POST(req: NextRequest) {
  const guard = await requireOrgUser();
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
    tagline?: string;
    description?: string;
    story?: string;
    city?: string;
    journeyMode?: string;
    pricingModel?: string;
    price?: number | null;
    quota?: number | null;
    venueName?: string;
    identity?: Record<string, unknown>;
    status?: string;
  };

  if (!body.name) return guardError({ ok: false, status: 400, code: "NAME_REQUIRED", message: "Nama event wajib diisi." });

  // EO harus punya membership di organisasi mana pun
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: guard.session.sub, role: { in: ["EO", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, role: true },
  });
  if (!membership) {
    return guardError({ ok: false, status: 403, code: "FORBIDDEN", message: "Butuh peran EO di sebuah organisasi untuk membuat event." });
  }

  const slug = body.slug?.toLowerCase().replace(/[^a-z0-9-]/g, "-") || `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

  // venue: pakai yang ada atau buat baru
  let venueId = "";
  if (body.venueName) {
    const existing = await prisma.venue.findFirst({ where: { name: body.venueName, city: body.city ?? undefined } });
    if (existing) venueId = existing.id;
    else {
      const v = await prisma.venue.create({ data: { name: body.venueName, city: body.city } });
      venueId = v.id;
    }
  }

  const event = await prisma.event.create({
    data: {
      slug,
      name: body.name,
      tagline: body.tagline ?? null,
      description: body.description ?? null,
      story: body.story ?? null,
      city: body.city ?? null,
      journeyMode: body.journeyMode ?? "HYBRID",
      pricingModel: body.pricingModel === "PAID" ? "PAID" : "FREE",
      price: body.pricingModel === "PAID" ? Math.max(0, Number(body.price) || 0) : null,
      quota: body.quota != null && Number(body.quota) > 0 ? Math.floor(Number(body.quota)) : null,
      status: body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      organizationId: membership.organizationId,
      venueId: venueId || (await prisma.venue.create({ data: { name: "Belum diatur", city: body.city } })).id,
      identityJson: (body.identity ?? {
        eventShortName: body.name,
        logoEmoji: "🎪",
        brand: "#1e3a34",
        brandSoft: "#e4ece5",
        brandInk: "#ffffff",
        accent: "#d97706",
        accentSoft: "#fdf0dc",
        gold: "#b98a1a",
        ink: "#22302c",
        paper: "#f8f4ea",
      }) as object,
    },
  });
  await prisma.journey.create({ data: { eventId: event.id, mode: event.journeyMode, title: "Journey Utama" } });

  return Response.json({ event: { id: event.id, slug: event.slug, name: event.name, status: event.status } });
}
