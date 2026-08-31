import { NextRequest } from "next/server";
import { getVerifier, eidMode } from "@/lib/eid";
import prisma from "@/lib/db";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/**
 * Mulai Login with VC (Verifier API e.id):
 * buat login QR → simpan sesi → kirim QR + session_id ke browser.
 */
export async function POST() {
  const mode = eidMode();
  try {
    const verifier = getVerifier();
    const login = await verifier.loginVc();

    const expiresAt = new Date(login.expiresAt);
    await prisma.authLoginSession.create({
      data: {
        sessionId: login.sessionId,
        status: "PENDING",
        challenge: login.qrData.challenge || null,
        qrToken: login.qrData.qrToken || null,
        eidOauthUrl: login.eidOauthUrl,
        expiresAt,
        rawJson: { mode, verificationId: login.qrData.schemaId ?? null } as object,
      },
    });

    // QR berisi eid_oauth_url — dibuka aplikasi e.id holder
    const qr = await QRCode.toDataURL(login.eidOauthUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
      color: { dark: "#1e3a34", light: "#ffffff" },
    });

    return Response.json({
      ok: true,
      mode,
      sessionId: login.sessionId,
      status: login.status,
      qr,
      eidOauthUrl: login.eidOauthUrl,
      expiresAt: login.expiresAt,
      expiresInSeconds: Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuat login QR";
    return Response.json({ ok: false, error: { code: "VC_LOGIN_FAILED", message: msg } }, { status: 502 });
  }
}
