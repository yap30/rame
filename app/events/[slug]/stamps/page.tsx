"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, useT } from "@/lib/client";
import { useThemeEffect } from "@/lib/client";
import { FadeUp, Spinner } from "@/components/ui";
import { motion } from "framer-motion";

interface StampsData {
  event: { slug: string; name: string; identity: Record<string, unknown>; joined: boolean };
  stamps: { id: string; name: string; description: string | null; emoji: string; color: string; rarity: number; collected: boolean; collectedAt: string | null }[];
  progress: { stamps: number } | null;
}

export default function StampsPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const { data, isLoading } = useQuery({ queryKey: ["event", slug], queryFn: () => api<StampsData>(`/api/events/${slug}`) });
  useThemeEffect(data?.event.identity);

  if (isLoading) return <div className="rame-container flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="rame-container py-20 text-center">{t("common.notFound")}</div>;

  const collected = data.stamps.filter((s) => s.collected).length;

  return (
    <div className="rame-container max-w-3xl py-12">
      <FadeUp>
        <Link href={`/events/${slug}`} className="text-xs font-semibold text-ink/50 hover:text-brand">← {t("journey.backToEvent")}</Link>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="section-kicker">{data.event.name}</div>
            <h1 className="section-title">{t("nav.stamps")}</h1>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-bold text-accent">{collected}<span className="text-lg text-ink/40">/{data.stamps.length}</span></div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">{t("journey.stampsCollected")}</div>
          </div>
        </div>
      </FadeUp>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {data.stamps.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className={`card flex flex-col items-center gap-2 !p-5 text-center ${s.collected ? "" : "opacity-60"}`}
          >
            <div
              className={`stamp ${s.collected ? "" : "stamp-uncollected"} ${s.collected ? "animate-stamp-pop" : ""}`}
              style={s.collected ? { background: s.color, boxShadow: "0 6px 0 -2px rgb(0 0 0 / 0.15)" } : undefined}
            >
              {s.collected ? s.emoji : "?"}
            </div>
            <div className="font-display text-sm font-bold">{s.name}</div>
            {s.description && <div className="text-xs text-ink/55">{s.description}</div>}
            {s.collected && s.collectedAt && (
              <div className="text-[10px] font-semibold text-ink/40">
                {new Date(s.collectedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
              </div>
            )}
            <span className={`chip !text-[10px] ${s.rarity >= 2 ? "!border-gold/40 !bg-gold/10 !text-gold" : ""}`}>
              {s.rarity >= 2 ? "★ langka" : "umum"}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
