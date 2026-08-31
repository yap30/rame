import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Update aktivitas (PATCH) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) return guardError({ ok: false, status: 404, code: "ACTIVITY_NOT_FOUND", message: "Aktivitas tidak ditemukan." });

  const guard = await requireCapability(activity.eventId, "CREATE_ACTIVITY");
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.title) data.title = String(body.title);
  if ("description" in body) data.description = body.description ? String(body.description) : null;
  if (body.type) data.type = String(body.type);
  if (body.completionMethod) data.completionMethod = String(body.completionMethod);
  if ("verificationRequired" in body) data.verificationRequired = Boolean(body.verificationRequired);
  if ("repeatable" in body) data.repeatable = Boolean(body.repeatable);
  if ("xpReward" in body) data.xpReward = Number(body.xpReward ?? 0);
  if (body.icon) data.icon = String(body.icon);
  if (body.config && typeof body.config === "object") data.configJson = body.config as object;
  if ("stampId" in body) data.stampId = body.stampId ? String(body.stampId) : null;

  const updated = await prisma.activity.update({ where: { id }, data });
  return Response.json({ activity: { id: updated.id, title: updated.title } });
}

/** Hapus aktivitas (DELETE) */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) return guardError({ ok: false, status: 404, code: "ACTIVITY_NOT_FOUND", message: "Aktivitas tidak ditemukan." });

  const guard = await requireCapability(activity.eventId, "CREATE_ACTIVITY");
  if (!guard.ok) return guardError(guard);

  await prisma.journeyNode.deleteMany({ where: { activityId: id } });
  await prisma.activity.delete({ where: { id } });
  return Response.json({ deleted: true });
}
