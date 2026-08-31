// ============================================================
// RAME — tipe kontrak integrasi e.id
// Boundary: business logic hanya mengenal interface ini,
// bukan payload mentah provider (sesuai blueprint §6 & §18).
// ============================================================

export type EidMode = "mock" | "sandbox" | "production";

// ---------- OAuth SSO ----------

export interface EidAppInfo {
  appName: string;
  iconUrl?: string;
  scopes: string[];
}

export interface EidProfile {
  subject: string; // DID / subject e.id
  email?: string;
  name?: string;
  trustLevel?: string; // Tier 0..2
  raw?: Record<string, unknown>;
}

export interface OAuthAdapter {
  mode: EidMode;
  /** Langkah 1: info aplikasi untuk tombol "Sign in with e.id" */
  getAppInfo(): Promise<EidAppInfo>;
  /** Langkah 2: URL redirect browser pengguna ke e.id */
  buildAuthorizeUrl(state: string): string;
  /** Langkah 3+4: tukar code -> token -> profil (server-side) */
  exchangeCode(code: string): Promise<{ token: string; profile: EidProfile }>;
}

// ---------- Issuer (credential) ----------

export interface IssuerEligibilityInput {
  eventId: string;
  eventName: string;
  participantSubject: string; // DID e.id peserta
  participantName?: string;
  credentialTitle: string;
  schemaId: string;
  metadata: Record<string, unknown>; // data kelayakan (penyelesaian, XP, dll.)
}

export interface IssuerVerificationDecision {
  verified: boolean;
  reason?: string;
  credentialData?: Record<string, unknown>;
  generatedImageUrl?: string;
}

export interface IssuanceResult {
  ok: boolean;
  providerReference?: string;
  errorMessage?: string;
  raw?: Record<string, unknown>;
}

export interface IssuerAdapter {
  mode: EidMode;
  /**
   * Verification Endpoint (Gateway -> RAME): e.id memanggil endpoint ini
   * saat holder mengklaim kredensial. Implementasi adapter bertugas
   * memetakan payload provider ke domain RAME.
   */
  verifyHolder(payload: Record<string, unknown>): Promise<IssuerVerificationDecision>;
  /**
   * Auto-issuance webhook (Gateway -> RAME): notifikasi hasil penerbitan.
   */
  parseWebhook(payload: Record<string, unknown>, signature?: string): Promise<{
    valid: boolean;
    issuanceId?: string;
    status: "finished" | "failed" | "unknown";
    providerReference?: string;
    errorMessage?: string;
    raw: Record<string, unknown>;
  }>;
  /**
   * API call RAME -> e.id: daftarkan/klaim kredensial atas nama peserta
   * (dipakai alur "Klaim Kredensial" di UI).
   */
  submitClaim(input: IssuerEligibilityInput): Promise<IssuanceResult>;
}

// ---------- Verifier (Login with VC) ----------

export interface LoginVcResult {
  sessionId: string;
  eidOauthUrl: string;
  expiresAt: string;
  status: string;
  qrData: { challenge: string; qrToken: string; schemaId?: string; eventType?: string };
}

export interface VerifierSessionStatus {
  status: string; // PENDING | SCANNED | APPROVED | REJECTED | EXPIRED
  holderDid?: string;
  holderName?: string;
  rejectReason?: string | null;
}

export interface PresentationWebhook {
  eventType: string;
  sessionId: string;
  challenge?: string;
  qrToken?: string;
  status: string; // SCANNED | APPROVED | REJECTED
  holderDid?: string;
  holderName?: string;
  rejectReason?: string | null;
  raw: Record<string, unknown>;
}

export interface VerifierAdapter {
  mode: EidMode;
  /** Pastikan template verifikasi Login VC ada; kembalikan verification_id */
  ensureLoginTemplate(): Promise<string>;
  /** Buat login QR (Login with VC) */
  loginVc(): Promise<LoginVcResult>;
  /** Status sesi VP (polling) */
  getSession(sessionId: string): Promise<VerifierSessionStatus>;
  /** Parsing presentation webhook (Gateway -> RAME) */
  parseWebhook(payload: Record<string, unknown>): PresentationWebhook;
  /** Verifikasi presentasi langsung (extension point) */
  verifyPresentation(payload: Record<string, unknown>): Promise<{ valid: boolean; subject?: string; reason?: string }>;
}

// ---------- Holder (extension point MVP) ----------

export interface HolderAdapter {
  mode: EidMode;
  listCredentials(subject: string): Promise<{ reference: string; schemaId?: string; status: string }[]>;
}
