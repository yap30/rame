"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, QrCode, RefreshCw, Upload } from "lucide-react";
import { api, useT } from "@/lib/client";
import { Badge, Button, FadeUp, Spinner } from "@/components/ui";
import { motion } from "framer-motion";

interface ActivityData {
  activity: {
    id: string;
    eventId: string;
    eventSlug: string;
    eventName: string;
    title: string;
    description: string | null;
    type: string;
    completionMethod: string;
    completionMethodLabel: string;
    verificationRequired: boolean;
    repeatable: boolean;
    xpReward: number;
    icon: string;
    availabilityStartsAt: string | null;
    availabilityEndsAt: string | null;
    config: { questions?: { q: string; options: string[]; answer: number }[] };
    stamp: { id: string; name: string; emoji: string; color: string } | null;
    completedCount: number;
  };
  myStatus: {
    completed: boolean;
    completion: { id: string; method: string; completedAt: string; data: unknown } | null;
    qrAvailable: boolean;
    qrExpiresAt: string | null;
  } | null;
}

export default function ActivityPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["activity", id], queryFn: () => api<ActivityData>(`/api/activities/${id}`) });
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizWrong, setQuizWrong] = useState(false);

  const complete = useMutation({
    mutationFn: (body: { method?: string; data?: unknown }) =>
      api<{ correct?: boolean; message?: string }>(`/api/activities/${id}/complete`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => {
      if (res.correct === false) {
        setQuizWrong(true);
        return;
      }
      qc.invalidateQueries({ queryKey: ["activity", id] });
      qc.invalidateQueries({ queryKey: ["event"] });
    },
    onError: () => setQuizWrong(true),
  });

  useEffect(() => {
    if (data?.myStatus?.completed) setQuizWrong(false);
  }, [data?.myStatus?.completed]);

  // catat ACTIVITY_STARTED saat halaman dibuka (untuk analytics & replay)
  useEffect(() => {
    if (data && !data.myStatus?.completed) {
      fetch(`/api/activities/${id}/start`, { method: "POST" }).catch(() => {});
    }
  }, [data, id]);

  if (isLoading) return <div className="rame-container flex justify-center py-24"><Spinner className="h-8 w-8" /></div>;
  if (!data) return <div className="rame-container py-20 text-center">{t("common.notFound")}</div>;

  const a = data.activity;
  const done = data.myStatus?.completed ?? false;
  const questions = a.config.questions ?? [];
  const needsQr = a.completionMethod === "QR_VERIFY";
  const isQuiz = a.type === "QUIZ" && questions.length > 0;
  const isUpload = a.type === "PHOTO" || a.completionMethod === "UPLOAD";

  return (
    <div className="rame-container max-w-2xl py-12">
      <FadeUp>
        <Link href={`/events/${a.eventSlug}/map`} className="text-xs font-semibold text-ink/50 hover:text-brand">← {t("journey.backToEvent")}</Link>
        <div className="mt-4 flex items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand text-3xl text-brand-ink shadow-lift">{a.icon}</span>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-accent">{a.eventName}</div>
            <h1 className="font-display text-3xl font-bold">{a.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="brand">{a.completionMethodLabel}</Badge>
              <Badge>⚡ {a.xpReward} XP</Badge>
              {a.stamp && <Badge tone="accent">{a.stamp.emoji} {a.stamp.name}</Badge>}
              {a.repeatable ? <Badge>{t("activity.repeatable")}</Badge> : <Badge>{t("activity.notRepeatable")}</Badge>}
            </div>
          </div>
        </div>
      </FadeUp>

      {a.description && (
        <FadeUp delay={0.05}>
          <p className="mt-6 rounded-2xl border border-ink/10 bg-white/60 p-5 text-[15px] leading-relaxed text-ink/75">{a.description}</p>
        </FadeUp>
      )}

      {done ? (
        <DoneState data={data} />
      ) : (
        <div className="mt-8 space-y-6">
          {isQuiz && <QuizBlock questions={questions} answers={quizAnswers} setAnswers={setQuizAnswers} wrong={quizWrong} onAnswer={() => setQuizWrong(false)} onSubmit={() => complete.mutate({ method: "AUTO", data: { answers: quizAnswers } })} pending={complete.isPending} />}
          {needsQr && <QrBlock activityId={a.id} />}
          {isUpload && (
            <UploadBlock onUpload={(dataUrl) => complete.mutate({ method: "UPLOAD", data: { uploadUrl: dataUrl } })} pending={complete.isPending} />
          )}
          {!isQuiz && !needsQr && !isUpload && (
            <div className="card !p-6 text-center">
              <p className="mb-4 text-sm text-ink/60">{t("activity.quizIntro") === "Jawab dengan benar untuk menyelesaikan aktivitas." ? "Selesaikan aktivitas ini untuk menerima reward." : "Complete this activity to receive rewards."}</p>
              <Button onClick={() => complete.mutate({ method: "AUTO" })} loading={complete.isPending}>{t("activity.complete")}</Button>
            </div>
          )}
          {quizWrong && !isQuiz && (
            <div className="animate-shake-x rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{t("error.generic")}</div>
          )}
        </div>
      )}
    </div>
  );
}

function DoneState({ data }: { data: ActivityData }) {
  const t = useT();
  const a = data.activity;
  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="mt-8">
      <div className="card border-accent/30 bg-accent/5 !p-8 text-center">
        <div className="animate-stamp-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl" style={{ background: a.stamp?.color ?? "rgb(var(--rame-accent))", boxShadow: "0 8px 0 -3px rgb(0 0 0 / 0.15)" }}>
          {a.stamp?.emoji ?? "✅"}
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold text-brand">{t("activity.doneCelebrate")}</h2>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {a.stamp && <Badge tone="accent">{a.stamp.emoji} {a.stamp.name}</Badge>}
          <Badge tone="brand">⚡ +{a.xpReward} XP</Badge>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Link href={`/events/${a.eventSlug}/map`} className="btn-primary">{t("journey.title")}</Link>
          <Link href={`/events/${a.eventSlug}/stamps`} className="btn-ghost">{t("nav.stamps")}</Link>
        </div>
      </div>
    </motion.div>
  );
}

