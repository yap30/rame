"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Copy, Plus, ShieldCheck } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, Spinner } from "@/components/ui";

interface Bundle {
  scannerDevices: { id: string; name: string; deviceCode: string; authorizedAt: string | null; lastSeenAt: string | null }[];
}

export default function ScannerDevicesPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["org-event", id], queryFn: () => api<Bundle>(`/api/organizer/events/${id}`) });
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => api<{ device: { id: string; deviceCode: string } }>(`/api/organizer/events/${id}/scanner`, { method: "POST", body: JSON.stringify({ name: name || undefined }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-event", id] });
      setName("");
    },
  });

  const authorize = useMutation({
    mutationFn: (deviceId: string) => api(`/api/organizer/events/${id}/scanner/${deviceId}/authorize`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-event", id] }),
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="py-20 text-center">{t("common.notFound")}</div>;

  return (
    <div className="max-w-2xl">
      <div className="section-kicker">{t("org.scanner")}</div>
      <h1 className="section-title mb-2">{t("org.scannerDevices")}</h1>
      <p className="mb-6 text-sm text-ink/60">{t("scanner.sub")}</p>

      <div className="mb-6 flex gap-2">
        <input className="input" placeholder={t("scanner.deviceName")} value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => add.mutate()} loading={add.isPending} className="shrink-0">
          <Plus className="h-4 w-4" /> {t("org.addDevice")}
        </Button>
      </div>

      <div className="space-y-2">
        {data.scannerDevices.map((d) => (
          <div key={d.id} className="card flex items-center gap-3 !p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${d.authorizedAt ? "bg-emerald-100 text-emerald-700" : "bg-ink/5 text-ink/40"}`}>
              {d.authorizedAt ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{d.name}</div>
              <button
                className="flex items-center gap-1 font-mono text-xs text-ink/55 hover:text-brand"
                onClick={() => {
                  navigator.clipboard?.writeText(d.deviceCode);
                  setCopied(d.id);
                  setTimeout(() => setCopied(null), 1500);
                }}
                title="Salin kode"
              >
                {d.deviceCode} {copied === d.id ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            {d.authorizedAt ? (
              <Badge tone="success">{t("org.authorized")}</Badge>
            ) : (
              <Button variant="ghost" className="!py-1.5 text-xs" onClick={() => authorize.mutate(d.id)} loading={authorize.isPending}>
                {t("org.authorize")}
              </Button>
            )}
          </div>
        ))}
        {data.scannerDevices.length === 0 && <div className="card py-10 text-center text-sm text-ink/50">{t("org.noData")}</div>}
      </div>
    </div>
  );
}
