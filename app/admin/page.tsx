"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, Spinner, StatCard } from "@/components/ui";

interface Overview {
  overview: { users: number; organizations: number; events: number; participants: number; loginSessions: number; completions: number };
  eid: { mode: string; label: string; real: boolean };
}

interface UsersData {
  users: { id: string; name: string; email: string | null; role: string; eidSubject: string | null; orgs: { name: string; role: string }[]; createdAt: string }[];
}

interface EventsData {
  events: { id: string; name: string; slug: string; status: string; city: string | null; createdAt: string; organization: string; participants: number; activities: number }[];
}

const ROLE_TONE: Record<string, "brand" | "accent" | "neutral"> = {
  ADMIN: "accent",
  ORGANIZER: "brand",
  PARTICIPANT: "neutral",
};

export default function AdminPage() {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => api<{ user: { role: string } | null }>("/api/auth/me") });
  const { data: overview, isLoading: loadingOv } = useQuery({ queryKey: ["admin-overview"], queryFn: () => api<Overview>("/api/admin/overview") });
  const { data: usersData, isLoading: loadingUsers } = useQuery({ queryKey: ["admin-users"], queryFn: () => api<UsersData>("/api/admin/users") });
  const { data: eventsData, isLoading: loadingEvents } = useQuery({ queryKey: ["admin-events"], queryFn: () => api<EventsData>("/api/admin/events") });

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  // review event (approve/reject) — SUBMITTED
  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      api(`/api/organizer/events/${id}/publish`, { method: "POST", body: JSON.stringify({ decision }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });

  if (me && !me.user) {
    router.replace("/join?next=/admin");
    return null;
  }
  if (me?.user?.role !== "ADMIN") {
    return (
      <div className="rame-container max-w-md py-24 text-center">
        <div className="text-5xl">🛡️</div>
        <p className="mt-3 text-ink/60">{t("error.forbidden")}</p>
      </div>
    );
  }

  return (
    <div className="rame-container py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-ink"><ShieldCheck className="h-6 w-6" /></span>
        <div>
          <div className="section-kicker">RAME Admin</div>
          <h1 className="section-title">Admin Platform</h1>
        </div>
      </div>

      {/* statistik */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {loadingOv ? (
          <Spinner className="h-6 w-6" />
        ) : (
          <>
            <StatCard value={String(overview?.overview.users ?? 0)} label="Pengguna" icon="👥" />
            <StatCard value={String(overview?.overview.organizations ?? 0)} label="Organisasi" icon="🏢" />
            <StatCard value={String(overview?.overview.events ?? 0)} label="Event" icon="🎪" />
            <StatCard value={String(overview?.overview.participants ?? 0)} label="Partisipasi" icon="📋" />
            <StatCard value={String(overview?.overview.loginSessions ?? 0)} label="Sesi Login VC" icon="🔐" />
            <StatCard value={String(overview?.overview.completions ?? 0)} label="Penyelesaian" icon="✅" />
          </>
        )}
      </div>

      {/* status e.id */}
      <div className="card mb-8 flex flex-wrap items-center justify-between gap-2 !p-4">
        <div className="text-sm font-bold">e.id Gateway</div>
        <div className="flex gap-2">
          <Badge tone={overview?.eid.real ? "brand" : "accent"}>{overview?.eid.label ?? "…"}</Badge>
          <Badge>{overview?.eid.mode}</Badge>
        </div>
      </div>

      {/* review event (menunggu approval admin) */}
      <div className="card mb-8 !p-0">
        <div className="border-b border-ink/10 px-5 py-4 font-display text-lg font-bold">
          🚀 Review Event ({eventsData?.events.filter((e) => e.status === "SUBMITTED").length ?? 0})
        </div>
        <div className="divide-y divide-ink/5">
          {loadingEvents ? (
            <div className="px-5 py-8 text-center"><Spinner className="mx-auto h-6 w-6" /></div>
          ) : (eventsData?.events ?? []).filter((e) => e.status === "SUBMITTED").length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink/50">Tidak ada event menunggu review.</div>
          ) : (
            (eventsData?.events ?? [])
              .filter((e) => e.status === "SUBMITTED")
              .map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/organizer/events/${e.id}`} className="truncate text-sm font-bold hover:text-brand">
                      {e.name}
                    </Link>
                    <div className="truncate text-xs text-ink/50">
                      {e.organization} · {e.city ?? "—"} · {e.activities} aktivitas · {e.participants} peserta
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="accent" className="!px-3 !py-1.5 text-xs" onClick={() => review.mutate({ id: e.id, decision: "approve" })} loading={review.isPending}>
                      ✓ Setujui
                    </Button>
                    <Button variant="ghost" className="!px-3 !py-1.5 text-xs !text-red-600" onClick={() => review.mutate({ id: e.id, decision: "reject" })}>
                      ✕ Tolak
                    </Button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* daftar pengguna */}
      <div className="card !p-0">
        <div className="border-b border-ink/10 px-5 py-4 font-display text-lg font-bold">Pengguna ({usersData?.users.length ?? 0})</div>
        <div className="divide-y divide-ink/5">
          {usersData?.users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                {u.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{u.name}</div>
                <div className="truncate text-xs text-ink/50">
                  {u.email ?? "—"}
                  {u.eidSubject && <span className="ml-2 font-mono">{u.eidSubject.slice(0, 28)}…</span>}
                </div>
                {u.orgs.length > 0 && <div className="mt-0.5 text-[11px] text-ink/45">{u.orgs.map((o) => `${o.name} (${o.role})`).join(", ")}</div>}
              </div>
              <Badge tone={ROLE_TONE[u.role] ?? "neutral"}>{u.role}</Badge>
              <select
                className="input !w-auto !py-1.5 text-xs"
                value={u.role}
                onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value })}
              >
                <option value="PARTICIPANT">PARTICIPANT</option>
                <option value="ORGANIZER">ORGANIZER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          ))}
          {loadingUsers && <div className="px-5 py-8 text-center"><Spinner className="mx-auto" /></div>}
        </div>
      </div>
    </div>
  );
}
