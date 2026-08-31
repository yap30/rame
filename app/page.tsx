"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, Map, Sparkles, StampIcon, Trophy, Users } from "lucide-react";
import { api, useT } from "@/lib/client";
import { FadeUp, StatCard, Badge } from "@/components/ui";
import { motion } from "framer-motion";
import { useState } from "react";

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

interface Recommendation {
  eventId: string;
  slug: string;
  name: string;
  tagline: string | null;
  city: string | null;
  emoji: string;
  match: number;
  reasons: string[];
}

export default function HomePage() {
  const t = useT();

  const { data: eventsData } = useQuery({ queryKey: ["events"], queryFn: () => api<{ events: EventCardData[] }>("/api/events") });
  const { data: meData } = useQuery({ queryKey: ["me"], queryFn: () => api<{ user: { id: string; role: string; name: string } | null }>("/api/auth/me") });
  const { data: recData } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => api<{ recommendations: Recommendation[] }>("/api/recommendations"),
    enabled: Boolean(meData?.user),
  });

  const events = eventsData?.events ?? [];
  const recommendations = recData?.recommendations ?? [];
  const isLoggedIn = Boolean(meData?.user);

  const faqs = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
  ];

  return (
    <div>
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden" style={{ background: "rgb(var(--rame-brand))" }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgb(var(--rame-accent)) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgb(var(--rame-gold)) 0, transparent 35%)" }} />
        <div className="rame-container relative py-16 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="chip mb-5 !border-white/20 !bg-white/10 !text-white">{t("home.heroKicker")} <Sparkles className="h-3 w-3" /></span>
            <h1 className="font-display text-4xl font-black leading-[1.08] tracking-tight text-brand-ink sm:text-6xl">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-base text-brand-ink/75 sm:text-lg">{t("home.heroSub")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/events/jelajah-kota-tua" className="btn !border !border-white/25 !bg-white/10 !text-white hover:!bg-white/20">
                {t("home.viewDemo")}
              </Link>
            </div>
          </motion.div>

          {/* stats row */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
              <div className="font-display text-3xl font-bold text-white">{events.length}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-white/60">{t("home.statsEvents")}</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
              <div className="font-display text-3xl font-bold text-white">{(events.reduce((a, e) => a + e.participants, 0)).toLocaleString("id-ID")}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-white/60">{t("home.statsParticipants")}</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
              <div className="font-display text-3xl font-bold text-white">5</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-white/60">{t("home.statsStamps")}</div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
              <div className="font-display text-3xl font-bold text-white">500+</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-white/60">{t("home.statsXp")}</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------- EVENTS ---------- */}
      <section className="rame-container py-14">
        <FadeUp>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="section-kicker">{t("nav.events")}</div>
              <h2 className="section-title">{t("home.eventsTitle")}</h2>
              <p className="mt-2 text-sm text-ink/60">{t("home.eventsSub")}</p>
            </div>
            <Link href="/events" className="btn-ghost hidden sm:inline-flex">
              {t("common.seeAll")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev, i) => (
            <FadeUp key={ev.id} delay={i * 0.06}>
              <EventCard ev={ev} />
            </FadeUp>
          ))}
          {events.length === 0 && <div className="text-sm text-ink/50">{t("common.loading")}</div>}
        </div>
      </section>

      {/* ---------- REKOMENDASI ---------- */}
      {isLoggedIn && (
        <section className="border-y border-ink/10 bg-brand-soft/40 py-14">
          <div className="rame-container">
            <FadeUp>
              <div className="mb-8">
                <div className="section-kicker">{t("rec.title")}</div>
                <h2 className="section-title">{t("home.recTitle")}</h2>
                <p className="mt-2 text-sm text-ink/60">{t("home.recSub")}</p>
              </div>
            </FadeUp>
            {recommendations.length === 0 ? (
              <div className="text-sm text-ink/50">{t("rec.empty")}</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recommendations.slice(0, 3).map((r, i) => (
                  <FadeUp key={r.eventId} delay={i * 0.06}>
                    <Link href={`/events/${r.slug}`} className="card group block transition hover:-translate-y-0.5 hover:shadow-lift">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-xl">{r.emoji}</span>
                        <Badge tone="accent">{r.match}% {t("rec.match")}</Badge>
                      </div>
                      <div className="font-display text-lg font-bold group-hover:text-brand">{r.name}</div>
                      <div className="mt-1 line-clamp-2 text-sm text-ink/60">{r.tagline}</div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {r.reasons.map((reason, idx) => (
                          <span key={idx} className="chip !text-[10px]">{reason}</span>
                        ))}
                      </div>
                    </Link>
                  </FadeUp>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------- CARA KERJA ---------- */}
      <section className="rame-container py-14">
        <FadeUp>
          <div className="mb-10 text-center">
            <div className="section-kicker">{t("home.howTitle")}</div>
            <h2 className="section-title">{t("home.howSub")}</h2>
          </div>
        </FadeUp>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <Compass className="h-5 w-5" />, title: t("home.how1Title"), desc: t("home.how1Desc") },
            { icon: <Map className="h-5 w-5" />, title: t("home.how2Title"), desc: t("home.how2Desc") },
            { icon: <StampIcon className="h-5 w-5" />, title: t("home.how3Title"), desc: t("home.how3Desc") },
            { icon: <Trophy className="h-5 w-5" />, title: t("home.how4Title"), desc: t("home.how4Desc") },
          ].map((step, i) => (
            <FadeUp key={i} delay={i * 0.07}>
              <div className="card h-full">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-ink">{step.icon}</div>
                <div className="mb-1 text-xs font-bold text-accent">0{i + 1}</div>
                <div className="font-display text-base font-bold">{step.title}</div>
                <p className="mt-1.5 text-sm text-ink/60">{step.desc}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ---------- CTA ORGANIZER ---------- */}
      <section className="rame-container pb-14">
        <FadeUp>
          <div className="card flex flex-col items-start justify-between gap-4 !bg-brand p-8 !text-brand-ink sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-ink/70"><Users className="h-4 w-4" /> {t("home.ctaOrganizer")}</div>
              <h3 className="mt-2 font-display text-2xl font-bold">{t("home.ctaOrganizerDesc")}</h3>
            </div>
            <Link href="/organizer" className="btn-accent shrink-0">
              {t("nav.organizer")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="rame-container pb-20">
        <FadeUp>
          <div className="mb-8">
            <div className="section-kicker">FAQ</div>
            <h2 className="section-title">{t("home.faqTitle")}</h2>
            <p className="mt-2 text-sm text-ink/60">{t("home.faqSub")}</p>
          </div>
        </FadeUp>
        <div className="mx-auto max-w-2xl space-y-2">
          {faqs.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </section>
    </div>
  );
}

function EventCard({ ev }: { ev: EventCardData }) {
  const t = useT();
  return (
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
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card !p-0 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-bold">
        {q}
        <span className={`text-accent transition-transform ${open ? "rotate-45" : ""}`}>＋</span>
      </button>
      {open && <div className="border-t border-ink/10 px-5 py-4 text-sm text-ink/70">{a}</div>}
    </div>
  );
}