function QuizBlock({ questions, answers, setAnswers, wrong, onAnswer, onSubmit, pending }: {
  questions: { q: string; options: string[] }[];
  answers: number[];
  setAnswers: (a: number[]) => void;
  wrong: boolean;
  onAnswer: () => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const t = useT();
  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  return (
    <div className="card !p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold"><span className="text-lg">🧠</span> {t("activity.quizIntro")}</div>
      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div key={qi}>
            <div className="text-sm font-semibold">{qi + 1}. {q.q}</div>
            <div className="mt-2 grid gap-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => {
                    const next = [...answers];
                    next[qi] = oi;
                    setAnswers(next);
                    onAnswer();
                  }}
                  className={`rounded-xl border px-4 py-2.5 text-left text-sm transition ${answers[qi] === oi ? "border-brand bg-brand/10 font-semibold" : "border-ink/15 hover:bg-ink/5"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {wrong && <div className="mt-4 animate-shake-x rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{t("activity.quizWrong")}</div>}
      <Button className="mt-5 w-full" onClick={onSubmit} disabled={!allAnswered} loading={pending}>
        <Check className="h-4 w-4" /> {t("activity.quizSubmit")}
      </Button>
    </div>
  );
}

function QrBlock({ activityId }: { activityId: string }) {
  const t = useT();
  const [qr, setQr] = useState<{ qr: string; expiresAt: string; ttlSeconds: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);

  const loadQr = async () => {
    setLoading(true);
    try {
      const res = await api<{ qr: string; expiresAt: string; ttlSeconds: number }>(`/api/activities/${activityId}/qr`, { method: "POST" });
      setQr(res);
      setCountdown(res.ttlSeconds);
    } catch {
      setQr(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  useEffect(() => {
    if (!qr || countdown <= 0) return;
    const iv = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(iv);
  }, [qr, countdown]);

  const expired = countdown <= 0;

  return (
    <div className="card !p-6 text-center">
      <div className="mb-3 flex items-center justify-center gap-2 text-sm font-bold"><QrCode className="h-4 w-4 text-accent" /> {t("qr.title")}</div>
      <p className="mb-4 text-xs text-ink/55">{t("activity.scanInstructions")}</p>

      {loading && <div className="flex justify-center py-10"><Spinner className="h-8 w-8" /></div>}

      {!loading && qr && !expired && (
        <div className="relative mx-auto inline-block rounded-2xl border-4 border-brand bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr.qr} alt="QR" className="h-56 w-56" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-[10px] font-bold text-brand-ink">
            {t("qr.expiresIn")} {countdown}s
          </div>
        </div>
      )}

      {!loading && (!qr || expired) && (
        <div className="py-8">
          <div className="text-4xl">⏳</div>
          <p className="mt-2 text-sm font-semibold text-ink/60">{t("qr.expired")}</p>
          <Button className="mt-4" onClick={loadQr} loading={loading}>
            <RefreshCw className="h-4 w-4" /> {t("qr.refresh")}
          </Button>
        </div>
      )}
    </div>
  );
}

function UploadBlock({ onUpload, pending }: { onUpload: (dataUrl: string) => void; pending: boolean }) {
  const t = useT();
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div className="card !p-6 text-center">
      <div className="mb-3 text-sm font-bold"><Upload className="mr-1 inline h-4 w-4 text-accent" /> {t("activity.photoPrompt")}</div>
      <p className="mb-4 text-xs text-ink/55">{t("activity.uploadHint")}</p>
      {preview ? (
        <div className="mx-auto max-w-xs overflow-hidden rounded-2xl border border-ink/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="preview" className="w-full object-cover" />
        </div>
      ) : (
        <label className="mx-auto flex max-w-xs cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink/25 px-6 py-10 text-sm text-ink/55 hover:border-brand hover:text-brand">
          <Upload className="h-6 w-6" />
          {t("activity.photoUpload")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const reader = new FileReader();
              reader.onload = () => setPreview(String(reader.result));
              reader.readAsDataURL(f);
            }}
          />
        </label>
      )}
      {preview && (
        <Button className="mt-4" onClick={() => onUpload(preview)} loading={pending}>
          {t("activity.complete")}
        </Button>
      )}
    </div>
  );
}
