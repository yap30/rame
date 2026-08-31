"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Button } from "@/components/ui";

const EMOJIS = ["🕰️", "🎪", "🎨", "🍜", "✨", "🎸", "🌙", "🏛️", "🎭", "⚽", "📚", "🌊"];
const COLORS = [
  { brand: "#1e3a34", accent: "#d97706", gold: "#b98a1a", paper: "#f8f4ea", label: "Heritage" },
  { brand: "#6d28d9", accent: "#db2777", gold: "#a16207", paper: "#faf8ff", label: "Seni" },
  { brand: "#b91c1c", accent: "#f59e0b", gold: "#b45309", paper: "#fffaf5", label: "Kuliner" },
  { brand: "#0e7490", accent: "#f43f5e", gold: "#d97706", paper: "#f6fbfc", label: "Malam" },
];

export default function NewEventPage() {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    slug: "",
    tagline: "",
    description: "",
    story: "",
    city: "",
    journeyMode: "HYBRID",
    venueName: "",
    emoji: EMOJIS[0],
    palette: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const pal = COLORS[form.palette];
      const res = await api<{ event: { id: string } }>("/api/organizer/events", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || undefined,
          tagline: form.tagline || undefined,
          description: form.description || undefined,
          story: form.story || undefined,
          city: form.city || undefined,
          journeyMode: form.journeyMode,
          venueName: form.venueName || undefined,
          identity: { eventShortName: form.name, logoEmoji: form.emoji, ...pal },
        }),
      });
      router.push(`/organizer/events/${res.event.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="section-kicker">{t("org.newEvent")}</div>
      <h1 className="section-title mb-6">{t("org.createEvent")}</h1>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="label">{t("org.eventName")} *</label>
          <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jelajah Kota Tua" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t("org.eventSlug")}</label>
            <input className="input font-mono text-xs" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="otomatis" />
          </div>
          <div>
            <label className="label">{t("org.city")}</label>
            <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Semilir" />
          </div>
        </div>
        <div>
          <label className="label">{t("org.tagline")}</label>
          <input className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="Satu malam, lima penanda, dan cerita…" />
        </div>
        <div>
          <label className="label">{t("org.venue")}</label>
          <input className="input" value={form.venueName} onChange={(e) => set("venueName", e.target.value)} placeholder="Alun-Alun Semilir" />
        </div>
        <div>
          <label className="label">{t("org.journeyMode")}</label>
          <select className="input" value={form.journeyMode} onChange={(e) => set("journeyMode", e.target.value)}>
            <option value="LINEAR">Linier</option>
            <option value="BRANCHING">Bercabang</option>
            <option value="FREE_EXPLORATION">Eksplorasi Bebas</option>
            <option value="HYBRID">Hibrida</option>
          </select>
        </div>
        <div>
          <label className="label">{t("org.story")}</label>
          <textarea className="input min-h-[110px]" value={form.story} onChange={(e) => set("story", e.target.value)} placeholder="Kisah panjang event…" />
        </div>

        <div>
          <label className="label">Identitas visual (white-label)</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {EMOJIS.map((em) => (
              <button key={em} onClick={() => set("emoji", em)} className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl ${form.emoji === em ? "border-brand bg-brand/10" : "border-ink/15"}`}>
                {em}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c, i) => (
              <button
                key={c.label}
                onClick={() => set("palette", i)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${form.palette === i ? "border-brand ring-2 ring-brand/30" : "border-ink/15"}`}
                style={{ background: c.paper, color: c.brand }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: c.brand }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full !py-3" onClick={submit} loading={busy} disabled={!form.name}>
          <Sparkles className="h-4 w-4" /> {t("org.createEvent")}
        </Button>
      </div>
    </div>
  );
}
