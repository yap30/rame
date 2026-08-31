"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Send } from "lucide-react";
import { api, useT } from "@/lib/client";
import { useThemeEffect } from "@/lib/client";
import { Badge, Button, FadeUp, Spinner } from "@/components/ui";
import { motion } from "framer-motion";

interface FeedbackData {
  event: { slug: string; name: string; identity: Record<string, unknown>; joined: boolean };
  feedback: {
    id: string;
    title: string | null;
    description: string | null;
    required: boolean;
    submitted: boolean;
    questions: { id: string; prompt: string; type: string; required: boolean; options: string[] }[];
  } | null;
}

export default function FeedbackPage() {
  const { slug } = useParams<{ slug: string }>();
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["event", slug], queryFn: () => api<FeedbackData>(`/api/events/${slug}`) });
  useThemeEffect(data?.event.identity);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const submit = useMutation({
    mutationFn: () => api(`/api/feedback/${data?.feedback?.id}/submit`, { method: "POST", body: JSON.stringify({ answers }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event", slug] });
      router.push(`/events/${slug}`);
    },
  });

  if (isLoading) return <div className="rame-container flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="rame-container py-20 text-center">{t("common.notFound")}</div>;
  if (!data.feedback) {
    return (
      <div className="rame-container max-w-md py-20 text-center">
        <div className="text-4xl">💬</div>
        <p className="mt-3 text-ink/60">—</p>
      </div>
    );
  }

  const form = data.feedback;

  if (form.submitted) {
    return (
      <div className="rame-container max-w-md py-24 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="text-6xl">🙏</div>
          <h1 className="mt-4 font-display text-2xl font-bold">{t("feedback.thanks")}</h1>
          <p className="mt-2 text-sm text-ink/55">{t("feedback.alreadySubmitted")}</p>
          <Link href={`/events/${slug}`} className="btn-primary mt-6">{t("journey.backToEvent")}</Link>
        </motion.div>
      </div>
    );
  }

  const requiredMissing = form.questions.some((q) => q.required && !answers[q.id]);

  return (
    <div className="rame-container max-w-xl py-12">
      <FadeUp>
        <Link href={`/events/${slug}`} className="text-xs font-semibold text-ink/50 hover:text-brand">← {t("journey.backToEvent")}</Link>
        <div className="mt-3">
          <div className="section-kicker">{data.event.name}</div>
          <h1 className="section-title">{t("feedback.title")}</h1>
          <p className="mt-2 text-sm text-ink/60">{t("feedback.sub")}</p>
          {form.required && <div className="mt-3"><Badge tone="accent">{t("feedback.requiredNote")}</Badge></div>}
        </div>
      </FadeUp>

      <div className="mt-8 space-y-5">
        {form.questions.map((q, qi) => (
          <FadeUp key={q.id} delay={qi * 0.05}>
            <div className="card !p-5">
              <div className="mb-3 text-sm font-bold">
                {qi + 1}. {q.prompt} {q.required && <span className="text-accent">*</span>}
              </div>
              {q.type === "RATING" && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(n) }))}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border text-lg transition ${
                        answers[q.id] === String(n) ? "border-accent bg-accent/15 scale-110" : "border-ink/15 hover:bg-ink/5"
                      }`}
                      aria-label={`${n} bintang`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {q.type === "TEXT" && (
                <textarea
                  className="input min-h-[96px]"
                  placeholder="…"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
              {q.type === "CHOICE" && (
                <div className="grid gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      className={`rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                        answers[q.id] === opt ? "border-brand bg-brand/10 font-semibold" : "border-ink/15 hover:bg-ink/5"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FadeUp>
        ))}

        <Button className="w-full !py-3" onClick={() => submit.mutate()} disabled={requiredMissing} loading={submit.isPending}>
          <Send className="h-4 w-4" /> {t("feedback.submit")}
        </Button>
      </div>
    </div>
  );
}
