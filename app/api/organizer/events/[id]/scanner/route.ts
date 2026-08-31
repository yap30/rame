import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/** Daftar perangkat scanner event */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "SCANNER");
  if (!guard.ok) return guardError(guard);

  const devices = await prisma.scannerDevice.findMany({ where: { eventId: id }, orderBy: { createdAt: "asc" } });
  return Response.json({ devices });
}

/** Daftarkan perangkat scanner baru */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "SCANNER");
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const device = await prisma.scannerDevice.create({
    data: {
      eventId: id,
      name: body.name ?? "Scanner baru",
      deviceCode: `SCAN-${randomUUID().slice(0, 8).toUpperCase()}`,
    },
  });
  return Response.json({ device: { id: device.id, name: device.name, deviceCode: device.deviceCode, authorizedAt: device.authorizedAt } });
}
