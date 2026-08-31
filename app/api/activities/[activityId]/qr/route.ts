import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";
import { createQrSession } from "@/lib/qr";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/**
 * Buat QR dinamis untuk aktivitas (verifikasi QR).
 * QR singkat (TTL), sekali pakai, terikat event/aktivitas/partisipan.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);

  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) return apiError("Aktivitas tidak ditemukan.", "ACTIVITY_NOT_FOUND", 404);

  // sesi bisa menunjuk user yang sudah terhapus (mis. setelah reseed) → cek eksistensi
  if (!(await prisma.user.findUnique({ where: { id: session.sub } }))) {
    return apiError("Sesi tidak valid — silakan masuk ulang.", "SESSION_INVALID", 401);
  }

  const joined = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId: activity.eventId, userId: session.sub } },
  });
  if (!joined) return apiError("Gabung event terlebih dahulu.", "NOT_JOINED", 403);

  // sekali pakai: aktivitas non-repeatable yang sudah selesai tidak boleh buat QR
  if (!activity.repeatable) {
    const done = await prisma.activityCompletion.findFirst({ where: { activityId, userId: session.sub } });
    if (done) return apiError("Aktivitas sudah diselesaikan.", "ALREADY_COMPLETED", 409);
  }

  const { payload, expiresAt } = await createQrSession(activityId, session.sub, activity.eventId);
  const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#1e3a34", light: "#ffffff" },
  });

  return Response.json({
    qr: dataUrl,
    payload: JSON.stringify(payload),
    expiresAt,
    ttlSeconds: Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)),
  });
}
