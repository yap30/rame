"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2 } from "lucide-react";
import { api, useT } from "@/lib/client";
import { useThemeEffect } from "@/lib/client";
import { Badge, Button, FadeUp, Spinner } from "@/components/ui";
import { motion } from "framer-motion";

interface CredentialData {
  event: { slug: string; name: string; identity: Record<string, unknown>; joined: boolean; organization: { name: string } | null };
  credential: {
    id: string;
    enabled: boolean;
    title: string | null;
    description: string | null;
    schemaId: string | null;
    eligibilityPolicy: string;
    issuerOrgName: string | null;
    status: string | null;
    providerReference: string | null;
  } | null;
  progress: { completed: number; total: number } | null;
}

const STATUS_TONE: Record<string, "success" | "accent" | "neutral" | "danger"> = {
  ISSUED: "success",
  ELIGIBLE: "accent",
  PENDING: "neutral",
  FAILED: "danger",
  REVOKED: "danger",
};

export default function CredentialPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["event", slug], queryFn: () => api<CredentialData>(`/api/events/${slug}`) });
  useThemeEffect(data?.event.identity);

  const claim = useMutation({
    mutationFn: () => api<{ status: string; providerReference?: string }>(`/api/events/${slug}/credential/claim`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["event", slug] }),
  });

  if (isLoading) return <div className="rame-container flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="rame-container py-20 text-center">{t("common.notFound")}</div>;

  const cred = data.credential;
  if (!cred || !cred.enabled) {
    return (
      <div className="rame-container max-w-md py-24 text-center">
        <div className="text-5xl">📜</div>
        <h1 className="mt-4 font-display text-2xl font-bold">{t("credential.notConfigured")}</h1>
        <Link href={`/events/${slug}`} className="btn-ghost mt-6">{t("journey.backToEvent")}</Link>
      </div>
    );
  }

  const status = cred.status ?? "NONE";
  const canClaim = status === "ELIGIBLE" || status === "ELIGIBLE_PENDING_CHECK" || status === "FAILED";

  return (
    <div className="rame-container max-w-xl py-12">
      <FadeUp>
        <Link href={`/events/${slug}`} className="text-xs font-semibold text-ink/50 hover:text-brand">← {t("journey.backToEvent")}</Link>
        <div className="mt-3">
          <div className="section-kicker">{t("nav.credential")}</div>
          <h1 className="section-title">{cred.title ?? t("credential.title")}</h1>
          <p className="mt-2 text-sm text-ink/60">{t("credential.sub")}</p>
        </div>
      </FadeUp>

      <FadeUp delay={0.05}>
        <div className="card mt-8 !p-8 text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl shadow-lift"
            style={{
              background: status === "ISSUED" ? "linear-gradient(135deg, rgb(var(--rame-brand)), rgb(var(--rame-gold)))" : "rgb(var(--rame-brand-soft))",
              color: status === "ISSUED" ? "#fff" : "rgb(var(--rame-ink))",
            }}
          >
            {status === "ISSUED" ? <BadgeCheck className="h-12 w-12" /> : status === "PENDING" ? <Loader2 className="h-10 w-10 animate-spin" /> : <span className="text-4xl">📜</span>}
          </motion.div>

          <div className="mt-5 flex justify-center">
            <Badge tone={STATUS_TONE[status] ?? "neutral"}>
              {status === "ISSUED" ? t("credential.issued") : status === "PENDING" ? t("credential.pending") : status === "FAILED" ? t("credential.failed") : status === "REVOKED" ? t("credential.revoked") : t("credential.notEligible")}
            </Badge>
          </div>

          <div className="mt-6 space-y-2 text-left">
            <div className="flex justify-between border-b border-ink/10 pb-2 text-sm"><span className="text-ink/55">{t("credential.issuer")}</span><span className="font-semibold">{cred.issuerOrgName ?? data.event.organization?.name ?? "RAME"}</span></div>
            <div className="flex justify-between border-b border-ink/10 pb-2 text-sm"><span className="text-ink/55">{t("credential.policy")}</span><span className="font-semibold">{cred.eligibilityPolicy.replace(/_/g, " ")}</span></div>
            <div className="flex justify-between border-b border-ink/10 pb-2 text-sm"><span className="text-ink/55">Schema ID</span><span className="font-mono text-xs">{cred.schemaId}</span></div>
            {cred.providerReference && (
              <div className="flex justify-between border-b border-ink/10 pb-2 text-sm"><span className="text-ink/55">Ref</span><span className="max-w-[200px] truncate font-mono text-xs">{cred.providerReference}</span></div>
            )}
            <div className="flex justify-between text-sm"><span className="text-ink/55">{t("event.journeyMode") === "Mode Journey" ? "Progres" : "Progress"}</span><span className="font-semibold">{data.progress?.completed ?? 0}/{data.progress?.total ?? 0}</span></div>
          </div>

          {cred.description && <p className="mt-4 text-xs text-ink/55">{cred.description}</p>}

          {canClaim && (
            <Button className="mt-6 w-full !py-3" onClick={() => claim.mutate()} loading={claim.isPending}>
              <BadgeCheck className="h-4 w-4" /> {t("credential.claim")}
            </Button>
          )}
          {status === "ISSUED" && <div className="mt-3 text-xs font-semibold text-emerald-700">✓ {t("credential.claimed")} · e.id wallet</div>}
        </div>
      </FadeUp>
    </div>
  );
}
