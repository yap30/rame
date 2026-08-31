// ============================================================
// RAME — QR dinamis & verifikasi (blueprint §5, §8)
// QR: payload JSON ber-ttl, nonce sekali pakai, terikat event/
// aktivitas/partisipan. Anti-fraud: nonce + expiry + device auth.
// ============================================================
import { randomUUID } from "crypto";
import prisma from "./db";
import { QR_TTL_SECONDS, VERIFY_STATUS } from "./const";
import { completeActivity } from "./gamification";
import { logEvent } from "./analytics";

export interface QrPayload {
  v: 1;
  sid: string; // qr session id
  nonce: string;
  aid: string; // activity id
  eid: string; // event id
  uid: string; // participant id
  exp: number; // epoch ms
}

export async function createQrSession(activityId: string, userId: string, eventId: string) {
  const nonce = randomUUID();
  const sid = randomUUID(); // dipakai sebagai id baris DB DAN payload.sid (harus sama!)
  const expiresAt = new Date(Date.now() + QR_TTL_SECONDS * 1000);
  const payload: QrPayload = {
    v: 1,
    sid,
    nonce,
    aid: activityId,
    eid: eventId,
    uid: userId,
    exp: expiresAt.getTime(),
  };
  await prisma.qrSession.create({
    data: { id: sid, activityId, eventId, userId, nonce, payload: JSON.stringify(payload), expiresAt },
  });
  return { payload, expiresAt };
}

export type ScanResult =
  | { ok: true; status: string; participant: { name: string; email?: string | null }; activityTitle: string; xp: number; stamp: string | null; duplicate: boolean }
  | { ok: false; status: string; reason: string };

function fail(status: string, reason: string): ScanResult {
  return { ok: false, status, reason };
}

/**
 * Verifikasi scan QR online.
 * deviceCode: kode perangkat scanner terotorisasi (atau null utk dev).
 */
export async function verifyQrScan(payloadText: string, deviceCode?: string | null): Promise<ScanResult> {
  let payload: QrPayload;
  try {
    payload = JSON.parse(payloadText) as QrPayload;
    if (!payload.sid || !payload.nonce || !payload.aid || !payload.eid || !payload.exp) throw new Error("bad");
  } catch {
    return fail("INVALID", "QR_INVALID");
  }

  const session = await prisma.qrSession.findUnique({ where: { id: payload.sid } });
  if (!session || session.nonce !== payload.nonce) return fail("INVALID", "QR_INVALID");
  if (session.usedAt) return fail("DUPLICATE", "QR_ALREADY_USED");
  if (session.expiresAt.getTime() < Date.now()) return fail("EXPIRED", "QR_EXPIRED");

  // perangkat scanner harus terotorisasi untuk event ini
  if (deviceCode) {
    const device = await prisma.scannerDevice.findUnique({ where: { deviceCode } });
    if (!device || device.eventId !== session.eventId || !device.authorizedAt) {
      return fail("DEVICE_UNAUTHORIZED", "SCANNER_DEVICE_UNAUTHORIZED");
    }
    await prisma.scannerDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
  }

  const eventId = session.eventId;
  const activityId = session.activityId;

  // tandai terpakai (sebelum proses reward agar anti double-scan)
  const used = await prisma.$transaction(async (tx) => {
    const cur = await tx.qrSession.findUnique({ where: { id: session.id } });
    if (cur?.usedAt) return false;
    await tx.qrSession.update({ where: { id: session.id }, data: { usedAt: new Date() } });
    return true;
  });
  if (!used) return fail("DUPLICATE", "QR_ALREADY_USED");

  try {
    const summary = await completeActivity({
      activityId,
      userId: session.userId,
      eventId,
      method: "QR_VERIFY",
      idempotencyKey: `qr:${session.id}`,
      dataJson: { qrSessionId: session.id, verifiedBy: deviceCode ?? "scanner" },
    });

    const participant = await prisma.user.findUnique({ where: { id: session.userId } });
    const activity = await prisma.activity.findUnique({ where: { id: activityId } });

    await prisma.activityVerification.create({
      data: {
        completionId: summary.completionId || null,
        activityId,
        eventId,
        userId: session.userId,
        method: "ONLINE",
        status: summary.duplicate ? VERIFY_STATUS.DUPLICATE : VERIFY_STATUS.VERIFIED,
        qrSessionId: session.id,
        reason: summary.duplicate ? "ALREADY_COMPLETED" : null,
      },
    });
    await logEvent(eventId, session.userId, "SCANNER", "VERIFICATION_COMPLETED", {
      method: "ONLINE",
      status: summary.duplicate ? VERIFY_STATUS.DUPLICATE : VERIFY_STATUS.VERIFIED,
      deviceCode: deviceCode ?? null,
    });

    return {
      ok: true,
      status: summary.duplicate ? VERIFY_STATUS.DUPLICATE : VERIFY_STATUS.VERIFIED,
      participant: { name: participant?.name ?? "Peserta", email: participant?.email },
      activityTitle: activity?.title ?? summary.activityTitle,
      xp: summary.xp,
      stamp: summary.stamp?.name ?? null,
      duplicate: summary.duplicate,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNKNOWN";
    // kembalikan session (belum berhasil) agar bisa discan ulang
    await prisma.qrSession.update({ where: { id: session.id }, data: { usedAt: null } });
    if (msg === "ACTIVITY_NOT_OPEN" || msg === "ACTIVITY_CLOSED") return fail("REJECTED", msg);
    return fail("ERROR", "INTERNAL");
  }
}
