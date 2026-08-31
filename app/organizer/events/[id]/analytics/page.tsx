"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, useT } from "@/lib/client";
import { FadeUp, ProgressBar, Spinner, StatCard, EmptyState } from "@/components/ui";
import { motion } from "framer-motion";

interface Analytics {
  analytics: {
    totalParticipants: number;
    totalCompletions: number;
    completedParticipants: number;
    completionRate: number;
    totalStamps: number;
    totalXp: number;
    avgXp: number;
    feedbackScore: number | null;
    feedbackCount: number;
    verifyFailures: number;
    verifySuccess: number;
    verifyFailureRate: number;
    rewardDist: { stampId: string; name: string; emoji: string; count: number }[];
    dropOff: { position: number; title: string; icon: string; completed: number; rate: number }[];
    activityPerf: { activityId: string; title: string; icon: string; completed: number; started: number; rate: number }[];
    xpDist: { userId: string; name: string; xp: number }[];
  };
}

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const { data, isLoading } = useQuery({ queryKey: ["org-analytics", id], queryFn: () => api<Analytics>(`/api/organizer/events/${id}/analytics`) });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="py-20 text-center">{t("common.notFound")}</div>;

  const a = data.analytics;

  if (a.totalParticipants === 0) return <EmptyState icon="📊" title={t("org.noData")} />;

  const maxDrop = Math.max(1, ...a.dropOff.map((d) => d.completed));

  return (
    <div>
      <div className="section-kicker">{t("org.analytics")}</div>
      <h1 className="section-title mb-6">{t("org.overview")}</h1>

      {/* metrik utama */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={String(a.totalParticipants)} label={t("org.totalParticipants")} icon="👥" />
        <StatCard value={`${Math.round(a.completionRate * 100)}%`} label={t("org.completionRate")} icon="✅" />
        <StatCard value={String(a.totalStamps)} label={t("org.totalStamps")} icon="📮" />
        <StatCard value={a.feedbackScore !== null ? `${a.feedbackScore}/5` : "—"} label={t("org.feedbackScore")} icon="⭐" />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard value={String(a.totalCompletions)} label={t("org.totalCompletions")} icon="🏁" />
        <StatCard value={String(a.avgXp)} label={t("org.avgXp")} icon="⚡" />
        <StatCard value={`${Math.round(a.verifyFailureRate * 100)}%`} label={t("org.verifyFailures")} icon="🔎" />
        <StatCard value={String(a.verifyFailures + a.verifySuccess)} label="Total scan" icon="📷" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* drop-off per titik */}
        <FadeUp>
          <div className="card">
            <h3 className="mb-4 font-display text-lg font-bold">{t("org.dropOff")}</h3>
            <div className="space-y-3">
              {a.dropOff.map((d, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold">{d.icon} {d.title}</span>
                    <span className="text-ink/50">{d.completed} · {Math.round(d.rate * 100)}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: i === 0 ? "rgb(var(--rame-accent))" : "rgb(var(--rame-brand))" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(d.completed / maxDrop) * 100}%` }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* distribusi reward */}
        <FadeUp delay={0.05}>
          <div className="card">
            <h3 className="mb-4 font-display text-lg font-bold">{t("org.rewardDist")}</h3>
            <div className="space-y-3">
              {a.rewardDist.map((r) => (
                <div key={r.stampId} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg" style={{ background: "rgb(var(--rame-accent-soft))" }}>{r.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{r.name}</span><span className="text-ink/50">{r.count}</span></div>
                    <ProgressBar value={r.count / Math.max(1, a.rewardDist[0].count)} />
                  </div>
                </div>
              ))}
              {a.rewardDist.length === 0 && <div className="text-sm text-ink/50">—</div>}
            </div>
          </div>
        </FadeUp>

        {/* performa aktivitas */}
        <FadeUp delay={0.1}>
          <div className="card">
            <h3 className="mb-4 font-display text-lg font-bold">Performa Aktivitas</h3>
            <div className="space-y-2">
              {a.activityPerf.map((p) => (
                <div key={p.activityId} className="flex items-center justify-between rounded-xl border border-ink/10 bg-white/50 px-3 py-2.5 text-sm">
                  <span className="font-semibold">{p.icon} {p.title}</span>
                  <span className="text-xs text-ink/55">mulai {p.started} · selesai {p.completed}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* XP leaderboard */}
        <FadeUp delay={0.15}>
          <div className="card">
            <h3 className="mb-4 font-display text-lg font-bold">Top XP Peserta</h3>
            <div className="space-y-2">
              {a.xpDist.map((x, i) => (
                <div key={x.userId} className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white/50 px-3 py-2 text-sm">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${i === 0 ? "bg-gold/20 text-gold" : "bg-ink/5 text-ink/60"}`}>{i + 1}</span>
                  <span className="flex-1 truncate font-semibold">{x.name}</span>
                  <span className="text-xs font-bold text-accent">{x.xp} XP</span>
                </div>
              ))}
              {a.xpDist.length === 0 && <div className="text-sm text-ink/50">—</div>}
            </div>
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
