import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Publikasikan / tarik draft event */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "CREATE_EVENT");
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const event = await prisma.event.update({ where: { id }, data: { status } });
  return Response.json({ event: { id: event.id, status: event.status } });
}
