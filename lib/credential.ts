// ============================================================
// RAME — credential model (blueprint §13)
// ELIGIBLE -> PENDING -> ISSUED | FAILED -> REVOKED
// Integrasi e.id diisolasi di adapter (lib/eid).
// ============================================================
import prisma from "./db";
import { LOG_ACTIONS, CREDENTIAL_STATUS, ELIGIBILITY_POLICIES } from "./const";
import { logEvent } from "./analytics";
import { getIssuer } from "./eid";
import type { IssuanceResult } from "./eid/types";

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  config?: {
    id: string;
    title: string | null;
    description: string | null;
    schemaId: string | null;
    issuerOrgName: string | null;
    eligibilityPolicy: string;
  } | null;
}

/** Evaluasi kelayakan kredensial berdasarkan kebijakan event */
export async function evaluateEligibility(eventId: string, userId: string): Promise<EligibilityResult> {
  const config = await prisma.credentialConfig.findUnique({ where: { eventId } });
  if (!config || !config.enabled) return { eligible: false, reason: "NOT_CONFIGURED", config: null };

  const cfg = {
    id: config.id,
    title: config.title,
    description: config.description,
    schemaId: config.schemaId,
    issuerOrgName: config.issuerOrgName,
    eligibilityPolicy: config.eligibilityPolicy,
  };

  const completions = await prisma.activityCompletion.count({ where: { eventId, userId } });
  const totalActivities = await prisma.activity.count({ where: { eventId } });
  const existing = await prisma.credentialIssuance.findUnique({
    where: { credentialConfigId_userId: { credentialConfigId: config.id, userId } },
  });
  if (existing && (existing.status === CREDENTIAL_STATUS.ISSUED || existing.status === CREDENTIAL_STATUS.PENDING)) {
    return { eligible: false, reason: existing.status === "ISSUED" ? "ALREADY_ISSUED" : "IN_PROGRESS", config: cfg };
  }

  let eligible = false;
  let reason = "NOT_ELIGIBLE";

  switch (config.eligibilityPolicy) {
    case ELIGIBILITY_POLICIES.EVENT_COMPLETION:
      eligible = totalActivities > 0 && completions >= totalActivities;
      reason = eligible ? "OK" : "INCOMPLETE";
      break;
    case ELIGIBILITY_POLICIES.MILESTONE: {
      const target = (config.policyValue as { activityId?: string } | null)?.activityId;
      if (target) {
        const done = await prisma.activityCompletion.findFirst({ where: { activityId: target, userId } });
        eligible = Boolean(done);
        reason = eligible ? "OK" : "MILESTONE_NOT_REACHED";
      }
      break;
    }
    case ELIGIBILITY_POLICIES.ACHIEVEMENT: {
      const target = (config.policyValue as { achievementId?: string } | null)?.achievementId;
      if (target) {
        const done = await prisma.participantAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId: target } },
        });
        eligible = Boolean(done);
        reason = eligible ? "OK" : "ACHIEVEMENT_NOT_UNLOCKED";
      }
      break;
    }
    case ELIGIBILITY_POLICIES.CUSTOM: {
      const minCompletions = (config.policyValue as { minCompletions?: number } | null)?.minCompletions ?? totalActivities;
      eligible = completions >= minCompletions;
      reason = eligible ? "OK" : "INCOMPLETE";
      break;
    }
  }

  return { eligible, reason, config: cfg };
}

export interface ClaimResult {
  status: string;
  providerReference?: string;
  message: string;
}

/**
 * Klaim kredensial: ELIGIBLE -> PENDING -> (adapter) -> ISSUED/FAILED.
 * Alur auto-issuance e.id: peserta mengklaim dari dompet e.id,
 * gateway memanggil Verification Endpoint RAME, lalu webhook
 * memperbarui status. Di mode mock, klaim langsung tuntas.
 */
