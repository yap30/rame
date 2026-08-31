import { NextRequest } from "next/server";
import { verifyQrScan } from "@/lib/qr";
import { syncOfflineTransactions } from "@/lib/offline/sync";

export const dynamic = "force-dynamic";

/**
 * Verifikasi scan QR online (POST /api/verification/scan).
 * Body: { payload: string (JSON QR), deviceCode?: string }
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { payload?: string; deviceCode?: string };
  if (!body.payload) {
    return Response.json({ ok: false, status: "INVALID", reason: "MISSING_PAYLOAD" }, { status: 400 });
  }

  const result = await verifyQrScan(body.payload, body.deviceCode || null);

  if (!result.ok) {
    const statusMap: Record<string, number> = { INVALID: 400, EXPIRED: 410, DUPLICATE: 409, DEVICE_UNAUTHORIZED: 403, REJECTED: 422, ERROR: 500 };
    return Response.json(result, { status: statusMap[result.status] ?? 400 });
  }
  return Response.json(result);
}

/**
 * Sinkronisasi offline scanner — alias dari PUT di route ini
 * (endpoint utama: POST /api/scanner/sync).
 */
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    deviceCode?: string;
    transactions?: { payload: string; scannedAt: number; localId?: string }[];
  };
  if (!body.deviceCode || !Array.isArray(body.transactions)) {
    return Response.json({ ok: false, message: "MISSING_DEVICE_OR_TRANSACTIONS" }, { status: 400 });
  }
  const result = await syncOfflineTransactions(body.deviceCode, body.transactions);
  if (!result.ok) return Response.json(result, { status: 403 });
  return Response.json(result);
}
