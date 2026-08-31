"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Lock, MapPin, Sparkles } from "lucide-react";
import { api, useT, useThemeEffect, localizeLabel } from "@/lib/client";
import { useUiStore } from "@/lib/ui-store";
import { Badge, FadeUp, ProgressBar, Spinner } from "@/components/ui";
import { motion } from "framer-motion";

interface MapData {
  event: { id: string; slug: string; name: string; journeyMode: string; journeyModeLabel: string | { id: string; en: string }; identity: Record<string, unknown>; joined: boolean };
  journey: {
    nodes: { id: string; activityId: string; position: number; title: string; description: string | null; icon: string; xpReward: number; stamp: { id: string; name: string; emoji: string } | null; done: boolean; locked: boolean }[];
    edges: { from: string; to: string; required: boolean; label: string | null }[];
  } | null;
  stamps: { id: string; name: string; emoji: string; color: string; collected: boolean }[];
  achievements: { id: string; name: string; emoji: string; unlocked: boolean }[];
  progress: { completed: number; total: number; xp: number; stamps: number } | null;
}

export default function ExperienceMapPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const lang = useUiStore((s) => s.lang);

  const { data, isLoading } = useQuery({ queryKey: ["event", slug], queryFn: () => api<MapData>(`/api/events/${slug}`) });
  useThemeEffect(data?.event.identity);

  if (isLoading) return <div className="rame-container flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="rame-container py-20 text-center">{t("common.notFound")}</div>;

  if (!data.event.joined) {
    return (
      <div className="rame-container max-w-md py-20 text-center">
        <div className="text-5xl">🗺️</div>
        <p className="mt-4 text-ink/60">{t("journey.joinFirst")}</p>
        <Link href={`/events/${slug}`} className="btn-primary mt-5">{t("event.joinEvent")}</Link>
      </div>
    );
  }

  const nodes = data.journey?.nodes ?? [];
  const progress = data.progress;
  const rate = progress && progress.total > 0 ? progress.completed / progress.total : 0;

  return (
    <div className="rame-container max-w-3xl py-12">
      <FadeUp>
        <div className="mb-8">
          <Link href={`/events/${slug}`} className="text-xs font-semibold text-ink/50 hover:text-brand">← {t("journey.backToEvent")}</Link>
          <div className="section-kicker mt-3">{data.event.name}</div>
          <h1 className="section-title">{t("journey.title")}</h1>
          <p className="mt-2 text-sm text-ink/60">{t("journey.sub")}</p>
        </div>
      </FadeUp>

      {/* progres */}
      <FadeUp>
        <div className="card mb-8 !p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">{t("journey.progress")}</span>
            <span className="text-ink/60">{progress?.completed ?? 0} {t("journey.of")} {progress?.total ?? 0} {t("journey.completedCount")}</span>
          </div>
          <ProgressBar value={rate} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-brand-soft/50 py-2.5">
              <div className="font-display text-xl font-bold text-brand">{progress?.stamps ?? 0}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">{t("journey.stampsCollected")}</div>
            </div>
            <div className="rounded-xl bg-accent-soft/60 py-2.5">
              <div className="font-display text-xl font-bold text-accent">{progress?.xp ?? 0}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">{t("journey.totalXp")}</div>
            </div>
            <div className="rounded-xl bg-gold/10 py-2.5">
              <div className="font-display text-xl font-bold text-gold">{data.achievements.filter((a) => a.unlocked).length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">{t("common.achievements")}</div>
            </div>
          </div>
        </div>
      </FadeUp>

      {/* jalur aktivitas */}
      <div className="relative">
        {nodes.map((node, i) => {
          const edge = data.journey?.edges.find((e) => e.from === nodes[i - 1]?.id && e.to === node.id);
          return (
            <div key={node.id}>
              {i > 0 && (
                <div className="ml-8 flex h-10 items-center gap-2">
                  <div className="w-0.5 flex-1 bg-ink/15" />
                  {edge && <span className={`chip !text-[10px] ${edge.required ? "" : "!text-ink/40"}`}>{edge.required ? "→" : edge.label ?? "bebas"}</span>}
                </div>
              )}
              <motion.div initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <JourneyNodeCard node={node} slug={slug} position={i + 1} />
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* catatan mode */}
      <div className="mt-8 flex items-start gap-2 rounded-2xl bg-ink/5 p-4 text-xs text-ink/55">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {data.event.name} · {t("event.journeyMode")}: <strong>{localizeLabel(data.event.journeyModeLabel, lang)}</strong> — {t("journey.branchingNote")}
        </span>
      </div>
    </div>
  );
}

function JourneyNodeCard({ node, slug, position }: { node: NonNullable<MapData["journey"]>["nodes"][number]; slug: string; position: number }) {
  const t = useT();
  const state = node.done ? "done" : node.locked ? "locked" : "open";
  return (
    <div className={`journey-node card !p-4 ${state === "locked" ? "opacity-55" : ""}`}>
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 text-2xl ${
          state === "done"
            ? "border-accent bg-accent/10"
            : state === "locked"
              ? "border-ink/15 bg-ink/5"
              : "border-brand bg-brand text-brand-ink shadow-lift"
        }`}
      >
        {state === "done" ? <Check className="h-6 w-6 text-accent" /> : state === "locked" ? <Lock className="h-5 w-5 text-ink/40" /> : node.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">0{position}</span>
          {node.stamp && node.done && <Badge tone="accent">{node.stamp.emoji} {node.stamp.name}</Badge>}
          {state === "locked" && <Badge>{t("journey.locked")}</Badge>}
        </div>
        <div className="font-display text-lg font-bold leading-snug">{node.title}</div>
        {node.description && <p className="mt-0.5 line-clamp-2 text-xs text-ink/55">{node.description}</p>}
        <div className="mt-1.5 flex items-center gap-3 text-[11px] font-semibold text-ink/50">
          <span>⚡ {node.xpReward} XP</span>
          {node.stamp && <span>{node.stamp.emoji} {t("common.stamp")}</span>}
        </div>
      </div>
      <div className="shrink-0">
        {state === "open" && (
          <Link href={`/activities/${node.activityId}`} className="btn-accent !px-4 !py-2 text-xs">
            {position === 1 ? t("journey.startHere") : t("activity.start")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        {state === "done" && (
          <Link href={`/activities/${node.activityId}`} className="btn-ghost !px-4 !py-2 text-xs">
            {t("activity.completed")} →
          </Link>
        )}
        {state === "locked" && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink/40"><Lock className="h-3.5 w-3.5" /> {t("journey.locked")}</span>
        )}
      </div>
    </div>
  );
}
