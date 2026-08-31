"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Fingerprint, LayoutDashboard, LogOut } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge } from "@/components/ui";

interface Me {
  user: {
    id: string;
    name: string;
    email?: string | null;
    role: string;
    orgId?: string | null;
    eid?: { subject: string; trustLevel?: string | null } | null;
    memberships: { organizationId: string; name: string; role: string }[];
  } | null;
  eid: { mode: string; label: string; real: boolean };
}

export default function ProfilePage() {
  const t = useT();
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/api/auth/me") });

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

  return (
    <div className="rame-container max-w-2xl py-12">
      <div className="card !p-8">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-brand-ink">
            {u.name.charAt(0)}
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">{u.name}</h1>
            <div className="text-sm text-ink/55">{u.email ?? "—"}</div>
            <div className="mt-1.5 flex gap-2">
              <Badge tone="brand">{u.role}</Badge>
              <Badge tone="accent">{data.eid.label}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-ink/10 pt-6">
          <div className="flex items-center gap-3">
            <Fingerprint className="h-5 w-5 text-ink/40" />
            <div>
              <div className="text-sm font-bold">{t("auth.provider")}</div>
              <div className="font-mono text-xs text-ink/50">{u.eid?.subject ?? "did:idchain:…"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-ink/40" />
            <div>
              <div className="text-sm font-bold">{t("auth.trustLevel")}</div>
              <div className="text-xs text-ink/50">{u.eid?.trustLevel ?? "—"}</div>
            </div>
          </div>
        </div>

        {u.memberships.length > 0 && (
          <div className="mt-6">
            <div className="label">{t("nav.organizer")}</div>
            <div className="space-y-2">
              {u.memberships.map((m) => (
                <div key={m.organizationId} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white/60 px-4 py-3 text-sm">
                  <span className="font-semibold">{m.name}</span>
                  <Badge>{m.role}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {u.role === "ORGANIZER" && (
            <Link href="/organizer" className="btn-primary">
              <LayoutDashboard className="h-4 w-4" /> {t("nav.organizer")}
            </Link>
          )}
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
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
