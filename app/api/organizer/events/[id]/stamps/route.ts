import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Buat stempel kustom untuk event (EO) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "CREATE_EVENT");
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as { name?: string; emoji?: string };
  const name = (body.name ?? "").trim();
  if (!name) return guardError({ ok: false, status: 400, code: "NAME_REQUIRED", message: "Nama stempel wajib diisi." });

  const count = await prisma.stamp.count({ where: { eventId: id } });
  const stamp = await prisma.stamp.create({
    data: {
      eventId: id,
      name,
      emoji: body.emoji?.trim() || "📮",
      rarity: 0,
      sortOrder: count,
    },
  });

  return Response.json({ stamp: { id: stamp.id, name: stamp.name, emoji: stamp.emoji } });
}
