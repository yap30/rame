"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Fingerprint, ShieldCheck, Sparkles, UserRound, Building2 } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Spinner } from "@/components/ui";
import { eidStatusClient } from "@/lib/client-env";
import { motion } from "framer-motion";

function JoinInner() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [busy, setBusy] = useState<"eid" | "participant" | "organizer" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ user: { name: string; role: string } | null } | null>(null);
  const eid = eidStatusClient();

  useEffect(() => {
    api<{ user: { name: string; role: string } | null }>("/api/auth/me").then(setMe).catch(() => setMe(null));
  }, []);

  const doDemo = async (kind: "participant" | "organizer") => {
    setBusy(kind);
    setError(null);
    try {
      await api("/api/auth/mock-login", { method: "POST", body: JSON.stringify({ kind }) });
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
      setBusy(null);
    }
  };

  return (
    <div className="rame-container flex justify-center py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="card !p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-ink">
              <Fingerprint className="h-7 w-7" />
            </span>
            <h1 className="font-display text-2xl font-bold">{t("auth.signInEid")}</h1>
            <p className="mt-2 text-sm text-ink/60">{t("auth.signInSub")}</p>
            <div className="mt-3 flex justify-center">
              <Badge tone={eid.real ? "brand" : "accent"}>{eid.label}</Badge>
            </div>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {me?.user ? (
            <div className="mb-4 rounded-xl bg-brand-soft/60 p-4 text-center text-sm">
              {t("auth.welcome")}, <strong>{me.user.name}</strong>!
            </div>
          ) : null}

          {/* Tombol e.id — di mode mock, redirect langsung login demo participant */}
          <a href="/api/auth/eid/start?next=/events/jelajah-kota-tua" className="btn-primary w-full !py-3 text-base">
            {busy === "eid" ? <Spinner /> : null}
            <ShieldCheck className="h-5 w-5" /> {t("auth.signInEid")}
          </a>

          <div className="my-5 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-ink/10" />
            {t("auth.demoLogin")}
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <div className="space-y-2">
            <button onClick={() => doDemo("participant")} disabled={busy !== null} className="btn-ghost w-full justify-start">
              {busy === "participant" ? <Spinner className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
              {t("auth.participantDemo")}
            </button>
            <button onClick={() => doDemo("organizer")} disabled={busy !== null} className="btn-ghost w-full justify-start">
              {busy === "organizer" ? <Spinner className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              {t("auth.organizerDemo")}
            </button>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-ink/5 p-3 text-xs text-ink/55">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t("common.mockNote")}</span>
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
