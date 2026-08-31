import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Buat aktivitas baru (POST /api/organizer/events/{id}/activities) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "CREATE_ACTIVITY");
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    type?: string;
    completionMethod?: string;
    verificationRequired?: boolean;
    repeatable?: boolean;
    xpReward?: number;
    icon?: string;
    config?: Record<string, unknown>;
    templateId?: string;
  };

  if (!body.title) return guardError({ ok: false, status: 400, code: "TITLE_REQUIRED", message: "Judul aktivitas wajib diisi." });

  const count = await prisma.activity.count({ where: { eventId: id } });
  const activity = await prisma.activity.create({
    data: {
      eventId: id,
      title: body.title,
      description: body.description ?? null,
      type: body.type ?? "CUSTOM",
      completionMethod: body.completionMethod ?? "AUTO",
      verificationRequired: Boolean(body.verificationRequired),
      repeatable: Boolean(body.repeatable),
      xpReward: Number(body.xpReward ?? 0),
      icon: body.icon ?? "🎯",
      sortOrder: count,
      configJson: (body.config ?? {}) as object,
    },
  });

  // tambahkan ke journey
  const journey = await prisma.journey.findUnique({ where: { eventId: id } });
  if (journey) {
    const position = await prisma.journeyNode.count({ where: { journeyId: journey.id } });
    await prisma.journeyNode.create({ data: { journeyId: journey.id, activityId: activity.id, position } });
  }

  return Response.json({ activity: { id: activity.id, title: activity.title, sortOrder: activity.sortOrder } });
}
