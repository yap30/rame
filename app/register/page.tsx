"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Building2, QrCode, UserRound } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Button, FadeUp } from "@/components/ui";

function RegisterInner() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/organizer";

  const [form, setForm] = useState({ name: "", email: "", orgName: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/register/organizer", { method: "POST", body: JSON.stringify(form) });
      router.push(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mendaftar");
      setBusy(false);
    }
  };

  return (
    <div className="rame-container max-w-2xl py-12">
      <div className="section-kicker">Daftar</div>
      <h1 className="section-title mb-8">Register</h1>

      <div className="grid gap-5 md:grid-cols-2">
        {/* PARTISIPAN */}
        <FadeUp>
          <div className="card flex h-full flex-col !p-6">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-brand-ink">
              <UserRound className="h-5 w-5" />
            </span>
            <h2 className="font-display text-lg font-bold">Partisipan</h2>
            <p className="mt-1 flex-1 text-sm text-ink/60">
              Akun dibuat otomatis saat kamu login pertama kali dengan e.id — cukup scan QR atau masuk dengan akun e.id. Tidak perlu isi formulir.
            </p>
            <a href="/join" className="btn-primary mt-4 w-full">
              <QrCode className="h-4 w-4" /> {t("auth.loginQr")}
            </a>
          </div>
        </FadeUp>

        {/* ORGANIZER */}
        <FadeUp delay={0.05}>
          <div className="card h-full !p-6">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <h2 className="font-display text-lg font-bold">Event Organizer</h2>
            <p className="mt-1 text-sm text-ink/60">Daftarkan organisasimu untuk membuat & mengelola event, journey, scanner, dan analitik.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Nama lengkap</label>
                <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama kamu" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="kamu@organisasi.id" />
              </div>
              <div>
                <label className="label">Nama organisasi / komunitas</label>
                <input className="input" value={form.orgName} onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))} placeholder="Komunitas …" />
              </div>
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
              <Button className="w-full" onClick={submit} loading={busy} disabled={!form.name || !form.email || !form.orgName}>
                Daftar sebagai Organizer
              </Button>
              <p className="text-[11px] text-ink/45">Prototype: pendaftaran langsung aktif. Produksi sebaiknya melewati persetujuan admin/onboarding.</p>
            </div>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  );
}
