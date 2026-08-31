"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, LayoutDashboard, LogOut, Shield, UserRound } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge } from "@/components/ui";
import { useUiStore } from "@/lib/ui-store";

interface Me {
  user: {
    id: string;
    name: string;
    email?: string | null;
    role: string;
    orgId?: string | null;
    eidConnected?: boolean;
  } | null;
  eid: { mode: string; label: string; real: boolean };
}

export default function ProfilePage() {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/api/auth/me") });

  // pilih "Event Organizer" padahal role masih participant → aktifkan EO dulu (ensure)
  const ensure = useMutation({
    mutationFn: () => api("/api/organizer/ensure", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      setView("organizer");
      router.refresh();
    },
  });

  const pickRole = (v: "participant" | "organizer" | "admin") => {
    if (v === "organizer" && data?.user?.role !== "ORGANIZER" && data?.user?.role !== "ADMIN") {
      ensure.mutate();
      return;
    }
    setView(v);
    router.refresh();
  };

  if (isLoading) return <div className="rame-container py-20 text-center text-sm text-ink/50">{t("common.loading")}</div>;
  if (!data?.user) {
    return (
      <div className="rame-container py-20 text-center">
        <div className="text-4xl">🔐</div>
        <p className="mt-3 text-ink/60">{t("auth.requireLogin")}</p>
        <Link href="/join" className="btn-primary mt-4">{t("common.login")}</Link>
      </div>
    );
  }

  const u = data.user;
  const canOrganizer = u.role === "ORGANIZER" || u.role === "ADMIN";
  const canAdmin = u.role === "ADMIN";
  const roles: { value: "participant" | "organizer" | "admin"; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { value: "participant", label: t("role.participant"), icon: <UserRound className="h-4 w-4" /> },
    // organizer selalu bisa dipilih — bila belum EO, otomatis diaktifkan (ensure)
    { value: "organizer", label: t("role.organizer"), icon: <Building2 className="h-4 w-4" /> },
    { value: "admin", label: t("role.admin"), icon: <Shield className="h-4 w-4" />, disabled: !canAdmin },
  ];
  const activeView = view === "admin" && !canAdmin ? (canOrganizer ? "organizer" : "participant") : view === "organizer" && !canOrganizer ? "participant" : view;

  return (
    <div className="rame-container max-w-2xl py-12">
      <div className="card !p-8">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-16 w-16 rounded-2xl border border-ink/10 bg-white object-contain p-1" />
          <div>
            <h1 className="font-display text-2xl font-bold">{u.name}</h1>
            <div className="text-sm text-ink/55">{u.email ?? "—"}</div>
            <div className="mt-1.5 flex gap-2">
              <Badge tone="brand">{u.role}</Badge>
              {u.eidConnected && <Badge tone="success">✓ {t("auth.connected")}</Badge>}
            </div>
          </div>
        </div>

        {/* pilih peran — menentukan menu & halaman yang tampil */}
        <div className="mt-6 rounded-2xl border border-brand/15 bg-brand/5 p-4">
          <div className="label">{t("profile.role") ?? "Peran aktif"}</div>
          <div className="mt-1 text-xs text-ink/55">{t("profile.roleNote")}</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => pickRole(r.value)}
                disabled={r.disabled}
                title={r.disabled ? (r.value === "admin" ? "Khusus role Admin" : "Aktifkan via menu Buat Event") : undefined}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  activeView === r.value ? "border-brand bg-brand text-brand-ink shadow-lift" : "border-ink/15 hover:bg-ink/5"
                } ${r.disabled ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-ink/10 pt-6">
          <div className="flex items-center gap-3">
            <span className="text-lg">🪪</span>
            <div>
              <div className="text-sm font-bold">{t("auth.connected")}</div>
              <div className="text-xs text-ink/50">{t("auth.connectedSub")}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {activeView === "organizer" && (
            <Link href="/organizer" className="btn-primary">
              <LayoutDashboard className="h-4 w-4" /> {t("nav.organizer")}
            </Link>
          )}
          {activeView === "admin" && (
            <Link href="/admin" className="btn-primary">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              qc.clear(); // buang cache personal agar tidak bocor ke user lain
              router.push("/");
              router.refresh();
            }}
            className="btn-ghost text-red-600"
          >
            <LogOut className="h-4 w-4" /> {t("common.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
