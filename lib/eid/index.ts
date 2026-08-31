// ============================================================
// RAME — factory adapter e.id
// Business logic memanggil interface (lib/eid/types.ts), bukan URL
// provider. Mode dari env EID_MODE: mock (default) | sandbox | production
// ============================================================
import { OAuthAdapter, IssuerAdapter, VerifierAdapter, HolderAdapter, EidMode, LoginVcResult, VerifierSessionStatus, PresentationWebhook } from "./types";
import { EidOAuthAdapter, OAuthConfig } from "./oauth";
import { EidIssuerAdapter, IssuerConfig } from "./issuer";
import { EidVerifierAdapter, VerifierConfig } from "./verifier";
import { MockOAuthAdapter, MockIssuerAdapter, MockVerifierAdapter, MockHolderAdapter } from "./mock";

export function eidMode(): EidMode {
  const mode = (process.env.EID_MODE ?? "mock").toLowerCase();
  return mode === "sandbox" || mode === "production" ? mode : "mock";
}

export function oauthConfig(): OAuthConfig {
  const mode = eidMode();
  return {
    // referensi live: OAuth SSO di sandbox = gateway-sandbox.e.id, produksi = api-wallet.e.id
    baseUrl: process.env.EID_OAUTH_BASE_URL ?? (mode === "production" ? "https://api-wallet.e.id" : "https://gateway-sandbox.e.id"),
    clientId: process.env.EID_OAUTH_CLIENT_ID ?? "",
    clientSecret: process.env.EID_OAUTH_CLIENT_SECRET ?? "",
    callbackUrl: process.env.EID_OAUTH_CALLBACK_URL ?? "http://localhost:3000/api/auth/eid/callback",
  };
}

export function verifierConfig(): VerifierConfig {
  const mode = eidMode();
  return {
    baseUrl: process.env.EID_VERIFIER_BASE_URL ?? (mode === "production" ? "https://gateway.e.id" : "https://gateway-sandbox.e.id"),
    clientId: process.env.EID_VERIFIER_CLIENT_ID ?? process.env.EID_OAUTH_CLIENT_ID ?? "",
    clientSecret: process.env.EID_VERIFIER_CLIENT_SECRET ?? process.env.EID_OAUTH_CLIENT_SECRET ?? "",
    verificationId: process.env.EID_VERIFIER_VERIFICATION_ID || undefined,
  };
}

export function issuerConfig(): IssuerConfig {
  return {
    baseUrl: process.env.EID_ISSUER_BASE_URL ?? "https://gateway-sandbox.e.id",
    clientId: process.env.EID_ISSUER_CLIENT_ID ?? "",
    clientSecret: process.env.EID_ISSUER_CLIENT_SECRET ?? "",
    webhookSecret: process.env.EID_WEBHOOK_SECRET ?? "",
  };
}

let cached: { oauth?: OAuthAdapter; issuer?: IssuerAdapter; verifier?: VerifierAdapter; holder?: HolderAdapter } = {};

export function getOAuth(): OAuthAdapter {
  if (!cached.oauth) cached.oauth = eidMode() === "mock" ? new MockOAuthAdapter() : new EidOAuthAdapter(oauthConfig());
  return cached.oauth;
}

export function getIssuer(): IssuerAdapter {
  if (!cached.issuer) {
    // Issuer butuh onboarding terpisah (support e.id). Belum dikonfigurasi =
    // fallback adapter mock agar alur kredensial tetap bisa dicoba (PRD: mock adapter untuk development).
    const realConfigured = Boolean(process.env.EID_ISSUER_CLIENT_ID && process.env.EID_ISSUER_CLIENT_SECRET);
    cached.issuer = eidMode() === "mock" || !realConfigured ? new MockIssuerAdapter() : new EidIssuerAdapter(issuerConfig());
  }
  return cached.issuer;
}

export function getVerifier(): VerifierAdapter {
  if (!cached.verifier) cached.verifier = eidMode() === "mock" ? new MockVerifierAdapter() : new EidVerifierAdapter(verifierConfig());
  return cached.verifier;
}

export function getHolder(): HolderAdapter {
  if (!cached.holder) cached.holder = new MockHolderAdapter();
  return cached.holder;
}

/** Info mode untuk banner UI */
export function eidStatus() {
  const mode = eidMode();
  return {
    mode,
    real: mode !== "mock",
    sandboxReady: mode === "sandbox" && Boolean(process.env.EID_OAUTH_CLIENT_ID),
    verifierReady: mode !== "mock" && Boolean(process.env.EID_VERIFIER_BASE_URL ?? process.env.EID_OAUTH_CLIENT_ID),
    label: mode === "mock" ? "Mock" : mode === "sandbox" ? "e.id Sandbox" : "e.id Production",
  };
}
