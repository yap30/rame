// ============================================================
// RAME — adapter Issuer e.id (implementasi nyata)
// Flow sesuai docs.e.id/en/issuer:
//   - Gateway memanggil Verification Endpoint RAME saat holder
//     mengklaim kredensial dari dompet e.id (auto-issuance).
//   - RAME menerima webhook hasil ke default_webhook_url.
//   - RAME memakai Issuer API (gateway) untuk token akses &
//     monitoring auto-issuance.
// Catatan: payload eksak verification endpoint & webhook adalah
// boundary provider (blueprint §18) — parsing di sini defensif dan
// harus disesuaikan dengan referensi API live saat implementasi.
// ============================================================
import { IssuerAdapter, IssuerEligibilityInput, IssuanceResult, IssuerVerificationDecision } from "./types";
import { EidError, EidErrorCodes, mapProviderError } from "./errors";
import { createHmac, timingSafeEqual } from "crypto";

export interface IssuerConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
}

export class EidIssuerAdapter implements IssuerAdapter {
  mode: "sandbox" | "production";
  constructor(private cfg: IssuerConfig) {
    this.mode = cfg.baseUrl.includes("gateway.e.id") && !cfg.baseUrl.includes("sandbox") ? "production" : "sandbox";
  }

  private assertConfigured() {
    if (!this.cfg.clientId || !this.cfg.clientSecret) {
      throw new EidError(EidErrorCodes.ISSUER_NOT_ONBOARDED, "e.id Issuer belum dikonfigurasi. Isi EID_ISSUER_CLIENT_ID/SECRET di .env.");
    }
  }

  /** Get Access Token (Issuer API Authentication) */
  private async accessToken(): Promise<string> {
    this.assertConfigured();
    try {
      const res = await fetch(`${this.cfg.baseUrl}/v1/authentication/get-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: this.cfg.clientId, client_secret: this.cfg.clientSecret }),
        cache: "no-store",
      });
      if (!res.ok) throw mapProviderError({ status: res.status }, EidErrorCodes.UNAUTHORIZED);
      const data = (await res.json()) as { token?: string; access_token?: string; accessToken?: string };
      const token = data.token ?? data.access_token ?? data.accessToken;
      if (!token) throw new EidError(EidErrorCodes.PROVIDER_ERROR, "Token issuer tidak ditemukan di respons.");
      return token;
    } catch (err) {
      if (err instanceof EidError) throw err;
      throw mapProviderError(err);
    }
  }

  /**
   * Verification Endpoint (Gateway -> RAME).
   * Payload provider di-parse defensif; kontrak eksak mengikuti
   * referensi API live (docs.e.id/en/issuer/v1/event-callbacks/verification-endpoint).
   */
  async verifyHolder(payload: Record<string, unknown>): Promise<IssuerVerificationDecision> {
    const subject = String(payload.sub ?? payload.subject ?? payload.did ?? payload.holder_did ?? payload.holderDid ?? "");
    const schemaId = String(payload.schema_id ?? payload.schemaId ?? payload.schema ?? "");
    if (!subject || !schemaId) {
      return { verified: false, reason: "Missing subject or schema_id" };
    }
    // Keputusan kelayakan ditentukan oleh business logic RAME
    // (lib/credential.ts) — adapter hanya memetakan payload.
    return {
      verified: true,
      credentialData: {
        subject,
        schemaId,
        // field lain diisi business logic sebelum endpoint ini dipanggil
      },
    };
  }

  /**
   * Auto-issuance webhook (Gateway -> RAME).
   * Signature diverifikasi bila EID_WEBHOOK_SECRET diisi.
   */
  async parseWebhook(payload: Record<string, unknown>, signature?: string) {
    const valid = this.verifySignature(payload, signature);
    const statusRaw = String(payload.status ?? payload.credential_status ?? "unknown").toLowerCase();
    const status = statusRaw.includes("finish") || statusRaw.includes("issue") || statusRaw.includes("success")
      ? ("finished" as const)
      : statusRaw.includes("fail") || statusRaw.includes("reject") || statusRaw.includes("error")
        ? ("failed" as const)
        : ("unknown" as const);
    return {
      valid,
      issuanceId: payload.issuance_id ? String(payload.issuance_id) : payload.id ? String(payload.id) : undefined,
      status,
      providerReference: payload.credential_id ? String(payload.credential_id) : payload.vc_id ? String(payload.vc_id) : undefined,
      errorMessage: payload.error_message ? String(payload.error_message) : undefined,
      raw: payload,
    };
  }

  private verifySignature(payload: Record<string, unknown>, signature?: string): boolean {
    if (!this.cfg.webhookSecret) {
      // Tanpa secret terkonfigurasi: terima dengan catatan (dev/sandbox).
      // Produksi WAJIB mengisi EID_WEBHOOK_SECRET.
      return true;
    }
    if (!signature) return false;
    const body = typeof payload === "string" ? payload : JSON.stringify(payload);
    const expected = createHmac("sha256", this.cfg.webhookSecret).update(body).digest("hex");
    const given = signature.replace(/^sha256=/i, "");
    if (expected.length !== given.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
  }

  /**
   * Klaim dari UI RAME: dalam alur auto-issuance, penerbitan aktual
   * dipicu dari dompet e.id peserta; RAME menandai PENDING dan
   * menunggu webhook. Jika tersedia, kita bisa memantau via
   * Auto Issuance API (list) untuk konfirmasi.
   */
  async submitClaim(input: IssuerEligibilityInput): Promise<IssuanceResult> {
    try {
      const token = await this.accessToken();
      // Monitoring: cari auto-issuance terbaru untuk subject+schema
      const res = await fetch(`${this.cfg.baseUrl}/v1/auto-issuance/list-auto-issue?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: Array<Record<string, unknown>>; list?: Array<Record<string, unknown>> };
        const runs = (data.data ?? data.list ?? []) as Array<Record<string, unknown>>;
        const match = runs.find(
          (r) => String(r.schema_id ?? r.schemaId ?? "") === input.schemaId || String(r.subject ?? r.did ?? "") === input.participantSubject,
        );
        if (match && String(match.status ?? "").toLowerCase().includes("finish")) {
          return { ok: true, providerReference: String(match.credential_id ?? match.id ?? ""), raw: match as Record<string, unknown> };
        }
      }
      // Belum ada run: status RAME tetap PENDING menunggu webhook.
      return { ok: true };
    } catch (err) {
      if (err instanceof EidError) throw err;
      throw mapProviderError(err);
    }
  }
}
