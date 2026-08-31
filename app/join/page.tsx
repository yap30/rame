"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Fingerprint, Loader2, QrCode, ShieldCheck, Sparkles, UserRound, Building2 } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, Spinner } from "@/components/ui";
import { eidStatusClient } from "@/lib/client-env";
import { motion } from "framer-motion";

interface VcStart {
  ok: boolean;
  mode: string;
  sessionId: string;
  status: string;
  qr: string;
  eidOauthUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
}

interface VcStatus {
  ok: boolean;
  status: string;
  authenticated?: boolean;
  user?: { id: string; name: string; role: string };
}

function JoinInner() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ user: { name: string; role: string } | null } | null>(null);
  const eid = eidStatusClient();

  // state login QR
  const [vc, setVc] = useState<VcStart | null>(null);
  const [vcBusy, setVcBusy] = useState(false);
  const [vcStatus, setVcStatus] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    api<{ user: { name: string; role: string } | null }>("/api/auth/me").then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startVc = async () => {
    setVcBusy(true);
    setError(null);
    doneRef.current = false;
    try {
      const res = await api<VcStart>("/api/auth/eid/vc/start", { method: "POST" });
      setVc(res);
      setVcStatus(res.status ?? "PENDING");
      setCountdown(res.expiresInSeconds);
      // polling status
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        if (doneRef.current) return;
        try {
          const st = await api<VcStatus>(`/api/auth/eid/vc/status?sid=${res.sessionId}`);
          setVcStatus(st.status);
          if (st.authenticated && st.user) {
            doneRef.current = true;
            if (pollRef.current) clearInterval(pollRef.current);
            router.push(next);
            router.refresh();
          } else if (st.status === "EXPIRED" || st.status === "REJECTED") {
            doneRef.current = true;
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {
          // biarkan polling lanjut
        }
      }, 2000);
    } catch {
      setError(t("auth.loginQrError"));
    } finally {
      setVcBusy(false);
    }
  };

  const simulate = async () => {
    if (!vc) return;
    await api("/api/auth/eid/vc/mock-approve", { method: "POST", body: JSON.stringify({ sid: vc.sessionId }) });
  };

  // countdown QR
  useEffect(() => {
    if (!vc || countdown <= 0) return;
    const iv = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(iv);
  }, [vc, countdown]);

  const expired = vc ? countdown <= 0 : false;

  return (
    <div className="rame-container flex justify-center py-14">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="card !p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-ink">
              <QrCode className="h-7 w-7" />
            </span>
            <h1 className="font-display text-2xl font-bold">{t("auth.loginQr")}</h1>
            <p className="mt-2 text-sm text-ink/60">{t("auth.loginQrSub")}</p>
            <div className="mt-3 flex justify-center">
              <Badge tone={eid.real ? "brand" : "accent"}>{eid.label}</Badge>
            </div>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {/* QR LOGIN */}
          {!vc ? (
            <Button className="w-full !py-3 text-base" onClick={startVc} loading={vcBusy}>
              <QrCode className="h-5 w-5" /> {t("auth.loginQrStart")}
            </Button>
          ) : expired ? (
            <div className="rounded-2xl border border-ink/10 py-8 text-center">
              <div className="text-4xl">⏳</div>
              <p className="mt-2 text-sm font-semibold text-ink/60">{t("auth.loginQrExpired")}</p>
              <Button className="mt-4" onClick={startVc} loading={vcBusy}>
                {t("qr.refresh")}
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto inline-block rounded-2xl border-4 border-brand bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vc.qr} alt="Login QR" className="h-56 w-56" />
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-ink/55">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                {vcStatus === "WAITING_APPROVAL" || vcStatus === "SCANNED"
                  ? "QR sudah discan ✓ — selesaikan konfirmasi di aplikasi e.id…"
                  : vcStatus === "APPROVED"
                    ? t("auth.loginQrSuccess")
                    : t("auth.loginQrWaiting")}
                <span className="font-bold text-accent">({countdown}s)</span>
              </div>
              {vcStatus === "APPROVED" && (
                <Button className="mt-3 w-full" onClick={() => { doneRef.current = true; if (pollRef.current) clearInterval(pollRef.current); router.push(next); router.refresh(); }}>
                  {t("auth.loginQrSuccess")} →
                </Button>
              )}
              <a href={vc.eidOauthUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-brand underline">
                {t("auth.loginQrOpenWallet")} ↗
              </a>
              {eid.mode === "mock" && (
                <Button variant="ghost" className="mt-3 w-full" onClick={simulate}>
                  {t("auth.loginQrSimulate")}
                </Button>
              )}
            </div>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-ink/10" />
            {t("auth.loginAlternative")}
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          {/* OAuth SSO + demo (alternatif) */}
          <div className="space-y-2">
            <a href={"/api/auth/eid/start?next=" + encodeURIComponent(next)} className="btn-ghost w-full">
              <ShieldCheck className="h-4 w-4" /> {t("auth.signInEid")}
            </a>
            {eid.demoAllowed && (
              <>
                <button onClick={async () => { await api("/api/auth/mock-login", { method: "POST", body: JSON.stringify({ kind: "participant" }) }); router.push(next); router.refresh(); }} className="btn-ghost w-full">
                  <UserRound className="h-4 w-4" /> {t("auth.participantDemo")}
                </button>
                <button onClick={async () => { await api("/api/auth/mock-login", { method: "POST", body: JSON.stringify({ kind: "organizer" }) }); router.push(next); router.refresh(); }} className="btn-ghost w-full">
                  <Building2 className="h-4 w-4" /> {t("auth.organizerDemo")}
                </button>
                <button onClick={async () => { await api("/api/auth/mock-login", { method: "POST", body: JSON.stringify({ kind: "admin" }) }); router.push("/admin"); router.refresh(); }} className="btn-ghost w-full">
                  <ShieldCheck className="h-4 w-4" /> Masuk sebagai Admin (demo)
                </button>
              </>
            )}
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-ink/5 p-3 text-xs text-ink/55">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {eid.real
                ? "Login QR memakai Verifier API e.id (Login with VC) — verifikasi kredensial via dompet e.id."
                : t("common.mockNote")}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinInner />
    </Suspense>
  );
}
