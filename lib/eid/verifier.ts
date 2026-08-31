// ============================================================
// RAME — adapter Verifier e.id (Login with VC)
// Kontrak dari Postman Collection resmi e.id (LIVE REFERENCE):
//   POST /api/v1/auth/token                        (Get Access Token)
//   GET  /api/v1/verifier/document-schema          (browse issuer schemas)
//   POST /api/v1/verifier/verification-schema      (create template)
//   POST /api/v1/auth/vc-login  {verification_id}  (Login VC QR)
//   GET  /api/v1/verifier/presentation/session/:id (poll status)
// Webhook presentasi dikirim gateway ke callback RAME.
// ============================================================
import { LoginVcResult, VerifierAdapter, VerifierSessionStatus, PresentationWebhook } from "./types";
import { EidError, EidErrorCodes, mapProviderError } from "./errors";

export interface VerifierConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  /** verification_id template Login VC — dikosongkan = auto-create */
  verificationId?: string;
}

interface EidEnvelope {
  code?: number;
  message?: string;
  status?: boolean;
  data?: Record<string, unknown> | null;
}

const TEMPLATE_NAME = "rame-login-vc";

export class EidVerifierAdapter implements VerifierAdapter {
  mode: "sandbox" | "production";
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private cfg: VerifierConfig) {
    this.mode = cfg.baseUrl.includes("gateway.e.id") && !cfg.baseUrl.includes("sandbox") ? "production" : "sandbox";
  }

  private assertConfigured() {
    if (!this.cfg.clientId || !this.cfg.clientSecret) {
      throw new EidError(EidErrorCodes.NOT_CONFIGURED, "e.id Verifier belum dikonfigurasi. Isi EID_VERIFIER_CLIENT_ID/SECRET di .env.");
    }
  }

  /** Get Access Token + cache (ttl dari respons) */
  private async accessToken(): Promise<string> {
    this.assertConfigured();
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) return this.tokenCache.token;
    try {
      const res = await fetch(`${this.cfg.baseUrl}/api/v1/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ client_id: this.cfg.clientId, client_secret: this.cfg.clientSecret }),
        cache: "no-store",
      });
      if (!res.ok) throw mapProviderError({ status: res.status }, EidErrorCodes.UNAUTHORIZED);
      const body = (await res.json()) as EidEnvelope;
      const data = body.data ?? {};
      const token = String(data.token ?? "");
      if (!token) throw new EidError(EidErrorCodes.PROVIDER_ERROR, "Token verifier tidak ditemukan di respons.");
      const ttl = Number(data.ttl ?? 3600);
      this.tokenCache = { token, expiresAt: Date.now() + ttl * 1000 };
      return token;
    } catch (err) {
      if (err instanceof EidError) throw err;
      throw mapProviderError(err);
    }
  }

  private async gateway<T = EidEnvelope>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.accessToken();
    const res = await fetch(`${this.cfg.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, accept: "application/json", "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    if (!res.ok) throw mapProviderError({ status: res.status });
    return (await res.json()) as T;
  }

  /** Cari schema dokumen pertama yang tersedia untuk template */
  private async firstDocumentSchemaId(): Promise<string> {
    const body = await this.gateway<EidEnvelope>("/api/v1/verifier/document-schema");
    const items = (body.data as { items?: unknown[] } | null)?.items ?? [];
    const first = items[0] as { id?: string } | undefined;
    if (!first?.id) throw new EidError(EidErrorCodes.SCHEMA_NOT_FOUND, "Tidak ada document schema tersedia di akun verifier.");
    return first.id;
  }

  /** Pastikan template Login VC ada; buat bila belum (idempoten) */
  async ensureLoginTemplate(): Promise<string> {
    this.assertConfigured();
    if (this.cfg.verificationId) return this.cfg.verificationId;
    try {
      const list = await this.gateway<EidEnvelope>("/api/v1/verifier/verification-schema");
      const items = (list.data as { items?: { id?: string; name?: string; deleted_at?: string | null }[] } | null)?.items ?? [];
      const existing = items.find((t) => t.name === TEMPLATE_NAME && !t.deleted_at);
      if (existing?.id) return existing.id;

      const schemaId = await this.firstDocumentSchemaId();
      const created = await this.gateway<EidEnvelope>("/api/v1/verifier/verification-schema", {
        method: "POST",
        body: JSON.stringify({
          name: TEMPLATE_NAME,
          description: "RAME login via verifiable credential",
          ttl: 5,
          presentation_limit: 0,
          expected_schemas: [{ schema_id: schemaId, mandatory: true, required_fields: ["subject_id", "email"] }],
          custom_webhook_url: process.env.EID_VERIFIER_WEBHOOK_URL ?? "",
          event_type: "LOGIN_VC",
        }),
      });
      const id = String((created.data as { id?: string } | null)?.id ?? "");
      if (!id) throw new EidError(EidErrorCodes.PROVIDER_ERROR, "Gagal membuat template verifikasi.");
      return id;
    } catch (err) {
      if (err instanceof EidError) throw err;
      throw mapProviderError(err);
    }
  }

  /** Login with VC — buat QR login */
  async loginVc(): Promise<LoginVcResult> {
    const verificationId = await this.ensureLoginTemplate();
    try {
      const body = await this.gateway<EidEnvelope>("/api/v1/auth/vc-login", {
        method: "POST",
        body: JSON.stringify({ verification_id: verificationId }),
      });
      const d = (body.data ?? {}) as {
        session_id?: string;
        eid_oauth_url?: string;
        expires_at?: string;
        status?: string;
        qr_data?: { challenge?: string; qr_token?: string; schema_id?: string; event_type?: string };
      };
      if (!d.session_id || !d.eid_oauth_url) throw new EidError(EidErrorCodes.PROVIDER_ERROR, "Respons Login VC tidak lengkap.");
      return {
        sessionId: d.session_id,
        eidOauthUrl: d.eid_oauth_url,
        expiresAt: d.expires_at ?? new Date(Date.now() + 5 * 60_000).toISOString(),
        status: d.status ?? "PENDING",
        qrData: {
          challenge: d.qr_data?.challenge ?? "",
          qrToken: d.qr_data?.qr_token ?? "",
          schemaId: d.qr_data?.schema_id,
          eventType: d.qr_data?.event_type,
        },
      };
    } catch (err) {
      if (err instanceof EidError) throw err;
      throw mapProviderError(err);
    }
  }

  /** Poll status sesi VP */
  async getSession(sessionId: string): Promise<VerifierSessionStatus> {
    try {
      const body = await this.gateway<EidEnvelope>(`/api/v1/verifier/presentation/session/${encodeURIComponent(sessionId)}`);
      const d = (body.data ?? {}) as {
        status?: string;
        reject_reason?: string | null;
        holder_account?: { did?: string; username?: string } | null;
      };
      return {
        status: String(d.status ?? "PENDING").toUpperCase(),
        holderDid: d.holder_account?.did,
        holderName: d.holder_account?.username,
        rejectReason: d.reject_reason ?? null,
      };
    } catch (err) {
      if (err instanceof EidError) throw err;
      throw mapProviderError(err);
    }
  }

  /** Parsing presentation webhook (Gateway -> RAME) */
  parseWebhook(payload: Record<string, unknown>): PresentationWebhook {
    const holder = (payload.holder_account ?? {}) as { did?: string; username?: string };
    return {
      eventType: String(payload.event_type ?? "LOGIN_VC"),
      sessionId: String(payload.session_id ?? payload.sesssion_id ?? payload.id ?? ""),
      challenge: payload.challenge ? String(payload.challenge) : undefined,
      qrToken: payload.qr_token ? String(payload.qr_token) : undefined,
      status: String(payload.status ?? "UNKNOWN").toUpperCase(),
      holderDid: holder.did,
      holderName: holder.username,
      rejectReason: payload.reject_reason ? String(payload.reject_reason) : null,
      raw: payload,
    };
  }

  /** Extension point: verifikasi presentasi langsung */
  async verifyPresentation(payload: Record<string, unknown>) {
    const parsed = this.parseWebhook(payload);
    return { valid: parsed.status === "APPROVED", subject: parsed.holderDid, reason: parsed.status === "APPROVED" ? undefined : "NOT_APPROVED" };
  }
}
