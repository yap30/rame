"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { api, useT } from "@/lib/client";
import { FadeUp, Spinner, EmptyState } from "@/components/ui";

interface Insights {
  insights: { id: string; title: string; body: string; severity: string; createdAt: string }[];
}

export default function InsightsPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const { data, isLoading } = useQuery({ queryKey: ["org-insights", id], queryFn: () => api<Insights>(`/api/organizer/events/${id}/insights`) });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="py-20 text-center">{t("common.notFound")}</div>;

  return (
    <div className="max-w-2xl">
      <div className="section-kicker">{t("org.insights")}</div>
      <h1 className="section-title mb-2">{t("org.insightTitle")}</h1>
      <p className="mb-6 text-sm text-ink/60">{t("org.insightSub")}</p>

      {data.insights.length === 0 ? (
        <EmptyState icon="💡" title={t("org.noData")} />
      ) : (
        <div className="space-y-3">
          {data.insights.map((ins, i) => {
            const Icon = ins.severity === "WARNING" ? AlertTriangle : ins.severity === "SUCCESS" ? CheckCircle2 : Info;
            const tone =
              ins.severity === "WARNING"
                ? "border-amber-500/30 bg-amber-50 text-amber-900"
                : ins.severity === "SUCCESS"
                  ? "border-emerald-500/30 bg-emerald-50 text-emerald-900"
                  : "border-sky-500/20 bg-sky-50 text-sky-900";
            return (
              <FadeUp key={ins.id} delay={i * 0.05}>
                <div className={`card !p-5 ${tone}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <div className="font-display font-bold">{ins.title}</div>
                      <p className="mt-1 text-sm opacity-80">{ins.body}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-50">
                        <Lightbulb className="h-3 w-3" /> rule-based · {new Date(ins.createdAt).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            );
          })}
        </div>
      )}
    </div>
  );
}
