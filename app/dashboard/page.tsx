"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Map } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, FadeUp, ProgressBar, Spinner } from "@/components/ui";

interface DashboardData {
  user: { id: string; name: string; email: string | null; role: string; eidSubject: string | null };
  summary: { stamps: number; xp: number; achievements: number };
  joinedEvents: {
    eventId: string;
    slug: string;
    name: string;
    city: string | null;
    emoji: string;
    brand: string;
    joinedAt: string;
    completed: number;
    totalActivities: number;
    status: string;
  }[];
}

export default function DashboardPage() {
  const t = useT();
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["me-dashboard"], queryFn: () => api<DashboardData>("/api/me/dashboard") });

  if (isLoading) return <div className="rame-container flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) {
    return (
      <div className="rame-container max-w-md py-24 text-center">
        <div className="text-5xl">🎒</div>
        <p className="mt-3 text-ink/60">{t("auth.requireLogin")}</p>
        <Link href="/join" className="btn-primary mt-4">{t("common.login")}</Link>
      </div>
    );
  }

  return (
    <div className="rame-container max-w-3xl py-12">
      <div className="section-kicker">{t("nav.home")}</div>
      <h1 className="section-title mb-2">Dashboard Partisipan</h1>
      <p className="mb-8 text-sm text-ink/60">
        Halo, <strong>{data.user.name}</strong> — ringkasan perjalananmu di RAME.
        {data.user.eidSubject && <span className="ml-2 font-mono text-xs text-ink/45">{data.user.eidSubject.slice(0, 32)}…</span>}
      </p>

      {/* ringkasan */}
      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="card text-center !p-4">
          <div className="font-display text-3xl font-bold text-brand">{data.summary.stamps}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{t("journey.stampsCollected")}</div>
        </div>
        <div className="card text-center !p-4">
          <div className="font-display text-3xl font-bold text-accent">{data.summary.xp}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{t("journey.totalXp")}</div>
        </div>
        <div className="card text-center !p-4">
          <div className="font-display text-3xl font-bold text-gold">{data.summary.achievements}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{t("common.achievements")}</div>
        </div>
      </div>

      {/* event yang diikuti */}
      <div className="mb-3 font-display text-lg font-bold">Event yang diikuti ({data.joinedEvents.length})</div>
      {data.joinedEvents.length === 0 && (
        <div className="card py-10 text-center text-sm text-ink/55">
          Belum ada event. <Link className="text-brand underline" href="/events">Jelajahi event →</Link>
        </div>
      )}
      <div className="space-y-3">
        {data.joinedEvents.map((ev, i) => (
          <FadeUp key={ev.eventId} delay={i * 0.05}>
            <Link href={`/events/${ev.slug}/map`} className="card group flex items-center gap-4 !p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-stamp" style={{ background: ev.brand, color: "#fff" }}>
                {ev.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-display font-bold group-hover:text-brand">{ev.name}</span>
                  {ev.city && <Badge>{ev.city}</Badge>}
                  {ev.status === "COMPLETED" && <Badge tone="success">✓ selesai</Badge>}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <ProgressBar value={ev.totalActivities > 0 ? ev.completed / ev.totalActivities : 0} className="flex-1" />
                  <span className="whitespace-nowrap text-xs font-semibold text-ink/55">
                    {ev.completed}/{ev.totalActivities} {t("event.activities")}
                  </span>
                </div>
              </div>
              <Map className="h-5 w-5 shrink-0 text-ink/30 transition group-hover:text-brand" />
            </Link>
          </FadeUp>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/events" className="btn-primary"><ArrowRight className="h-4 w-4" /> {t("home.exploreEvents")}</Link>
        <Link href="/profile" className="btn-ghost">{t("common.profile")}</Link>
      </div>
    </div>
  );
}
