// ============================================================
// RAME — adapter OAuth SSO e.id (implementasi nyata, kontrak v1.1)
// Sumber: Postman Collection resmi e.id (docs.e.id/files/postman/
// eid-oauth-sso.postman_collection.json) — LIVE REFERENCE.
//
// Base URL OAuth (sandbox): https://gateway-sandbox.e.id
// Semua endpoint ber-prefix /api/v1.1/oauth/...
//
//   1. GET  /api/v1.1/oauth/client/{client_id}/{callback_url}  (Get App Name)
//   2. GET  /api/v1.1/oauth/verify?client_id=&callback_url=    (redirect browser)
//   3. callback?code=..  (one-time code)
//   4. POST /api/v1.1/oauth/get-token  JSON {client_id, client_secret, code, redirect_uri}
//      -> {status,message,data:{token_type,token,expired_date}}
//   5. GET  /api/v1.1/oauth/get-profile?scope=email:profile  (Bearer token)
//      -> {status,message,data:{email, profile:{fullname,tier,phonenumber,avatar,...}}}
// ============================================================
import { OAuthAdapter, EidAppInfo, EidProfile } from "./types";
import { EidError, EidErrorCodes, mapProviderError } from "./errors";

export interface OAuthConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

/** Base URL default per mode bila env kosong */
export function defaultOAuthBaseUrl(): string {
  return "https://gateway-sandbox.e.id";
}

interface EidEnvelope {
  status?: boolean;
  message?: string;
  data?: Record<string, unknown> | null;
}

export class EidOAuthAdapter implements OAuthAdapter {
  mode: "sandbox" | "production";
  constructor(private cfg: OAuthConfig) {
    this.mode = cfg.baseUrl.includes("gateway.e.id") && !cfg.baseUrl.includes("sandbox") ? "production" : "sandbox";
  }

  private assertConfigured() {
    if (!this.cfg.clientId || !this.cfg.clientSecret) {
      throw new EidError(EidErrorCodes.NOT_CONFIGURED, "e.id OAuth belum dikonfigurasi. Isi EID_OAUTH_CLIENT_ID/SECRET di .env.");
    }
  }

  private async get<T = EidEnvelope>(path: string, headers: Record<string, string> = {}): Promise<T> {
    const res = await fetch(`${this.cfg.baseUrl}${path}`, { headers: { accept: "application/json", ...headers }, cache: "no-store" });
    if (!res.ok) throw mapProviderError({ status: res.status });
    return (await res.json()) as T;
  }

  async getAppInfo(): Promise<EidAppInfo> {
    this.assertConfigured();
    try {
      const env = await this.get<EidEnvelope>(
        `/api/v1.1/oauth/client/${encodeURIComponent(this.cfg.clientId)}/${encodeURIComponent(this.cfg.callbackUrl)}`,
      );
      const data = env.data ?? {};
      return {
        appName: String(data.app_name ?? "e.id"),
        iconUrl: typeof data.icon_url === "string" ? data.icon_url : undefined,
        scopes: Array.isArray(data.scopes) ? (data.scopes as string[]) : ["profile"],
      };
    } catch (err) {
      if (err instanceof EidError && err.code === EidErrorCodes.PROVIDER_ERROR) {
        throw new EidError(EidErrorCodes.CLIENT_NOT_FOUND, "Client e.id tidak terdaftar untuk callback ini (OAUTH.CLIENT_NOT_FOUND).", 404);
      }
      if (err instanceof EidError) throw err;
      throw mapProviderError(err);
    }
  }

  buildAuthorizeUrl(state: string): string {
    this.assertConfigured();
    const params = new URLSearchParams({
      client_id: this.cfg.clientId,
      callback_url: this.cfg.callbackUrl,
      state,
    });
    return `${this.cfg.baseUrl}/api/v1.1/oauth/verify?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{ token: string; profile: EidProfile }> {
    this.assertConfigured();
    try {
      const tokenRes = await fetch(`${this.cfg.baseUrl}/api/v1.1/oauth/get-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          client_id: this.cfg.clientId,
          client_secret: this.cfg.clientSecret,
          code,
          redirect_uri: this.cfg.callbackUrl,
        }),
        cache: "no-store",
      });
      if (!tokenRes.ok) {
        const body = (await tokenRes.json().catch(() => ({}))) as EidEnvelope;
        const msg = body.message ?? "";
        if (msg.includes("INVALID_OR_EXPIRED_CODE")) {
          throw new EidError(EidErrorCodes.INVALID_CODE, "Kode otorisasi tidak valid atau kedaluwarsa.", tokenRes.status);
        }
        if (msg.includes("INVALID_CLIENT_CREDENTIALS")) {
          throw new EidError(EidErrorCodes.UNAUTHORIZED, "Credentials e.id ditolak provider.", tokenRes.status);
        }
        throw mapProviderError({ status: tokenRes.status });
      }
      const tokenBody = (await tokenRes.json()) as EidEnvelope;
      const data = tokenBody.data ?? {};
      const token = String(data.token ?? "");
      if (!token) throw new EidError(EidErrorCodes.PROVIDER_ERROR, "Token tidak ditemukan di respons provider.");

      // profil dengan scope email:profile
      const profileRes = await fetch(`${this.cfg.baseUrl}/api/v1.1/oauth/get-profile?scope=email:profile`, {
        headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
        cache: "no-store",
      });
      if (!profileRes.ok) throw mapProviderError({ status: profileRes.status }, EidErrorCodes.UNAUTHORIZED);
      const profileBody = (await profileRes.json()) as EidEnvelope;
      const pd = (profileBody.data ?? {}) as { email?: string; profile?: { fullname?: string; phonenumber?: string; tier?: number; avatar?: string } };
      // Trust Level e.id (docs.e.id/en/oauth-sso): 0=Unverified, 1=Basic, 2=Moderate.
      // Disimpan internal (identity metadata) — bukan level credential RAME.
      const TIER_LABELS: Record<number, string> = { 0: "Unverified", 1: "Basic", 2: "Moderate" };
      const tier: string | undefined = typeof pd.profile?.tier === "number" ? (TIER_LABELS[pd.profile.tier] ?? undefined) : undefined;

      const email = pd.email ?? "";
      const p = pd.profile ?? {};
      const subject = email || `eid:${String(p.phonenumber ?? "")}` || `eid:${this.cfg.clientId}:${token.slice(0, 8)}`;

      const profile: EidProfile = {
        subject,
        email: email || undefined,
        name: p.fullname || undefined,
        trustLevel: tier,
        raw: profileBody as unknown as Record<string, unknown>,
      };
      return { token, profile };
    } catch (err) {
      if (err instanceof EidError) throw err;
      throw mapProviderError(err);
    }
  }
}
