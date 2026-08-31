"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, Upload } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Button, InfoTip } from "@/components/ui";

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
    pricingModel: "FREE",
    price: "",
    quota: "",
    venueName: "",
    emoji: EMOJIS[0],
    palette: 0,
    logoUrl: "",
    customTag: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const pal = COLORS[form.palette] ?? COLORS[0]; // palette -1 (custom tag) → warna default
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
          pricingModel: form.pricingModel === "PAID" ? "PAID" : "FREE",
          price: form.price ? Number(form.price) : null,
          quota: form.quota ? Number(form.quota) : null,
          venueName: form.venueName || undefined,
          identity: {
            eventShortName: form.name,
            logoEmoji: form.emoji,
            logoUrl: form.logoUrl || undefined,
            ...pal,
            label: form.customTag || pal.label, // override label palette dengan tag kustom
          },
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
          <div className="mb-1.5 flex items-center gap-1.5">
            <label className="label !mb-0">{t("org.journeyMode")}</label>
            <InfoTip text={t("org.jm.hybrid")} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { value: "LINEAR", key: "org.jm.linear" },
              { value: "BRANCHING", key: "org.jm.branching" },
              { value: "FREE_EXPLORATION", key: "org.jm.free" },
              { value: "HYBRID", key: "org.jm.hybrid" },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => set("journeyMode", m.value)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  form.journeyMode === m.value ? "border-brand bg-brand/10 text-brand" : "border-ink/15 hover:bg-ink/5"
                }`}
              >
                {m.value === "LINEAR" ? "→" : m.value === "BRANCHING" ? "⎇" : m.value === "FREE_EXPLORATION" ? "✦" : "◈"} {t(m.key === "org.jm.linear" ? "common.linear" : m.key === "org.jm.branching" ? "common.branching" : m.key === "org.jm.free" ? "common.freeExplore" : "common.hybrid")}
                <InfoTip text={t(m.key)} />
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <label className="label !mb-0">{t("org.pricing")}</label>
            </div>
            <div className="flex gap-2">
              {[
                { value: "FREE", label: t("org.free") },
                { value: "PAID", label: t("org.paid") },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set("pricingModel", p.value)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    form.pricingModel === p.value ? "border-brand bg-brand/10 text-brand" : "border-ink/15 hover:bg-ink/5"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {form.pricingModel === "PAID" && (
              <input type="number" min={0} step={1000} className="input mt-2" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder={t("org.price") + " (Rp)"} />
            )}
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <label className="label !mb-0">{t("org.quota")}</label>
              <InfoTip text={t("org.quotaHint")} />
            </div>
            <input type="number" min={0} className="input" value={form.quota} onChange={(e) => set("quota", e.target.value)} placeholder="tanpa batas" />
          </div>
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
          <div className="mb-2 flex flex-wrap gap-2">
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
            {/* tag kustom */}
            <button
              onClick={() => set("palette", -1)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${form.palette === -1 ? "border-brand ring-2 ring-brand/30" : "border-ink/15"}`}
            >
              ✏️ Custom tag
            </button>
          </div>
          {form.palette === -1 && (
            <input className="input mb-2" value={form.customTag} onChange={(e) => set("customTag", e.target.value)} placeholder="Tulis tag kustom (mis. Festival, Kompetisi, Pameran…)" />
          )}

          {/* logo upload */}
          <div className="mb-1 text-xs font-semibold text-ink/55">Logo (opsional — unggah gambar sendiri)</div>
          {form.logoUrl ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.logoUrl} alt="logo" className="h-12 w-12 rounded-xl border border-ink/10 object-cover" />
              <button onClick={() => set("logoUrl", "")} className="text-xs font-semibold text-red-600 hover:underline">Hapus logo</button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-ink/20 px-4 py-3 text-xs text-ink/55 hover:border-brand hover:text-brand">
              <Upload className="h-4 w-4" /> Unggah gambar logo (PNG/JPG)
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => set("logoUrl", String(reader.result));
                  reader.readAsDataURL(f);
                }}
              />
            </label>
          )}
        </div>

        <Button className="w-full !py-3" onClick={submit} loading={busy} disabled={!form.name}>
          <Sparkles className="h-4 w-4" /> {t("org.createEvent")}
        </Button>
      </div>
    </div>
  );
}
