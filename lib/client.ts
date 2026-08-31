// ============================================================
// RAME — hooks klien: bahasa + mekanik aplikasi tema
// ============================================================
"use client";

import { useEffect } from "react";
import { useUiStore, applyUi } from "@/lib/ui-store";
import { translate } from "@/lib/i18n";

/** Terjemahan dengan bahasa aktif */
export function useT() {
  const lang = useUiStore((s) => s.lang);
  return (key: string) => translate(key, lang);
}

/** Hook penerap tema identitas event + aksesibilitas ke <html> */
export function useThemeEffect(identity?: Record<string, unknown> | null) {
  const setIdentity = useUiStore((s) => s.setIdentity);
  useEffect(() => {
    if (identity) setIdentity(identity as never);
  }, [identity, setIdentity]);
}

/** Hook yang selalu menjaga a11y settings tetap terpasang */
export function useA11y() {
  const identity = useUiStore((s) => s.identity);
  const fontSize = useUiStore((s) => s.fontSize);
  const highContrast = useUiStore((s) => s.highContrast);
  const wideSpacing = useUiStore((s) => s.wideSpacing);
  useEffect(() => {
    applyUi(identity, fontSize, highContrast, wideSpacing);
  }, [identity, fontSize, highContrast, wideSpacing]);
}

/** Fetch JSON helper dengan error */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message ?? "Terjadi kesalahan";
    const code = (data as { error?: { code?: string } })?.error?.code ?? "UNKNOWN";
    const err = new Error(msg) as Error & { code: string; status: number };
    err.code = code;
    err.status = res.status;
    throw err;
  }
  return data as T;
}
