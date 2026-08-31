// ============================================================
// RAME — rekonsiliasi transaksi offline scanner
// (blueprint §8: SYNCED / DUPLICATE / CONFLICT / REJECTED)
// ============================================================
import prisma from "@/lib/db";
import { verifyQrScan } from "@/lib/qr";
import { OFFLINE_STATUS } from "@/lib/const";
import { logEvent } from "@/lib/analytics";

export interface OfflineSyncItem {
  payload: string;
  scannedAt: number;
  localId?: string;
}

export async function syncOfflineTransactions(deviceCode: string, txs: OfflineSyncItem[]) {
  const device = await prisma.scannerDevice.findUnique({ where: { deviceCode } });
  if (!device || !device.authorizedAt) {
    return { ok: false as const, message: "DEVICE_UNAUTHORIZED" };
  }

  const results: { localId?: string; status: string; serverReferenceId?: string | null }[] = [];
  for (const tx of txs) {
    // idempotensi per transaksi offline (cek localId di payload)
    const deviceTxs = await prisma.offlineTransaction.findMany({
      where: { scannerDeviceId: device.id },
      select: { id: true, status: true, serverReferenceId: true, payload: true },
    });
    const existing = deviceTxs.find((t) => (t.payload as { localId?: string } | null)?.localId === (tx.localId ?? ""));
    if (existing) {
      results.push({ localId: tx.localId, status: existing.status, serverReferenceId: existing.serverReferenceId });
      continue;
    }

    const result = await verifyQrScan(tx.payload, deviceCode);
    let status: string;
    let ref: string | null = null;
    if (result.ok && result.status === "VERIFIED") {
      status = OFFLINE_STATUS.SYNCED;
      ref = `sync:${tx.localId ?? Date.now()}`;
    } else if (result.ok && result.status === "DUPLICATE") {
      status = OFFLINE_STATUS.DUPLICATE;
    } else if (result.status === "EXPIRED" || result.status === "INVALID") {
      status = OFFLINE_STATUS.REJECTED;
    } else {
      status = OFFLINE_STATUS.CONFLICT;
    }

    const record = await prisma.offlineTransaction.create({
      data: {
        scannerDeviceId: device.id,
        eventId: device.eventId,
        status,
        serverReferenceId: ref,
        payload: { localId: tx.localId, scannedAt: tx.scannedAt, status, ref } as object,
        syncedAt: new Date(),
      },
    });
    if (status === OFFLINE_STATUS.SYNCED) {
      await logEvent(device.eventId, null, "SCANNER", "OFFLINE_SYNCED", { deviceCode, transactionId: record.id });
    }
    results.push({ localId: tx.localId, status, serverReferenceId: ref });
  }

  await prisma.scannerDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
  return { ok: true as const, results };
}
