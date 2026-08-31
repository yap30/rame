"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Link2, Map as MapIcon, Save } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, InfoTip, Spinner } from "@/components/ui";

interface Bundle {
  event: { id: string; slug: string; name: string; journeyMode: string };
  journey: {
    id: string;
    mode: string;
    nodes: { id: string; activityId: string; position: number; titleOverride: string | null; activity: { id: string; title: string; icon: string; xpReward: number; stamp: { id: string; name: string; emoji: string } | null } }[];
  } | null;
  activities: { id: string; title: string; icon: string }[];
}

export default function JourneyBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["org-event", id], queryFn: () => api<Bundle>(`/api/organizer/events/${id}`) });

  const [nodes, setNodes] = useState<{ activityId: string }[]>([]);
  const [mode, setMode] = useState("HYBRID");

  useEffect(() => {
    if (data && !data.event) return;
    if (data) {
      setNodes((data.journey?.nodes ?? []).map((n) => ({ activityId: n.activityId })));
      setMode(data.journey?.mode ?? data.event.journeyMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.event?.id]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/organizer/events/${id}/journey`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          nodes: nodes.map((n, i) => ({ activityId: n.activityId, position: i })),
          edges: nodes.slice(0, -1).map((n, i) => ({ from: n.activityId, to: nodes[i + 1].activityId, required: true })),
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-event", id] }),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="py-20 text-center">{t("common.notFound")}</div>;

  const move = (i: number, dir: -1 | 1) => {
    const next = [...nodes];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setNodes(next);
  };

  const activityById = (activityId: string) => data.activities.find((a) => a.id === activityId);
  const nodeMeta = (activityId: string) => data.journey?.nodes.find((n) => n.activityId === activityId);

  return (
    <div className="max-w-2xl">
      <div className="section-kicker">{t("org.journeyBuilder")}</div>
      <h1 className="section-title mb-2">{t("org.journeyEditor")}</h1>
      <p className="mb-6 text-sm text-ink/60">{t("org.journeyEditorSub")}</p>

      <div className="mb-5">
        <div className="mb-1.5 flex items-center gap-1.5">
          <label className="label !mb-0">{t("event.journeyMode")}</label>
          <InfoTip text={t("org.jm.hybrid")} />
        </div>
        <div className="grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { value: "LINEAR", key: "org.jm.linear" },
            { value: "BRANCHING", key: "org.jm.branching" },
            { value: "FREE_EXPLORATION", key: "org.jm.free" },
            { value: "HYBRID", key: "org.jm.hybrid" },
          ].map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                mode === m.value ? "border-brand bg-brand/10 text-brand" : "border-ink/15 hover:bg-ink/5"
              }`}
            >
              {m.value === "LINEAR" ? "→" : m.value === "BRANCHING" ? "⎇" : m.value === "FREE_EXPLORATION" ? "✦" : "◈"}{" "}
              {t(m.key === "org.jm.linear" ? "common.linear" : m.key === "org.jm.branching" ? "common.branching" : m.key === "org.jm.free" ? "common.freeExplore" : "common.hybrid")}
              <InfoTip text={t(m.key)} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {nodes.map((n, i) => {
          const act = activityById(n.activityId);
          const meta = nodeMeta(n.activityId);
          return (
            <div key={n.activityId} className="card flex items-center gap-3 !p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-xl">{act?.icon ?? "🎯"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-accent">0{i + 1}</span>
                  <span className="truncate text-sm font-bold">{act?.title ?? n.activityId}</span>
                  {meta?.activity.stamp && <Badge tone="accent">{meta.activity.stamp.emoji}</Badge>}
                </div>
                <div className="text-[11px] text-ink/50">⚡ {meta?.activity.xpReward ?? 0} XP</div>
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost !px-2 !py-1.5" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Naik"><ArrowUp className="h-4 w-4" /></button>
                <button className="btn-ghost !px-2 !py-1.5" onClick={() => move(i, 1)} disabled={i === nodes.length - 1} aria-label="Turun"><ArrowDown className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
        {nodes.length === 0 && (
          <div className="card flex flex-col items-center gap-2 py-12 text-center text-ink/50">
            <MapIcon className="h-8 w-8" />
            <span className="text-sm">{t("org.noData")}</span>
            <a href={`/organizer/events/${id}/activities`} className="text-xs font-bold text-brand underline">→ {t("org.activityBuilder")}</a>
          </div>
        )}
      </div>

      {/* pratinjau edge */}
      {nodes.length > 1 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-ink/55">
          <Link2 className="h-4 w-4" />
          {nodes.map((n, i) => (
            <span key={n.activityId} className="flex items-center gap-1">
              <span className="chip">{activityById(n.activityId)?.icon} {i + 1}</span>
              {i < nodes.length - 1 && <span className="text-ink/40">→</span>}
            </span>
          ))}
        </div>
      )}

      <Button className="mt-6 w-full !py-3" onClick={() => save.mutate()} loading={save.isPending}>
        <Save className="h-4 w-4" /> {t("common.save")}
      </Button>
    </div>
  );
}
