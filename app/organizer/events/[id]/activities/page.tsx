"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, InfoTip, Spinner } from "@/components/ui";

interface Bundle {
  event: { id: string; name: string };
  activities: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    completionMethod: string;
    verificationRequired: boolean;
    repeatable: boolean;
    xpReward: number;
    icon: string;
    stamp: { id: string; name: string; emoji: string } | null;
    achievement: { id: string; name: string } | null;
  }[];
  stamps: { id: string; name: string; emoji: string }[];
  achievements: { id: string; name: string; emoji: string }[];
}

const TYPES = ["PHOTO", "QUIZ", "QR_CHECKIN", "FEEDBACK", "SCAVENGER", "CUSTOM"];
const METHODS = ["AUTO", "QR_VERIFY"]; // ORGANIZER_VERIFY & UPLOAD dihapus — verifikasi panitia via QR
const ICONS = ["🎯", "🕰️", "🍢", "🧠", "🎻", "✍️", "🎸", "☕", "🎤", "💡", "🏛️", "📸"];

export default function ActivitiesPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["org-event", id], queryFn: () => api<Bundle>(`/api/organizer/events/${id}`) });

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "CUSTOM",
    completionMethod: "AUTO",
    verificationRequired: false,
    repeatable: false,
    xpReward: 50,
    icon: "🎯",
    stampId: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api(`/api/organizer/events/${id}/activities`, {
        method: "POST",
        body: JSON.stringify({ ...form, xpReward: Number(form.xpReward) }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-event", id] });
      setForm({ title: "", description: "", type: "CUSTOM", completionMethod: "AUTO", verificationRequired: false, repeatable: false, xpReward: 50, icon: "🎯", stampId: "" });
    },
  });

  const update = useMutation({
    mutationFn: (activityId: string) =>
      api(`/api/organizer/activities/${activityId}`, {
        method: "PATCH",
        body: JSON.stringify({ ...form, xpReward: Number(form.xpReward) }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-event", id] });
      setEditingId(null);
      setForm({ title: "", description: "", type: "CUSTOM", completionMethod: "AUTO", verificationRequired: false, repeatable: false, xpReward: 50, icon: "🎯", stampId: "" });
    },
  });

  const remove = useMutation({
    mutationFn: (activityId: string) => api(`/api/organizer/activities/${activityId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-event", id] }),
  });

  // stempel kustom buatan EO
  const [newStamp, setNewStamp] = useState({ name: "", emoji: "📮" });
  const addStamp = useMutation({
    mutationFn: () => api<{ stamp: { id: string; name: string; emoji: string } }>(`/api/organizer/events/${id}/stamps`, { method: "POST", body: JSON.stringify(newStamp) }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["org-event", id] });
      setForm((f) => ({ ...f, stampId: res.stamp.id }));
      setNewStamp({ name: "", emoji: "📮" });
    },
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="py-20 text-center">{t("common.notFound")}</div>;

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-3xl">
      <div className="section-kicker">{t("org.activityBuilder")}</div>
      <h1 className="section-title mb-6">{t("org.activityBuilder")}</h1>

      {/* daftar */}
      <div className="mb-8 space-y-2">
        {data.activities.map((a) => (
          <div key={a.id} className="card flex items-center gap-3 !p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-xl">{a.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{a.title}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge>{a.type}</Badge>
                <Badge tone="brand">{a.completionMethod}</Badge>
                {a.verificationRequired && <Badge tone="accent">🔎 {t("activity.verifyRequired")}</Badge>}
                {a.stamp && <Badge tone="accent">{a.stamp.emoji} {a.stamp.name}</Badge>}
                <Badge>⚡ {a.xpReward} XP</Badge>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                className="btn-ghost !px-2 !py-1.5"
                onClick={() => {
                  setEditingId(a.id);
                  setForm({ title: a.title, description: a.description ?? "", type: a.type, completionMethod: a.completionMethod, verificationRequired: a.verificationRequired, repeatable: a.repeatable, xpReward: a.xpReward, icon: a.icon, stampId: a.stamp?.id ?? "" });
                }}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button className="btn-ghost !px-2 !py-1.5 !text-red-600" onClick={() => remove.mutate(a.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {data.activities.length === 0 && <div className="card py-10 text-center text-sm text-ink/50">{t("org.noData")}</div>}
      </div>

      {/* form tambah/edit */}
      <div className="card !p-5">
        <div className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
          {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editingId ? "Edit Aktivitas" : t("org.addActivity")}
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">{t("org.activityTitle")} *</label>
            <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <label className="label">{t("activity.description") ?? "Deskripsi"}</label>
            <input className="input" value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label className="label !mb-0">{t("org.activityType")}</label>
                <InfoTip text={t("org.at.photo")} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((ty) => (
                  <button
                    key={ty}
                    type="button"
                    onClick={() => set("type", ty)}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                      form.type === ty ? "border-brand bg-brand/10 text-brand" : "border-ink/15 hover:bg-ink/5"
                    }`}
                  >
                    {ty}
                    <InfoTip text={t(`org.at.${ty.toLowerCase()}`)} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <label className="label !mb-0">{t("org.completionMethod")}</label>
                <InfoTip text={t("org.cm.qr_verify")} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set("completionMethod", m)}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                      form.completionMethod === m ? "border-brand bg-brand/10 text-brand" : "border-ink/15 hover:bg-ink/5"
                    }`}
                  >
                    {m}
                    <InfoTip text={t(`org.cm.${m.toLowerCase()}`)} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="label">{t("org.xpReward")}</label>
              <input type="number" min={0} className="input w-28" value={form.xpReward} onChange={(e) => set("xpReward", Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Icon</label>
              <div className="flex flex-wrap gap-1">
                {ICONS.slice(0, 8).map((ic) => (
                  <button key={ic} onClick={() => set("icon", ic)} className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${form.icon === ic ? "border-brand bg-brand/10" : "border-ink/15"}`}>
                    {ic}
                  </button>
                ))}
                <input
                  className="input h-9 w-24 !px-2 text-center text-lg"
                  value={form.icon}
                  onChange={(e) => set("icon", e.target.value)}
                  placeholder="✨"
                  title="Ikon kustom (emoji bebas)"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{t("org.stampReward")}</label>
              <select className="input" value={form.stampId} onChange={(e) => set("stampId", e.target.value)}>
                <option value="">—</option>
                {data.stamps.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
              </select>
              {/* stempel kustom buatan EO */}
              <div className="mt-2 flex gap-1.5">
                <input className="input h-9 w-12 !px-1 text-center" value={newStamp.emoji} onChange={(e) => setNewStamp((s) => ({ ...s, emoji: e.target.value }))} title="Emoji stempel" />
                <input
                  className="input h-9 flex-1 !px-2 text-xs"
                  value={newStamp.name}
                  onChange={(e) => setNewStamp((s) => ({ ...s, name: e.target.value }))}
                  placeholder={t("org.stampCustom") ?? "Stempel baru…"}
                />
                <Button variant="ghost" className="!h-9 !px-3 text-xs" onClick={() => addStamp.mutate()} loading={addStamp.isPending} disabled={!newStamp.name.trim()}>
                  + {t("org.stampCustomAdd") ?? "Buat"}
                </Button>
              </div>
            </div>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.verificationRequired} onChange={(e) => set("verificationRequired", e.target.checked)} className="h-4 w-4 accent-[rgb(var(--rame-brand))]" />
                {t("org.verifyRequired")} <InfoTip text={t("org.verifyRequiredHint")} />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={form.repeatable} onChange={(e) => set("repeatable", e.target.checked)} className="h-4 w-4 accent-[rgb(var(--rame-brand))]" />
                {t("org.repeatable")}
              </label>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={() => (editingId ? update.mutate(editingId) : create.mutate())}
            disabled={!form.title}
            loading={create.isPending || update.isPending}
          >
            <Check className="h-4 w-4" /> {editingId ? t("common.save") : t("org.addActivity")}
          </Button>
        </div>
      </div>
    </div>
  );
}
