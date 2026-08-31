import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";
import { completeActivity } from "@/lib/gamification";
import { LOG_ACTIONS } from "@/lib/const";
import { logEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * Selesaikan aktivitas (AUTO / QUIZ / UPLOAD / ORGANIZER_VERIFY).
 * Reward (XP, stamp, achievement, kelayakan kredensial) diproses
 * oleh mesin gamification dengan idempotensi.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ activityId: string }> }) {
  const { activityId } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);

  const body = (await req.json().catch(() => ({}))) as { method?: string; data?: unknown };

  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) return apiError("Aktivitas tidak ditemukan.", "ACTIVITY_NOT_FOUND", 404);

  // kuis: validasi jawaban di sini (data.config.questions)
  let dataJson: unknown = body.data;
  if (activity.type === "QUIZ") {
    const questions = ((activity.configJson as { questions?: { q: string; options: string[]; answer: number }[] } | null)?.questions) ?? [];
    const answers = (body.data as { answers?: number[] } | null)?.answers ?? [];
    if (questions.length === 0) return apiError("Kuis belum dikonfigurasi.", "QUIZ_NOT_CONFIGURED", 400);
    const correct = questions.every((q, i) => q.answer === answers[i]);
    if (!correct) {
      await logEvent(activity.eventId, session.sub, "PARTICIPANT", "QUIZ_WRONG", { activityId });
      return Response.json({ correct: false, message: "WRONG_ANSWER" }, { status: 422 });
    }
    dataJson = { score: questions.length, total: questions.length, answers };
  }

  if (activity.type === "UPLOAD" || activity.completionMethod === "UPLOAD") {
    // bukti terunggah — verifikasi oleh panitia (simulasi: langsung valid di demo)
    dataJson = { ...(dataJson as object), upload: (body.data as { uploadUrl?: string } | null)?.uploadUrl ?? "demo://upload" };
  }

  try {
    const summary = await completeActivity({
      activityId,
      userId: session.sub,
      eventId: activity.eventId,
      method: body.method ?? "AUTO",
      dataJson,
      idempotencyKey: `complete:${activityId}:${session.sub}`,
    });

    if (summary.duplicate) {
      return Response.json({ ...summary, message: "ALREADY_COMPLETED" }, { status: 200 });
    }
    return Response.json({ ...summary, message: "COMPLETED" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "INTERNAL";
    if (msg === "ACTIVITY_NOT_OPEN") return apiError("Aktivitas belum dibuka.", "ACTIVITY_NOT_OPEN", 403);
    if (msg === "ACTIVITY_CLOSED") return apiError("Aktivitas sudah ditutup.", "ACTIVITY_CLOSED", 403);
    throw err;
  }
}
