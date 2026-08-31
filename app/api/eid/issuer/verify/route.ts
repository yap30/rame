import { NextRequest } from "next/server";
import { getIssuer } from "@/lib/eid";
import prisma from "@/lib/db";
import { evaluateEligibility } from "@/lib/credential";

export const dynamic = "force-dynamic";

/**
 * Verification Endpoint (Gateway e.id -> RAME).
 * Dipanggil gateway saat holder mengklaim kredensial dari dompet e.id.
 * Kontrak payload eksak mengikuti referensi API live (blueprint §18) —
 * parsing di sini defensif dan dipetakan ke domain RAME.
 */
export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}));
  const payload = (raw as Record<string, unknown>) ?? {};

  const subject = String(payload.sub ?? payload.subject ?? payload.did ?? payload.holder_did ?? "");
  const schemaId = String(payload.schema_id ?? payload.schemaId ?? payload.schema ?? "");
  const participantName = typeof payload.name === "string" ? payload.name : undefined;

  if (!subject || !schemaId) {
    return Response.json({ verified: false, reason: "missing_subject_or_schema" }, { status: 400 });
  }

  // cari peserta via identitas e.id
  const ext = await prisma.externalIdentity.findUnique({
    where: { provider_providerSubject: { provider: "e.id", providerSubject: subject } },
  });
  if (!ext) {
    return Response.json({ verified: false, reason: "holder_not_registered" }, { status: 200 });
  }

  // cari config kredensial dengan schema ini
  const config = await prisma.credentialConfig.findFirst({ where: { schemaId } });
  if (!config || !config.enabled) {
    return Response.json({ verified: false, reason: "schema_not_configured" }, { status: 200 });
  }

  const eligibility = await evaluateEligibility(config.eventId, ext.userId);
  if (!eligibility.eligible) {
    return Response.json({ verified: false, reason: eligibility.reason }, { status: 200 });
  }

  const event = await prisma.event.findUnique({ where: { id: config.eventId } });
  const user = await prisma.user.findUnique({ where: { id: ext.userId } });

  const decision = await getIssuer().verifyHolder({ ...payload, subject, schemaId, eventId: config.eventId });

  return Response.json({
    verified: true,
    credential_data: {
      ...(decision.credentialData ?? {}),
      event_name: event?.name ?? "",
      event_slug: event?.slug ?? "",
      participant_name: participantName ?? user?.name ?? "",
      participant_did: subject,
      issued_by: config.issuerOrgName ?? "RAME",
      schema_id: schemaId,
      issued_at: new Date().toISOString(),
    },
  });
}
