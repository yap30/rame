"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, useT } from "@/lib/client";
import { useThemeEffect } from "@/lib/client";
import { FadeUp, Spinner } from "@/components/ui";
import { motion } from "framer-motion";

interface AchData {
  event: { slug: string; name: string; identity: Record<string, unknown>; joined: boolean };
  achievements: { id: string; name: string; description: string | null; emoji: string; secret: boolean; unlocked: boolean }[];
}

export default function AchievementsPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const { data, isLoading } = useQuery({ queryKey: ["event", slug], queryFn: () => api<AchData>(`/api/events/${slug}`) });
  useThemeEffect(data?.event.identity);

  if (isLoading) return <div className="rame-container flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="rame-container py-20 text-center">{t("common.notFound")}</div>;

  const unlocked = data.achievements.filter((a) => a.unlocked).length;

  return (
    <div className="rame-container max-w-3xl py-12">
      <FadeUp>
        <Link href={`/events/${slug}`} className="text-xs font-semibold text-ink/50 hover:text-brand">← {t("journey.backToEvent")}</Link>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="section-kicker">{data.event.name}</div>
            <h1 className="section-title">{t("nav.achievements")}</h1>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-bold text-gold">{unlocked}<span className="text-lg text-ink/40">/{data.achievements.length}</span></div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">{t("common.achievements")}</div>
          </div>
        </div>
      </FadeUp>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {data.achievements.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`card flex items-center gap-4 !p-5 ${a.unlocked ? "border-gold/40 bg-gold/5" : "opacity-55"}`}
          >
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${a.unlocked ? "bg-gold/15" : "bg-ink/5 grayscale"}`}>
              {a.unlocked ? a.emoji : a.secret ? "🔒" : a.emoji}
            </span>
            <div>
              <div className="font-display font-bold">{a.unlocked ? a.name : a.secret ? "???" : a.name}</div>
              {a.description && <div className="mt-0.5 text-xs text-ink/55">{a.description}</div>}
              {a.unlocked && <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gold">✓ {t("org.saveSuccess")}</div>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
