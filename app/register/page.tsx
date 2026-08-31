"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Fingerprint, Loader2, QrCode, Sparkles, UserRound } from "lucide-react";
import { api, useT } from "@/lib/client";
import { eidStatusClient } from "@/lib/client-env";

function RegisterForm() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/events";

  const eid = eidStatusClient();
  const [qr, setQr] = useState<{ sessionId: string; qr: string; status: string } | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "waiting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startQr = async () => {
    setError(null);
    setPhase("loading");
    try {
      const res = await api<{ sessionId: string; qr: string; status: string }>("/api/auth/eid/vc/start", { method: "POST" });
      setQr(res);
      setPhase("waiting");
      clearPoll();
      pollRef.current = setInterval(async () => {
        if (doneRef.current) return;
        try {
          const st = await api<{ status: string; authenticated: boolean }>(`/api/auth/eid/vc/status?sid=${res.sessionId}`);
          setPhase((p) => (p === "waiting" ? p : p));
          if (st.authenticated) {
            doneRef.current = true;
            clearPoll();
            setPhase("done");
            setTimeout(() => {
              router.push(next);
              router.refresh();
            }, 400);
          } else if (st.status === "REJECTED" || st.status === "EXPIRED") {
            clearPoll();
            setError(st.status === "REJECTED" ? "Login ditolak." : "QR kedaluwarsa — buat ulang.");
            setPhase("idle");
            setQr(null);
          }
        } catch {
          // polling lanjut
        }
      }, 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat QR.");
      setPhase("idle");
    }
  };

  useEffect(() => () => clearPoll(), []);

  const demoLogin = async (kind: "participant" | "organizer") => {
    await api("/api/auth/mock-login", { method: "POST", body: JSON.stringify({ kind }) });
    router.push(next);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="section-kicker">{t("register.title")}</div>
      <h1 className="section-title mb-2">{t("register.title")}</h1>
      <p className="mb-5 text-sm text-ink/60">{t("register.sub")}</p>

      {/* catatan: pilih peran setelah login */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand/5 p-4 text-sm leading-relaxed text-ink/75">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <span>{t("register.roleNote")}</span>
      </div>

      <div className="card space-y-4 !p-5">
        {phase === "waiting" && qr ? (
          <div className="text-center">
            <div className="mx-auto inline-block rounded-2xl border-4 border-brand bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.qr} alt="QR login e.id" className="h-56 w-56" />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink/60">📱 {t("register.withEidSub")}</p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-ink/50">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menunggu scan…
            </div>
            {eid.demoAllowed && (
              <button onClick={() => api(`/api/auth/eid/vc/mock-approve`, { method: "POST", body: JSON.stringify({ sid: qr.sessionId }) })} className="btn-ghost mt-3 text-xs">
                Simulasikan scan (demo)
              </button>
            )}
          </div>
        ) : (
          <>
            <button onClick={startQr} disabled={phase === "loading"} className="btn-primary w-full !py-3">
              {phase === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              {t("register.withEid")}
            </button>
            <a href={"/api/auth/eid/start?next=" + encodeURIComponent(next)} className="btn-ghost w-full">
              <Fingerprint className="h-4 w-4" /> {t("register.orOauth")}
            </a>

            {eid.demoAllowed && (
              <div className="border-t border-ink/10 pt-3">
                <div className="mb-2 text-center text-xs font-semibold text-ink/45">Mode demo</div>
                <div className="flex gap-2">
                  <button onClick={() => demoLogin("participant")} className="btn-ghost flex-1 !py-2 text-xs">
                    <UserRound className="h-3.5 w-3.5" /> Peserta
                  </button>
                  <button onClick={() => demoLogin("organizer")} className="btn-ghost flex-1 !py-2 text-xs">
                    ✨ Penyelenggara
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="rame-container py-14">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
