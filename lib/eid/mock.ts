// ============================================================
// RAME — mock adapter e.id (mode pengembangan, default)
// Mensimulasikan OAuth SSO + Issuer tanpa credentials nyata.
// Business logic tidak membedakan mock/real — hanya adapter ini.
// ============================================================
import { OAuthAdapter, IssuerAdapter, VerifierAdapter, HolderAdapter, EidAppInfo, EidProfile, LoginVcResult, PresentationWebhook } from "./types";
import { createHash } from "crypto";

const DEMO_PROFILES: Record<string, EidProfile> = {
  putri: {
    subject: "did:idchain:demo:putri",
    email: "putri@semilir.id",
    name: "Putri Anggraini",
    trustLevel: "Moderate — Tier 2",
    raw: { kyc: "email+phone+id" },
  },
  rara: {
    subject: "did:idchain:demo:rara",
    email: "rara@semilir.id",
    name: "Rara Semilir",
    trustLevel: "Moderate — Tier 2",
    raw: { kyc: "email+phone+id" },
  },
};

export class MockOAuthAdapter implements OAuthAdapter {
  mode = "mock" as const;

  async getAppInfo(): Promise<EidAppInfo> {
    return { appName: "RAME (Mode Demo)", iconUrl: undefined, scopes: ["profile", "email"] };
  }

  buildAuthorizeUrl(state: string): string {
    // Simulasi redirect e.id -> callback langsung dengan one-time code.
    // Pilih profil: gunakan state "org" untuk organizer demo.
    const user = state.includes("org") ? "rara" : "putri";
    return `/api/auth/eid/callback?code=mock:${user}&state=${encodeURIComponent(state)}`;
  }

  async exchangeCode(code: string): Promise<{ token: string; profile: EidProfile }> {
    const userKey = code.replace(/^mock:/, "");
    const profile = DEMO_PROFILES[userKey] ?? DEMO_PROFILES.putri;
    return { token: `mock-token-${userKey}`, profile };
  }
}

export class MockIssuerAdapter implements IssuerAdapter {
  mode = "mock" as const;

  async verifyHolder(payload: Record<string, unknown>) {
    const subject = String(payload.sub ?? payload.subject ?? "");
    const schemaId = String(payload.schema_id ?? payload.schemaId ?? "");
    return {
      verified: Boolean(subject && schemaId),
      reason: subject && schemaId ? undefined : "Missing subject or schema_id",
      credentialData: { subject, schemaId, mock: true },
    };
  }

  async parseWebhook(payload: Record<string, unknown>) {
    return {
      valid: true,
      issuanceId: payload.issuance_id ? String(payload.issuance_id) : "mock-issuance",
      status: "finished" as const,
      providerReference: `did:idchain:vc:mock:${createHash("sha1").update(JSON.stringify(payload)).digest("hex").slice(0, 12)}`,
      raw: payload,
    };
  }

  async submitClaim() {
    const ref = `did:idchain:vc:mock:${createHash("sha1").update(String(Date.now())).digest("hex").slice(0, 16)}`;
    return { ok: true, providerReference: ref, raw: { mock: true, ref } };
  }
}

export class MockVerifierAdapter implements VerifierAdapter {
  mode = "mock" as const;

  async ensureLoginTemplate(): Promise<string> {
    return "mock-verification-template";
  }

  async loginVc(): Promise<LoginVcResult> {
    return {
      sessionId: `mock-session-${Date.now()}`,
      eidOauthUrl: `rame://login?mock=1&t=${Date.now()}`,
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      status: "PENDING",
      qrData: { challenge: `ch-${Date.now()}`, qrToken: `tok-${Date.now()}`, eventType: "LOGIN_VC" },
    };
  }

  async getSession() {
    return { status: "PENDING" };
  }

  parseWebhook(payload: Record<string, unknown>): PresentationWebhook {
    const holder = (payload.holder_account ?? {}) as { did?: string; username?: string };
    return {
      eventType: String(payload.event_type ?? "LOGIN_VC"),
      sessionId: String(payload.session_id ?? payload.id ?? ""),
      status: String(payload.status ?? "UNKNOWN").toUpperCase(),
      holderDid: holder.did,
      holderName: holder.username,
      rejectReason: payload.reject_reason ? String(payload.reject_reason) : null,
      raw: payload,
    };
  }

  async verifyPresentation() {
    return { valid: true, subject: "did:idchain:demo:putri" };
  }
}

export class MockHolderAdapter implements HolderAdapter {
  mode = "mock" as const;
  async listCredentials(subject: string) {
    return [{ reference: `${subject}:vc:demo`, schemaId: "rame-jelajah-kota-tua-2026", status: "issued" }];
  }
}
