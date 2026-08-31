"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Check, Lock, Map as MapIcon, MapPin, StampIcon, Trophy, Users } from "lucide-react";
import { api, useT, useThemeEffect, localizeLabel } from "@/lib/client";
import { useUiStore } from "@/lib/ui-store";
import { Badge, Button, FadeUp, Spinner } from "@/components/ui";
import { motion } from "framer-motion";

interface EventDetail {
  event: {
    id: string;
    slug: string;
    name: string;
    tagline: string | null;
    description: string | null;
    story: string | null;
    city: string | null;
    status: string;
    journeyMode: string;
    journeyModeLabel: string | { id: string; en: string };
    startsAt: string | null;
    endsAt: string | null;
    identity: Record<string, unknown>;
    venue: { name: string; address?: string | null; city?: string | null } | null;
    organization: { id: string; name: string } | null;
    communities: { id: string; name: string }[];
    mediaPartners: { id: string; name: string }[];
    participants: number;
    joined: boolean;
  };
  journey: {
    nodes: { id: string; activityId: string; position: number; title: string; icon: string; done: boolean; locked: boolean; stamp: { id: string; name: string; emoji: string } | null }[];
    edges: { from: string; to: string; required: boolean }[];
  } | null;
  stamps: { id: string; name: string; emoji: string; color: string; collected: boolean }[];
  achievements: { id: string; name: string; description: string | null; emoji: string; unlocked: boolean }[];
  credential: { enabled: boolean; title: string | null; status: string | null } | null;
  feedback: { id: string; required: boolean; submitted: boolean } | null;
  progress: { completed: number; total: number; xp: number; stamps: number } | null;
}

