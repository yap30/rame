"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BadgeCheck, Save } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, InfoTip, Spinner } from "@/components/ui";

interface Bundle {
  event: { id: string; name: string };
  credentialConfig: {
    id: string;
    enabled: boolean;
    title: string | null;
    description: string | null;
    schemaId: string | null;
    eligibilityPolicy: string;
    issuerOrgName: string | null;
  } | null;
  activities: { id: string; title: string }[];
  achievements: { id: string; name: string }[];
}

const POLICIES = ["EVENT_COMPLETION", "MILESTONE", "ACHIEVEMENT", "CUSTOM"];

export default function CredentialConfigPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["org-event", id], queryFn: () => api<Bundle>(`/api/organizer/events/${id}`) });

  const [form, setForm] = useState({
    enabled: true,
    title: "",
    description: "",
    schemaId: "",
    eligibilityPolicy: "EVENT_COMPLETION",
    issuerOrgName: "",
  });

  useEffect(() => {
    if (data?.credentialConfig) {
      const c = data.credentialConfig;
      setForm({ enabled: c.enabled, title: c.title ?? "", description: c.description ?? "", schemaId: c.schemaId ?? "", eligibilityPolicy: c.eligibilityPolicy, issuerOrgName: c.issuerOrgName ?? "" });
    } else if (data) {
      setForm((f) => ({ ...f, title: `Kredensial ${data.event.name}`, schemaId: `rame-${data.event.id.slice(0, 8)}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.event?.id]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/organizer/events/${id}/credential`, {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-event", id] }),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="py-20 text-center">{t("common.notFound")}</div>;

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl">
      <div className="section-kicker">{t("nav.credential")}</div>
      <h1 className="section-title mb-2">{t("org.enableCredential")}</h1>
      <p className="mb-4 text-sm text-ink/60">{t("credential.sub")}</p>

      {/* penjelasan konteks */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand/15 bg-brand/5 p-4 text-sm leading-relaxed text-ink/75">
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <span>
          <strong className="text-brand">Bagaimana cara kerjanya?</strong> {t("org.credentialHow")}
        </span>
      </div>

      <div className="card space-y-4 !p-5">
        <label className="flex items-center justify-between rounded-xl border border-ink/10 bg-white/60 px-4 py-3">
          <div>
            <div className="text-sm font-bold">{t("org.enableCredential")}</div>
            <div className="text-xs text-ink/50">e.id Issuer · auto-issuance</div>
          </div>
          <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-5 w-5 accent-[rgb(var(--rame-brand))]" />
        </label>

        <div>
          <label className="label">{t("org.credentialTitle")}</label>
          <input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <label className="label">{t("org.credentialDesc")}</label>
          <input className="input" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <label className="label !mb-0">{t("org.schemaId")}</label>
              <InfoTip text={t("org.schemaIdHint")} />
            </div>
            <input className="input font-mono text-xs" value={form.schemaId} onChange={(e) => set("schemaId", e.target.value)} />
          </div>
          <div>
            <label className="label">{t("credential.issuer")}</label>
            <input className="input" value={form.issuerOrgName} onChange={(e) => set("issuerOrgName", e.target.value)} placeholder="Nama organisasi EO" />
          </div>
        </div>
        <div>
          <label className="label">{t("credential.policy")}</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {POLICIES.map((p) => (
              <button
                key={p}
                onClick={() => set("eligibilityPolicy", p)}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${form.eligibilityPolicy === p ? "border-brand bg-brand/10" : "border-ink/15 hover:bg-ink/5"}`}
              >
                {p.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-brand-soft/60 px-4 py-3 text-xs text-ink/60">
          <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />
          ELIGIBLE → PENDING → ISSUED · webhook e.id memperbarui status otomatis (idempoten)
        </div>

        <Button className="w-full !py-3" onClick={() => save.mutate()} loading={save.isPending}>
          <Save className="h-4 w-4" /> {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
