"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Map, Plus, StampIcon, Users } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, FadeUp, Spinner } from "@/components/ui";

interface OrgEvent {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  status: string;
  journeyMode: string;
  userRole: string | null;
  venue: { name: string } | null;
  organization: { name: string };
  identityJson: { logoEmoji?: string; brand?: string } | null;
  _count?: never;
}

export default function OrganizerDashboard() {
  const t = useT();
  const { data, isLoading } = useQuery({ queryKey: ["org-events"], queryFn: () => api<{ events: OrgEvent[] }>("/api/organizer/events") });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;

  const events = data?.events ?? [];

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="section-kicker">{t("org.dashboard")}</div>
          <h1 className="section-title">{t("org.events")}</h1>
        </div>
        <Link href="/organizer/events/new" className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> {t("org.createEvent")}
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <div className="text-5xl">🎪</div>
          <div className="font-display text-lg font-bold">{t("org.noData")}</div>
          <Link href="/organizer/events/new" className="btn-primary mt-2">{t("org.createEvent")}</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((ev, i) => (
            <FadeUp key={ev.id} delay={i * 0.05}>
              <Link href={`/organizer/events/${ev.id}`} className="card group block transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl text-xl shadow-stamp" style={{ background: ev.identityJson?.brand ?? "#1e3a34", color: "#fff" }}>
                    {ev.identityJson?.logoEmoji ?? "🎪"}
                  </span>
                  {ev.status === "PUBLISHED" ? <Badge tone="success">● {t("org.published")}</Badge> : <Badge>{t("org.draft")}</Badge>}
                </div>
                <div className="font-display text-lg font-bold group-hover:text-brand">{ev.name}</div>
                <div className="mt-1 line-clamp-1 text-sm text-ink/55">{ev.tagline ?? ev.venue?.name ?? ev.organization.name}</div>
                <div className="mt-4 flex items-center justify-between text-xs text-ink/50">
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Map className="h-3.5 w-3.5" /> {ev.journeyMode}</span>
                    <span className="flex items-center gap-1"><StampIcon className="h-3.5 w-3.5" /> {ev.userRole}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </FadeUp>
          ))}
        </div>
      )}
    </div>
  );
}
