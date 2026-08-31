"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Rocket } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, InfoTip, Spinner } from "@/components/ui";

interface Bundle {
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
    pricingModel: string;
    price: number | null;
    quota: number | null;
    startsAt: string | null;
    endsAt: string | null;
    identity: { logoEmoji?: string; brand?: string; eventShortName?: string; brandSoft?: string; accent?: string; gold?: string; paper?: string; ink?: string };
    venue: { name: string; address?: string | null; city?: string | null } | null;
    organization: { name: string } | null;
    waitlist: { id: string; userId: string; name: string; email: string | null; joinedAt: string }[];
  };
}

export default function EventSetupPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["org-event", id], queryFn: () => api<Bundle>(`/api/organizer/events/${id}`) });

  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) {
      const e = data.event;
      setForm({
        name: e.name,
        tagline: e.tagline ?? "",
        description: e.description ?? "",
        story: e.story ?? "",
        city: e.city ?? "",
        journeyMode: e.journeyMode,
        pricingModel: e.pricingModel,
        price: e.price != null ? String(e.price) : "",
        quota: e.quota != null ? String(e.quota) : "",
        venueName: e.venue?.name ?? "",
        startsAt: e.startsAt ? e.startsAt.slice(0, 16) : "",
        endsAt: e.endsAt ? e.endsAt.slice(0, 16) : "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/organizer/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          story: form.story,
          city: form.city,
          journeyMode: form.journeyMode,
          pricingModel: form.pricingModel === "PAID" ? "PAID" : "FREE",
          price: form.price ? Number(form.price) : null,
          quota: form.quota ? Number(form.quota) : null,
          venueName: form.venueName,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-event", id] }),
  });

  const publish = useMutation({
    mutationFn: () => api(`/api/organizer/events/${id}/publish`, { method: "POST", body: JSON.stringify({ status: "PUBLISHED" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-event", id] }),
  });

  const waitlistAction = useMutation({
    mutationFn: ({ pid, action }: { pid: string; action: string }) => api(`/api/organizer/events/${id}/waitlist/${pid}`, { method: "POST", body: JSON.stringify({ action }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-event", id] }),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="py-20 text-center">{t("common.notFound")}</div>;

  const e = data.event;
  const identity = e.identity;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="section-kicker">{e.organization?.name}</div>
          <h1 className="section-title flex items-center gap-3">{identity.logoEmoji ?? "🎪"} {e.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            {e.status === "PUBLISHED" ? <Badge tone="success">● {t("org.published")}</Badge> : <Badge>{t("org.draft")}</Badge>}
            <Link href={`/events/${e.slug}`} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
              <ExternalLink className="h-3 w-3" /> /events/{e.slug}
            </Link>
          </div>
        </div>
        <Button variant="accent" onClick={() => publish.mutate()} loading={publish.isPending}>
          <Rocket className="h-4 w-4" /> {e.status === "PUBLISHED" ? t("org.published") : t("org.publish")}
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">{t("org.eventName")}</label>
          <input className="input" value={form.name ?? ""} onChange={(ev) => setForm((f) => ({ ...f, name: ev.target.value }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t("org.tagline")}</label>
            <input className="input" value={form.tagline ?? ""} onChange={(ev) => setForm((f) => ({ ...f, tagline: ev.target.value }))} />
          </div>
          <div>
            <label className="label">{t("org.city")}</label>
            <input className="input" value={form.city ?? ""} onChange={(ev) => setForm((f) => ({ ...f, city: ev.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">{t("org.venue")}</label>
          <input className="input" value={form.venueName ?? ""} onChange={(ev) => setForm((f) => ({ ...f, venueName: ev.target.value }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Mulai</label>
            <input type="datetime-local" className="input" value={form.startsAt ?? ""} onChange={(ev) => setForm((f) => ({ ...f, startsAt: ev.target.value }))} />
          </div>
          <div>
            <label className="label">Selesai</label>
            <input type="datetime-local" className="input" value={form.endsAt ?? ""} onChange={(ev) => setForm((f) => ({ ...f, endsAt: ev.target.value }))} />
          </div>
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
                onClick={() => setForm((f) => ({ ...f, journeyMode: m.value }))}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  form.journeyMode === m.value ? "border-brand bg-brand/10 text-brand" : "border-ink/15 hover:bg-ink/5"
                }`}
              >
                {m.value === "LINEAR" ? "→" : m.value === "BRANCHING" ? "⎇" : m.value === "FREE_EXPLORATION" ? "✦" : "◈"}{" "}
                {t(m.key === "org.jm.linear" ? "common.linear" : m.key === "org.jm.branching" ? "common.branching" : m.key === "org.jm.free" ? "common.freeExplore" : "common.hybrid")}
                <InfoTip text={t(m.key)} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">{t("org.story")}</label>
          <textarea className="input min-h-[130px]" value={form.story ?? ""} onChange={(ev) => setForm((f) => ({ ...f, story: ev.target.value }))} />
        </div>

        {/* harga & kuota */}
        <div className="card space-y-3 !p-4">
          <div className="label">{t("org.pricing")}</div>
          <div className="flex gap-2">
            {[
              { value: "FREE", label: t("org.free") },
              { value: "PAID", label: t("org.paid") },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, pricingModel: p.value }))}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                  form.pricingModel === p.value ? "border-brand bg-brand/10 text-brand" : "border-ink/15 hover:bg-ink/5"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {form.pricingModel === "PAID" && (
            <div>
              <label className="label">{t("org.price")}</label>
              <input type="number" min={0} step={1000} className="input" value={form.price ?? ""} onChange={(ev) => setForm((f) => ({ ...f, price: ev.target.value }))} placeholder="50000" />
            </div>
          )}
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <label className="label !mb-0">{t("org.quota")}</label>
              <InfoTip text={t("org.quotaHint")} />
            </div>
            <input type="number" min={0} className="input" value={form.quota ?? ""} onChange={(ev) => setForm((f) => ({ ...f, quota: ev.target.value }))} placeholder="tanpa batas" />
          </div>
        </div>

        {/* waiting list */}
        <div className="card space-y-2 !p-4">
          <div className="flex items-center gap-2">
            <span className="label !mb-0">{t("org.waitlist")}</span>
            {data.event.waitlist.length > 0 && <Badge tone="accent">{data.event.waitlist.length}</Badge>}
          </div>
          {data.event.waitlist.length === 0 ? (
            <p className="text-sm text-ink/50">{t("org.waitlistEmpty")}</p>
          ) : (
            data.event.waitlist.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/10 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{w.name}</div>
                  <div className="truncate text-xs text-ink/50">{w.email ?? "—"}</div>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="accent" className="!px-3 !py-1.5 text-xs" onClick={() => waitlistAction.mutate({ pid: w.id, action: "approve" })} loading={waitlistAction.isPending}>
                    {t("org.approve")}
                  </Button>
                  <Button variant="ghost" className="!px-3 !py-1.5 text-xs !text-red-600" onClick={() => waitlistAction.mutate({ pid: w.id, action: "reject" })}>
                    {t("org.reject")}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* preview identitas */}
        <div className="card !p-5">
          <div className="label">{t("org.identityNote")}</div>
          <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: identity.paper ?? "#f8f4ea" }}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-lift" style={{ background: identity.brand ?? "#1e3a34", color: "#fff" }}>
              {identity.logoEmoji ?? "🎪"}
            </span>
            <div>
              <div className="font-display font-bold" style={{ color: identity.brand ?? "#1e3a34" }}>{identity.eventShortName ?? e.name}</div>
              <div className="text-xs" style={{ color: identity.ink ?? "#22302c" }}>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: identity.accent ?? "#d97706", color: "#fff" }}>CTA</span>{" "}
                · <span style={{ color: identity.gold ?? "#b98a1a" }}>★ aksen</span>
              </div>
            </div>
          </div>
        </div>

        <Button onClick={() => save.mutate()} loading={save.isPending} className="w-full !py-3">
          <CheckCircle2 className="h-4 w-4" /> {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
