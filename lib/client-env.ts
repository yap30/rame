// ============================================================
// RAME — konfigurasi mode e.id untuk sisi klien (aman, tanpa rahasia)
// ============================================================
"use client";

export function eidStatusClient() {
  const mode = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_EID_MODE) || "";
  const real = mode === "sandbox" || mode === "production";
  return {
    mode: real ? mode : "mock",
    real,
    label: real ? (mode === "sandbox" ? "e.id Sandbox" : "e.id Production") : "Mode Demo",
    // nilai publik saja — tidak pernah menaruh secret di client
    oauthConfigured: Boolean(process.env.NEXT_PUBLIC_EID_OAUTH_READY),
  };
}
