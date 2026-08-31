"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { History, Play, User } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, FadeUp, Spinner, EmptyState } from "@/components/ui";

interface Replay {
  replay: {
    logs: {
      id: string;
      action: string;
      actorType: string;
      createdAt: string;
      dataJson: Record<string, unknown> | null;
      user: { name: string; email?: string | null } | null;
    }[];
    total: number;
  };
}

const ACTION_META: Record<string, { label: string; emoji: string; tone: "neutral" | "brand" | "accent" | "success" | "danger" }> = {
  EVENT_JOINED: { label: "Gabung event", emoji: "👋", tone: "brand" },
  ACTIVITY_STARTED: { label: "Mulai aktivitas", emoji: "▶️", tone: "neutral" },
  ACTIVITY_COMPLETED: { label: "Aktivitas selesai", emoji: "✅", tone: "success" },
  VERIFICATION_COMPLETED: { label: "Verifikasi QR", emoji: "📷", tone: "success" },
  STAMP_AWARDED: { label: "Stempel diberikan", emoji: "📮", tone: "accent" },
  XP_AWARDED: { label: "XP diberikan", emoji: "⚡", tone: "accent" },
  ACHIEVEMENT_UNLOCKED: { label: "Pencapaian terbuka", emoji: "🏆", tone: "accent" },
  CREDENTIAL_ELIGIBLE: { label: "Kredensial: layak", emoji: "📜", tone: "brand" },
  CREDENTIAL_ISSUED: { label: "Kredensial terbit", emoji: "🎓", tone: "success" },
  FEEDBACK_SUBMITTED: { label: "Umpan balik", emoji: "💬", tone: "neutral" },
  SCAN_REJECTED: { label: "Scan ditolak", emoji: "⛔", tone: "danger" },
  OFFLINE_SYNCED: { label: "Sinkron offline", emoji: "🔄", tone: "neutral" },
};

export default function ReplayPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const { data, isLoading } = useQuery({ queryKey: ["org-replay", id], queryFn: () => api<Replay>(`/api/organizer/events/${id}/replay`) });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="py-20 text-center">{t("common.notFound")}</div>;

  const logs = data.replay.logs;

  return (
    <div className="max-w-2xl">
      <div className="section-kicker">{t("org.replay")}</div>
      <h1 className="section-title mb-2">{t("org.replayTitle")}</h1>
      <p className="mb-6 text-sm text-ink/60">{t("org.replaySub")} · {data.replay.total} event</p>

      {logs.length === 0 ? (
        <EmptyState icon="🎬" title={t("org.noData")} />
      ) : (
        <div className="relative space-y-0">
          {logs.map((log, i) => {
            const meta = ACTION_META[log.action] ?? { label: log.action, emoji: "•", tone: "neutral" as const };
            const time = new Date(log.createdAt);
            return (
              <FadeUp key={log.id} delay={Math.min(i * 0.02, 0.3)}>
                <div className="relative flex gap-3 pb-5 pl-6">
                  {/* garis waktu */}
                  <div className="absolute left-[7px] top-3 h-full w-px bg-ink/10" />
                  <span className="absolute left-0 top-1.5 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-ink/20 bg-paper" />
                  <div className="min-w-0 flex-1 rounded-2xl border border-ink/10 bg-white/60 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <Badge tone={meta.tone}>{meta.emoji} {meta.label}</Badge>
                      <span className="text-[10px] font-semibold text-ink/40">{time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink/55">
                      <User className="h-3 w-3" />
                      <span className="font-semibold">{log.user?.name ?? "Sistem"}</span>
                      {log.action === "STAMP_AWARDED" && log.dataJson?.stamp ? <span>· {String(log.dataJson.stamp)}</span> : null}
                      {log.action === "XP_AWARDED" && log.dataJson?.amount ? <span>· +{String(log.dataJson.amount)} XP</span> : null}
                      {log.action === "VERIFICATION_COMPLETED" && log.dataJson?.status ? <span>· {String(log.dataJson.status)}</span> : null}
                      {log.action === "SCAN_REJECTED" && log.dataJson?.reason ? <span>· {String(log.dataJson.reason)}</span> : null}
                    </div>
                  </div>
                </div>
              </FadeUp>
            );
          })}
          <div className="flex items-center gap-2 pb-2 pl-6 text-xs font-semibold text-ink/40">
            <History className="h-3.5 w-3.5" /> {t("org.replayTitle")} · akhir linimasa
          </div>
        </div>
      )}
    </div>
  );
}
