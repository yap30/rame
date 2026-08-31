// ============================================================
// RAME — adapter OAuth SSO e.id (implementasi nyata)
// Flow sesuai docs.e.id/en/oauth-sso (v1.1, snake_case):
//   1. GET /oauth/client/:client_id/:callback_url  (Get App Name)
//   2. GET /oauth/verify?client_id=..&callback_url=..  (redirect browser)
//   3. callback?code=..  (one-time code)
//   4. POST /oauth/get-token  (server-side exchange, client_secret)
//   5. GET /oauth/get-profile?scope=email:profile  (Bearer token)
// ============================================================
import { OAuthAdapter, EidAppInfo, EidProfile } from "./types";
import { EidError, EidErrorCodes, mapProviderError } from "./errors";

export interface OAuthConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export class EidOAuthAdapter implements OAuthAdapter {
  mode: "sandbox" | "production";
  constructor(private cfg: OAuthConfig) {
    this.mode = cfg.baseUrl.includes("api-wallet") ? "production" : "sandbox";
  }

  private assertConfigured() {
    if (!this.cfg.clientId || !this.cfg.clientSecret) {
      throw new EidError(EidErrorCodes.NOT_CONFIGURED, "e.id OAuth belum dikonfigurasi. Isi EID_OAUTH_CLIENT_ID/SECRET di .env.");
    }
  }

  async getAppInfo(): Promise<EidAppInfo> {
    this.assertConfigured();
    try {
      const res = await fetch(`${this.cfg.baseUrl}/oauth/client/${encodeURIComponent(this.cfg.clientId)}/${encodeURIComponent(this.cfg.callbackUrl)}`, { cache: "no-store" });
      if (!res.ok) throw mapProviderError({ status: res.status, code: "OAUTH.CLIENT_NOT_FOUND" }, EidErrorCodes.CLIENT_NOT_FOUND);
      const data = (await res.json()) as { app_name?: string; appName?: string; icon_url?: string; iconUrl?: string; scopes?: string[] };
      return {
        appName: data.app_name ?? data.appName ?? "e.id",
        iconUrl: data.icon_url ?? data.iconUrl,
        scopes: data.scopes ?? ["profile"],
      };
    } catch (err) {
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
    return `${this.cfg.baseUrl}/oauth/verify?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<{ token: string; profile: EidProfile }> {
    this.assertConfigured();
    try {
      const tokenRes = await fetch(`${this.cfg.baseUrl}/oauth/get-token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.cfg.clientId,
          client_secret: this.cfg.clientSecret,
          code,
          redirect_uri: this.cfg.callbackUrl,
        }),
        cache: "no-store",
      });
      if (!tokenRes.ok) {
        const body = (await tokenRes.json().catch(() => ({}))) as { code?: string };
        throw mapProviderError({ status: tokenRes.status, code: body.code ?? "INVALID_OR_EXPIRED_CODE" }, EidErrorCodes.INVALID_CODE);
      }
      const tokenData = (await tokenRes.json()) as { token?: string; access_token?: string; accessToken?: string };
      const token = tokenData.token ?? tokenData.access_token ?? tokenData.accessToken;
      if (!token) throw new EidError(EidErrorCodes.PROVIDER_ERROR, "Token tidak ditemukan di respons provider.");

      const profileRes = await fetch(`${this.cfg.baseUrl}/oauth/get-profile?scope=email:profile`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!profileRes.ok) throw mapProviderError({ status: profileRes.status }, EidErrorCodes.UNAUTHORIZED);
      const raw = (await profileRes.json()) as Record<string, unknown>;

      const profile: EidProfile = {
        subject: String(raw.sub ?? raw.did ?? raw.id ?? raw.user_id ?? raw.subject ?? ""),
        email: typeof raw.email === "string" ? raw.email : undefined,
        name: typeof raw.name === "string" ? raw.name : typeof raw.full_name === "string" ? String(raw.full_name) : undefined,
        trustLevel: typeof raw.trust_level === "string" ? String(raw.trust_level) : undefined,
        raw,
      };
      if (!profile.subject) throw new EidError(EidErrorCodes.PROVIDER_ERROR, "Profil e.id tidak memiliki subject (DID).");
      return { token, profile };
    } catch (err) {
      if (err instanceof EidError) throw err;
      throw mapProviderError(err);
    }
  }
}
