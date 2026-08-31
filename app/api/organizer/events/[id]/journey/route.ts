import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Simpan journey (POST /api/organizer/events/{id}/journey).
 * Body: { mode?, nodes: [{ activityId, position }], edges: [{ from, to, required }] }
 * Susunan ulang = hapus node lama & buat ulang sesuai urutan.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "MANAGE_JOURNEY");
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as {
    mode?: string;
    nodes?: { activityId: string; position: number; titleOverride?: string; descriptionOverride?: string }[];
    edges?: { from: string; to: string; required?: boolean; label?: string }[];
  };

  const journey = await prisma.journey.findUnique({ where: { eventId: id } });
  if (!journey) return guardError({ ok: false, status: 404, code: "JOURNEY_NOT_FOUND", message: "Journey tidak ditemukan." });

  await prisma.$transaction(async (tx) => {
    await tx.journeyEdge.deleteMany({ where: { journeyId: journey.id } });
    await tx.journeyNode.deleteMany({ where: { journeyId: journey.id } });

    if (body.mode) await tx.journey.update({ where: { id: journey.id }, data: { mode: body.mode } });

    const nodeIdByActivity = new Map<string, string>();
    const nodes = body.nodes ?? [];
    for (const n of nodes) {
      const node = await tx.journeyNode.create({
        data: {
          journeyId: journey.id,
          activityId: n.activityId,
          position: n.position,
          titleOverride: n.titleOverride ?? null,
          descriptionOverride: n.descriptionOverride ?? null,
        },
      });
      nodeIdByActivity.set(n.activityId, node.id);
    }
    for (const e of body.edges ?? []) {
      const from = nodeIdByActivity.get(e.from);
      const to = nodeIdByActivity.get(e.to);
      if (from && to) {
        await tx.journeyEdge.create({
          data: { journeyId: journey.id, fromNodeId: from, toNodeId: to, required: e.required ?? true, label: e.label ?? null },
        });
      }
    }
  });

  return Response.json({ saved: true });
}
