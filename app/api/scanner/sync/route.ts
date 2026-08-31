import { NextRequest } from "next/server";
import { syncOfflineTransactions } from "@/lib/offline/sync";

export const dynamic = "force-dynamic";

/** Sinkronisasi scanner offline (POST /api/scanner/sync) */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { deviceCode?: string; transactions?: unknown[] };
  if (!body.deviceCode || !Array.isArray(body.transactions)) {
    return Response.json({ ok: false, message: "MISSING_DEVICE_OR_TRANSACTIONS" }, { status: 400 });
  }
  const result = await syncOfflineTransactions(body.deviceCode, body.transactions as never[]);
  if (!result.ok) return Response.json(result, { status: 403 });
  return Response.json(result);
}
