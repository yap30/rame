"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Rocket } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, Spinner } from "@/components/ui";

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
    startsAt: string | null;
    endsAt: string | null;
    identity: { logoEmoji?: string; brand?: string; eventShortName?: string; brandSoft?: string; accent?: string; gold?: string; paper?: string; ink?: string };
    venue: { name: string; address?: string | null; city?: string | null } | null;
    organization: { name: string } | null;
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
          <label className="label">{t("org.journeyMode")}</label>
          <select className="input" value={form.journeyMode ?? "HYBRID"} onChange={(ev) => setForm((f) => ({ ...f, journeyMode: ev.target.value }))}>
            <option value="LINEAR">Linier</option>
            <option value="BRANCHING">Bercabang</option>
            <option value="FREE_EXPLORATION">Eksplorasi Bebas</option>
            <option value="HYBRID">Hibrida</option>
          </select>
        </div>
        <div>
          <label className="label">{t("org.story")}</label>
          <textarea className="input min-h-[130px]" value={form.story ?? ""} onChange={(ev) => setForm((f) => ({ ...f, story: ev.target.value }))} />
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
