import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Otorisasi perangkat scanner (POST .../scanner/{deviceId}/authorize) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; deviceId: string }> }) {
  const { id, deviceId } = await params;
  const guard = await requireCapability(id, "SCANNER");
  if (!guard.ok) return guardError(guard);

  const device = await prisma.scannerDevice.findUnique({ where: { id: deviceId } });
  if (!device || device.eventId !== id) {
    return guardError({ ok: false, status: 404, code: "DEVICE_NOT_FOUND", message: "Perangkat tidak ditemukan." });
  }

  const updated = await prisma.scannerDevice.update({
    where: { id: deviceId },
    data: { authorizedByUserId: guard.session.sub, authorizedAt: new Date() },
  });
  return Response.json({ device: { id: updated.id, name: updated.name, authorizedAt: updated.authorizedAt } });
}