export async function claimCredential(eventId: string, userId: string): Promise<ClaimResult> {
  const config = await prisma.credentialConfig.findUnique({ where: { eventId } });
  if (!config || !config.enabled) return { status: "NO_CONFIG", message: "NOT_CONFIGURED" };

  // sudah terbit → kembalikan status + ref (idempoten)
  const alreadyIssued = await prisma.credentialIssuance.findUnique({
    where: { credentialConfigId_userId: { credentialConfigId: config.id, userId } },
  });
  if (alreadyIssued?.status === CREDENTIAL_STATUS.ISSUED) {
    return { status: CREDENTIAL_STATUS.ISSUED, providerReference: alreadyIssued.providerReference ?? undefined, message: "ALREADY_ISSUED" };
  }

  const eligibility = await evaluateEligibility(eventId, userId);
  if (!eligibility.eligible) {
    return { status: CREDENTIAL_STATUS.ELIGIBLE, message: eligibility.reason };
  }

  const issuance = await prisma.credentialIssuance.upsert({
    where: { credentialConfigId_userId: { credentialConfigId: config.id, userId } },
    create: {
      credentialConfigId: config.id,
      userId,
      eventId,
      status: CREDENTIAL_STATUS.ELIGIBLE,
      idempotencyKey: `cred:${config.id}:${userId}`,
    },
    update: {},
  });

  if (issuance.status === CREDENTIAL_STATUS.ISSUED) {
    return { status: CREDENTIAL_STATUS.ISSUED, providerReference: issuance.providerReference ?? undefined, message: "ALREADY_ISSUED" };
  }

  // tandai PENDING
  const pending = await prisma.credentialIssuance.update({
    where: { id: issuance.id },
    data: { status: CREDENTIAL_STATUS.PENDING },
  });
  await prisma.credentialEvent.create({
    data: { issuanceId: pending.id, type: "SUBMITTED", payload: { source: "ui-claim" } },
  });
  await logEvent(eventId, userId, "SYSTEM", LOG_ACTIONS.CREDENTIAL_ELIGIBLE, { configId: config.id });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const ext = await prisma.externalIdentity.findFirst({ where: { userId, provider: "e.id" } });

  let result: IssuanceResult;
  try {
    result = await getIssuer().submitClaim({
      eventId,
      eventName: (await prisma.event.findUnique({ where: { id: eventId } }))?.name ?? eventId,
      participantSubject: ext?.providerSubject ?? user?.email ?? userId,
      participantName: user?.name,
      credentialTitle: config.title ?? "RAME Event Credential",
      schemaId: config.schemaId ?? "rame-credential",
      metadata: { eligibilityPolicy: config.eligibilityPolicy, policyValue: config.policyValue ?? {} },
    });
  } catch (err) {
    // kegagalan provider → FAILED (bukan 500), detail aman disimpan
    result = { ok: false, errorMessage: err instanceof Error ? err.message : "ISSUER_ERROR" };
  }

  let finalStatus: string = CREDENTIAL_STATUS.PENDING;
  if (result.ok && result.providerReference) {
    finalStatus = CREDENTIAL_STATUS.ISSUED;
  } else if (!result.ok) {
    finalStatus = CREDENTIAL_STATUS.FAILED;
  }

  await prisma.credentialIssuance.update({
    where: { id: pending.id },
    data: { status: finalStatus, providerReference: result.providerReference, errorMessage: result.errorMessage },
  });
  await prisma.credentialEvent.create({
    data: { issuanceId: pending.id, type: finalStatus, payload: { providerReference: result.providerReference, error: result.errorMessage } },
  });
  if (finalStatus === CREDENTIAL_STATUS.ISSUED) {
    await logEvent(eventId, userId, "SYSTEM", LOG_ACTIONS.CREDENTIAL_ISSUED, { issuanceId: pending.id, providerReference: result.providerReference });
  }

  return { status: finalStatus, providerReference: result.providerReference, message: finalStatus };
}
