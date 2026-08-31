import { NextRequest } from "next/server";
import { getIssuer } from "@/lib/eid";
import prisma from "@/lib/db";
import { CREDENTIAL_STATUS, LOG_ACTIONS } from "@/lib/const";
import { logEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Auto-issuance webhook (Gateway e.id -> RAME).
 * Notifikasi hasil penerbitan: finished / failed.
 * Signature diverifikasi bila EID_WEBHOOK_SECRET diisi.
 * Pemrosesan idempoten: webhook duplikat tidak menggandakan efek.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-eid-signature") ?? req.headers.get("x-signature") ?? undefined;
  const raw = await req.json().catch(() => ({}));
  const payload = (raw as Record<string, unknown>) ?? {};

  const parsed = await getIssuer().parseWebhook(payload, signature);
  if (!parsed.valid) {
    return Response.json({ error: { code: "INVALID_SIGNATURE", message: "Signature tidak valid." } }, { status: 401 });
  }

  // temukan issuance: via id webhook, atau via subject+schema
  let issuance = parsed.issuanceId
    ? await prisma.credentialIssuance.findFirst({ where: { id: parsed.issuanceId } })
    : null;

  if (!issuance) {
    const subject = String(payload.sub ?? payload.subject ?? payload.did ?? "");
    const schemaId = String(payload.schema_id ?? payload.schemaId ?? "");
    if (subject) {
      const ext = await prisma.externalIdentity.findUnique({
        where: { provider_providerSubject: { provider: "e.id", providerSubject: subject } },
      });
      const config = schemaId ? await prisma.credentialConfig.findFirst({ where: { schemaId } }) : null;
      if (ext && config) {
        issuance = await prisma.credentialIssuance.findUnique({
          where: { credentialConfigId_userId: { credentialConfigId: config.id, userId: ext.userId } },
        });
      }
    }
  }

  if (!issuance) {
    // webhook untuk issuance yang tidak dikenal — catat & akui (idempoten)
    return Response.json({ ok: true, message: "UNKNOWN_ISSUANCE_ACKNOWLEDGED" });
  }

  const status = parsed.status === "finished" ? CREDENTIAL_STATUS.ISSUED : CREDENTIAL_STATUS.FAILED;

  // idempotensi: kalau sudah ISSUED dengan ref sama, jangan proses ulang
  if (issuance.status === CREDENTIAL_STATUS.ISSUED && parsed.providerReference && issuance.providerReference === parsed.providerReference) {
    return Response.json({ ok: true, message: "DUPLICATE_WEBHOOK_IGNORED" });
  }

  await prisma.credentialIssuance.update({
    where: { id: issuance.id },
    data: {
      status,
      providerReference: parsed.providerReference ?? issuance.providerReference,
      errorMessage: parsed.errorMessage ?? issuance.errorMessage,
    },
  });
  await prisma.credentialEvent.create({
    data: {
      issuanceId: issuance.id,
      type: status,
      payload: { source: "webhook", providerReference: parsed.providerReference, errorMessage: parsed.errorMessage, raw: payload } as object,
    },
  });

  await logEvent(issuance.eventId, issuance.userId, "SYSTEM", status === CREDENTIAL_STATUS.ISSUED ? LOG_ACTIONS.CREDENTIAL_ISSUED : "CREDENTIAL_FAILED", {
    issuanceId: issuance.id,
    providerReference: parsed.providerReference,
    errorMessage: parsed.errorMessage,
  });

  return Response.json({ ok: true, message: status });
}
