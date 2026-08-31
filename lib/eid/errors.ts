// ============================================================
// RAME — error domain integrasi e.id
// API error tidak boleh membocorkan stack trace / token (blueprint §5)
// ============================================================

export class EidError extends Error {
  constructor(
    public code: string,
    message: string,
    public providerStatus?: number,
    public retryable = false,
  ) {
    super(message);
    this.name = "EidError";
  }
}

export const EidErrorCodes = {
  CLIENT_NOT_FOUND: "EID_CLIENT_NOT_FOUND",
  INVALID_CODE: "EID_INVALID_OR_EXPIRED_CODE",
  UNAUTHORIZED: "EID_UNAUTHORIZED",
  ISSUER_NOT_ONBOARDED: "EID_ISSUER_NOT_ONBOARDED",
  SCHEMA_NOT_FOUND: "EID_SCHEMA_NOT_FOUND",
  WEBHOOK_INVALID_SIGNATURE: "EID_WEBHOOK_INVALID_SIGNATURE",
  PROVIDER_TIMEOUT: "EID_PROVIDER_TIMEOUT",
  PROVIDER_ERROR: "EID_PROVIDER_ERROR",
  NOT_CONFIGURED: "EID_NOT_CONFIGURED",
} as const;

/** Konversi error provider menjadi error domain yang aman */
export function mapProviderError(err: unknown, fallbackCode: string = EidErrorCodes.PROVIDER_ERROR): EidError {
  if (err instanceof EidError) return err;
  const any = err as { status?: number; message?: string; code?: string };
  const status = typeof any?.status === "number" ? any.status : undefined;
  const msg = typeof any?.message === "string" ? any.message : "Provider error";
  if (status === 400 || any?.code === "INVALID_OR_EXPIRED_CODE" || any?.code === "OAUTH.INVALID_OR_EXPIRED_CODE") {
    return new EidError(EidErrorCodes.INVALID_CODE, "Kode otorisasi tidak valid atau kedaluwarsa.", status);
  }
  if (status === 401) return new EidError(EidErrorCodes.UNAUTHORIZED, "Provider menolak autentikasi.", status);
  if (status === 404 && any?.code === "OAUTH.CLIENT_NOT_FOUND") {
    return new EidError(EidErrorCodes.CLIENT_NOT_FOUND, "Client e.id tidak terdaftar.", status);
  }
  if (status === 408 || status === 504) return new EidError(EidErrorCodes.PROVIDER_TIMEOUT, "Provider timeout.", status, true);
  return new EidError(fallbackCode, msg, status);
}