export default function EventStoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const lang = useUiStore((s) => s.lang);
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => api<EventDetail>(`/api/events/${slug}`),
  });

  useThemeEffect(data?.event.identity);

  const join = useMutation({
    mutationFn: () => api<{ joined: boolean }>(`/api/events/${data?.event.id}/join`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event", slug] });
      router.push(`/events/${slug}/map`);
    },
  });

  if (isLoading) {
    return <div className="rame-container flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  }
  if (!data) return <div className="rame-container py-20 text-center text-ink/50">{t("common.notFound")}</div>;

  const { event, journey, stamps, achievements, credential, feedback, progress } = data;
  const collected = stamps.filter((s) => s.collected).length;

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: "rgb(var(--rame-brand))" }}>
        <div className="pointer-events-none absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 75% 20%, rgb(var(--rame-gold)) 0, transparent 45%)" }} />
        <div className="rame-container relative py-12 sm:py-16">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-stamp" style={{ background: "rgb(var(--rame-accent))", color: "#fff" }}>
                {(event.identity.logoEmoji as string) ?? "🎪"}
              </span>
              <Badge tone="brand">{localizeLabel(event.journeyModeLabel, lang)}</Badge>
              <Badge>{event.city}</Badge>
              {event.status === "PUBLISHED" ? <Badge tone="success">● {t("org.published")}</Badge> : <Badge tone="neutral">{t("org.draft")}</Badge>}
            </div>
            <h1 className="font-display text-4xl font-black leading-tight tracking-tight text-brand-ink sm:text-5xl">{event.name}</h1>
            {event.tagline && <p className="mt-3 max-w-2xl text-lg text-brand-ink/80">{event.tagline}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-brand-ink/70">
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {fmtDate(event.startsAt)}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {event.venue?.name ?? "—"}{event.venue?.city ? `, ${event.venue.city}` : ""}</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {event.participants} {t("event.participants")}</span>
              <span className="flex items-center gap-1.5"><MapIcon className="h-4 w-4" /> {journey?.nodes.length ?? 0} {t("event.activities")}</span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {event.joined ? (
                <>
                  <Link href={`/events/${slug}/map`} className="btn-accent">
                    <MapIcon className="h-4 w-4" /> {t("journey.title")}
                  </Link>
                  <Link href={`/events/${slug}/stamps`} className="btn !border !border-white/25 !bg-white/10 !text-white hover:!bg-white/20">
                    <StampIcon className="h-4 w-4" /> {t("nav.stamps")} ({collected}/{stamps.length})
                  </Link>
                </>
              ) : (
                <Button variant="accent" onClick={() => join.mutate()} loading={join.isPending} className="!py-3 text-base">
                  {t("event.joinEvent")} <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROGRES (jika sudah gabung) */}
      {event.joined && progress && (
        <section className="border-b border-ink/10 bg-white/50">
          <div className="rame-container grid grid-cols-3 gap-3 py-4 text-center">
            <div>
              <div className="font-display text-2xl font-bold text-brand">{progress.completed}/{progress.total}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{t("journey.progress")}</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-accent">{progress.stamps}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{t("journey.stampsCollected")}</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-gold">{progress.xp} XP</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{t("journey.totalXp")}</div>
            </div>
          </div>
        </section>
      )}

      <div className="rame-container grid gap-10 py-12 lg:grid-cols-[1fr_340px]">
        {/* KIRI: cerita + journey */}
        <div>
          <FadeUp>
            <div className="section-kicker">{t("event.eventStory")}</div>
            <h2 className="section-title mb-4">{t("event.storyTitle")}</h2>
            <div className="prose-sm max-w-2xl space-y-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/75">
              {event.story ?? event.description ?? "—"}
            </div>
          </FadeUp>

          {/* Journey preview */}
          {journey && (
            <FadeUp className="mt-12">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <div className="section-kicker">{t("nav.journey")}</div>
                  <h3 className="font-display text-2xl font-bold">{t("journey.title")}</h3>
                </div>
                <Link href={`/events/${slug}/map`} className="btn-ghost !px-3 !py-1.5 text-xs">
                  {t("common.seeAll")} →
                </Link>
              </div>
              <div className="card !p-6">
                <div className="flex flex-wrap items-center gap-2">
                  {journey.nodes.map((node, i) => (
                    <div key={node.id} className="flex items-center gap-2">
                      <Link
                        href={node.locked && !node.done ? `/events/${slug}` : `/activities/${node.activityId}`}
                        className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 text-xl transition ${
                          node.done
                            ? "border-accent bg-accent/10"
                            : node.locked
                              ? "border-ink/15 bg-ink/5 opacity-50"
                              : "border-brand bg-brand text-brand-ink hover:scale-105"
                        }`}
                        title={node.title}
                      >
                        {node.done ? <Check className="h-5 w-5 text-accent" /> : node.locked ? <Lock className="h-4 w-4" /> : node.icon}
                      </Link>
                      {i < journey.nodes.length - 1 && <div className="h-0.5 w-5 bg-ink/20 sm:w-8" />}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {journey.nodes.map((n) => (
                    <span key={n.id} className={`chip !text-[11px] ${n.done ? "!border-accent/30 !bg-accent/10" : ""}`}>
                      {n.icon} {n.title}
                    </span>
                  ))}
                </div>
              </div>
            </FadeUp>
          )}

          {/* Stamps */}
          {stamps.length > 0 && (
            <FadeUp className="mt-12">
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <div className="section-kicker">{t("nav.stamps")}</div>
                  <h3 className="font-display text-2xl font-bold">{t("home.statsStamps")}</h3>
                </div>
                <Link href={`/events/${slug}/stamps`} className="btn-ghost !px-3 !py-1.5 text-xs">
                  {t("common.seeAll")} →
                </Link>
              </div>
              <div className="flex flex-wrap gap-3">
                {stamps.map((s) => (
                  <div key={s.id} className={`stamp ${s.collected ? "" : "stamp-uncollected"} animate-stamp-pop`} style={s.collected ? { background: s.color, boxShadow: "0 6px 0 -2px rgb(0 0 0 / 0.15)" } : undefined} title={s.name}>
                    {s.collected ? s.emoji : "?"}
                  </div>
                ))}
              </div>
            </FadeUp>
          )}
        </div>

        {/* KANAN: info + status */}
        <aside className="space-y-4">
          <FadeUp>
            <div className="card">
              <div className="label">{t("event.organizer")}</div>
              <div className="text-sm font-bold">{event.organization?.name ?? "—"}</div>
              <div className="label mt-4">{t("event.venue")}</div>
              <div className="text-sm font-bold">{event.venue?.name ?? "—"}</div>
              {event.venue?.address && <div className="text-xs text-ink/55">{event.venue.address}</div>}
              <div className="label mt-4">{t("event.journeyMode")}</div>
              <div className="text-sm font-bold">{localizeLabel(event.journeyModeLabel, lang)}</div>
            </div>
          </FadeUp>

          {event.communities.length > 0 && (
            <FadeUp delay={0.05}>
              <div className="card">
                <div className="label">{t("event.communities")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {event.communities.map((c) => <Badge key={c.id}>{c.name}</Badge>)}
                </div>
              </div>
            </FadeUp>
          )}
          {event.mediaPartners.length > 0 && (
            <FadeUp delay={0.1}>
              <div className="card">
                <div className="label">{t("event.mediaPartners")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {event.mediaPartners.map((m) => <Badge key={m.id} tone="brand">{m.name}</Badge>)}
                </div>
              </div>
            </FadeUp>
          )}

          {event.joined && (
            <FadeUp delay={0.15}>
              <div className="card space-y-3">
                <div className="label">{t("nav.achievements")}</div>
                <div className="flex flex-wrap gap-2">
                  {achievements.map((a) => (
                    <span key={a.id} className={`chip ${a.unlocked ? "!border-gold/40 !bg-gold/10" : "opacity-45"}`} title={a.description ?? a.name}>
                      {a.emoji} {a.name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Link href={`/events/${slug}/achievements`} className="btn-ghost flex-1 !py-2 text-xs"><Trophy className="h-3.5 w-3.5" /> {t("nav.achievements")}</Link>
                  <Link href={`/events/${slug}/feedback`} className="btn-ghost flex-1 !py-2 text-xs">{t("nav.feedback")}</Link>
                </div>
                {credential?.enabled && (
                  <Link href={`/events/${slug}/credential`} className="btn-outline-brand w-full !py-2 text-xs">{t("nav.credential")} {credential.status && `· ${credential.status}`}</Link>
                )}
              </div>
            </FadeUp>
          )}
        </aside>
      </div>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
