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
  users: { id: string; name: string; email: string | null; role: string; status: string; suspendReason: string | null; eidSubject: string | null; orgs: { name: string; role: string }[]; createdAt: string }[];
}

interface CredentialsData {
  credentials: { id: string; eventName: string | null; title: string; participant: string; status: string; localOnly: boolean; revokedAt: string | null; revokeReason: string | null; createdAt: string }[];
}

interface ReportsData {
  reports: { id: string; reporter: string; targetType: string; targetId: string; category: string; description: string | null; status: string; resolution: string | null; createdAt: string }[];
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
  const { data: credentialsData } = useQuery({ queryKey: ["admin-credentials"], queryFn: () => api<CredentialsData>("/api/admin/credentials") });
  const { data: reportsData } = useQuery({ queryKey: ["admin-reports"], queryFn: () => api<ReportsData>("/api/admin/reports") });

  // suspend/unsuspend user (dengan alasan)
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string; reason?: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const suspend = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api(`/api/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setSuspendTarget(null);
      setSuspendReason("");
    },
  });

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

  // revoke kredensial (lokal RAME)
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; title: string; reason?: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const revokeCred = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api(`/api/admin/credentials/${id}/revoke`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-credentials"] });
      setRevokeTarget(null);
      setRevokeReason("");
    },
  });

  // status laporan
  const [reportNote, setReportNote] = useState<Record<string, string>>({});
  const reportAction = useMutation({
    mutationFn: ({ id, status, resolution }: { id: string; status: string; resolution?: string }) =>
      api(`/api/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status, resolution }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reports"] }),
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
              {u.status === "SUSPENDED" ? (
                <Badge tone="accent">⛔ SUSPENDED</Badge>
              ) : (
                <button
                  onClick={() => {
                    setSuspendTarget({ id: u.id, name: u.name });
                    setSuspendReason("");
                  }}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  ⛔ Suspend
                </button>
              )}
              {u.status === "SUSPENDED" && (
                <button
                  onClick={() => suspend.mutate({ id: u.id, status: "ACTIVE" })}
                  className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50"
                  title={u.suspendReason ?? undefined}
                >
                  ↺ Pulihkan
                </button>
              )}
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

      {/* kredensial (revoke lokal RAME) */}
      <div className="card mb-8 !p-0">
        <div className="border-b border-ink/10 px-5 py-4 font-display text-lg font-bold">🎓 Kredensial ({credentialsData?.credentials.length ?? 0})</div>
        <div className="divide-y divide-ink/5">
          {(credentialsData?.credentials ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink/50">Belum ada penerbitan kredensial.</div>
          ) : (
            (credentialsData?.credentials ?? []).map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{c.title}</div>
                  <div className="truncate text-xs text-ink/50">
                    {c.eventName ?? "—"} · {c.participant}
                    {c.revokeReason && <span className="ml-1 text-red-500">· {c.revokeReason}</span>}
                  </div>
                </div>
                {c.status === "REVOKED" ? (
                  <Badge tone="accent">⛔ REVOKED{c.localOnly ? " (lokal)" : ""}</Badge>
                ) : (
                  <>
                    <Badge tone={c.status === "ISSUED" ? "brand" : "neutral"}>{c.status}</Badge>
                    <button
                      onClick={() => {
                        setRevokeTarget({ id: c.id, title: c.title });
                        setRevokeReason("");
                      }}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      ⛔ Revoke (lokal)
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* laporan */}
      <div className="card mb-8 !p-0">
        <div className="border-b border-ink/10 px-5 py-4 font-display text-lg font-bold">📮 Laporan ({reportsData?.reports.length ?? 0})</div>
        <div className="divide-y divide-ink/5">
          {(reportsData?.reports ?? []).length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink/50">Belum ada laporan.</div>
          ) : (
            (reportsData?.reports ?? []).map((r) => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {r.category} <span className="text-ink/45">({r.targetType}: {r.targetId.slice(0, 12)}…)</span>
                    </div>
                    <div className="truncate text-xs text-ink/50">
                      {r.reporter} · {r.description ?? "—"}
                    </div>
                  </div>
                  <Badge tone={r.status === "OPEN" ? "accent" : r.status === "RESOLVED" ? "brand" : r.status === "DISMISSED" ? "neutral" : "brand"}>{r.status}</Badge>
                  <input
                    className="input !w-40 !py-1.5 text-xs"
                    placeholder="Catatan/nota"
                    value={reportNote[r.id] ?? ""}
                    onChange={(e) => setReportNote((m) => ({ ...m, [r.id]: e.target.value }))}
                  />
                  <select
                    className="input !w-auto !py-1.5 text-xs"
                    value={r.status}
                    onChange={(e) => reportAction.mutate({ id: r.id, status: e.target.value, resolution: reportNote[r.id] || undefined })}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="INVESTIGATING">INVESTIGATING</option>
                    <option value="ACTION_REQUIRED">ACTION_REQUIRED</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="DISMISSED">DISMISSED</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* modal suspend */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setSuspendTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-lg font-bold">⛔ Suspend {suspendTarget.name}</div>
            <p className="mt-1 text-xs text-ink/55">User tidak bisa login/mengakses fitur sampai dipulihkan admin. Alasan wajib diisi.</p>
            <textarea
              className="input mt-4 min-h-[90px]"
              placeholder="Alasan suspend…"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSuspendTarget(null)}>Batal</Button>
              <Button
                variant="accent"
                onClick={() => suspend.mutate({ id: suspendTarget.id, status: "SUSPENDED", reason: suspendReason })}
                disabled={!suspendReason.trim()}
                loading={suspend.isPending}
              >
                ⛔ Suspend
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* modal revoke kredensial */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setRevokeTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="font-display text-lg font-bold">⛔ Revoke kredensial</div>
            <p className="mt-1 text-xs text-ink/55">
              "{revokeTarget.title}" — revoke berlaku <strong>lokal di RAME</strong> (sinkronisasi ke e.id menyusul setelah issuer di-onboard).
            </p>
            <textarea
              className="input mt-4 min-h-[90px]"
              placeholder="Alasan revoke…"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRevokeTarget(null)}>Batal</Button>
              <Button
                variant="accent"
                onClick={() => revokeCred.mutate({ id: revokeTarget.id, reason: revokeReason })}
                disabled={!revokeReason.trim()}
                loading={revokeCred.isPending}
              >
                ⛔ Revoke
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
