"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, useT } from "@/lib/client";
import { FadeUp, Badge } from "@/components/ui";
import { Map, Users } from "lucide-react";

interface EventCardData {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  city: string | null;
  logoEmoji: string;
  brand: string;
  organizerName: string;
  venueName: string;
  participants: number;
  activityCount: number;
  startsAt: string | null;
}

export default function EventsPage() {
  const t = useT();
  const { data } = useQuery({ queryKey: ["events"], queryFn: () => api<{ events: EventCardData[] }>("/api/events") });
  const events = data?.events ?? [];

  return (
    <div className="rame-container py-12">
      <div className="mb-10">
        <div className="section-kicker">{t("nav.events")}</div>
        <h1 className="section-title">{t("home.eventsTitle")}</h1>
        <p className="mt-2 text-ink/60">{t("home.eventsSub")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((ev, i) => (
          <FadeUp key={ev.id} delay={i * 0.05}>
            <Link href={`/events/${ev.slug}`} className="card group block h-full transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="mb-3 flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-stamp" style={{ background: ev.brand, color: "#fff" }}>
                  {ev.logoEmoji}
                </span>
                <Badge tone="brand">{ev.city ?? ev.venueName}</Badge>
              </div>
              <div className="font-display text-lg font-bold group-hover:text-brand">{ev.name}</div>
              <div className="mt-1 line-clamp-2 text-sm text-ink/60">{ev.tagline ?? ev.organizerName}</div>
              <div className="mt-4 flex items-center gap-3 text-xs text-ink/50">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {ev.participants}</span>
                <span className="flex items-center gap-1"><Map className="h-3.5 w-3.5" /> {ev.activityCount} {t("event.activities")}</span>
              </div>
            </Link>
          </FadeUp>
        ))}
      </div>
    </div>
  );
}
