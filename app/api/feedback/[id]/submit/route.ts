import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";
import { logEvent } from "@/lib/analytics";
import { LOG_ACTIONS } from "@/lib/const";

export const dynamic = "force-dynamic";

/** Kirim umpan balik (POST /api/feedback/{id}/submit) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);

  const form = await prisma.feedbackForm.findUnique({
    where: { id },
    include: { questions: true },
  });
  if (!form) return apiError("Form tidak ditemukan.", "FORM_NOT_FOUND", 404);

  const existing = await prisma.feedbackResponse.findUnique({ where: { formId_userId: { formId: form.id, userId: session.sub } } });
  if (existing) return apiError("Umpan balik sudah dikirim.", "ALREADY_SUBMITTED", 409);

  const body = (await req.json().catch(() => ({}))) as { answers?: Record<string, string> };
  const answers = body.answers ?? {};

  // validasi pertanyaan wajib
  for (const q of form.questions) {
    if (q.required && !answers[q.id]) return apiError(`Pertanyaan wajib belum diisi: ${q.prompt}`, "REQUIRED_MISSING", 422);
  }

  const response = await prisma.feedbackResponse.create({
    data: {
      formId: form.id,
      userId: session.sub,
      eventId: form.eventId,
      idempotencyKey: `feedback:${form.id}:${session.sub}`,
      answers: {
        create: form.questions
          .filter((q) => answers[q.id] !== undefined && answers[q.id] !== "")
          .map((q) => ({ questionId: q.id, value: String(answers[q.id]) })),
      },
    },
  });

  const ratingAnswers = form.questions
    .filter((q) => q.type === "RATING" && answers[q.id])
    .map((q) => Number(answers[q.id]));
  const avg = ratingAnswers.length > 0 ? ratingAnswers.reduce((a, b) => a + b, 0) / ratingAnswers.length : null;

  await logEvent(form.eventId, session.sub, "PARTICIPANT", LOG_ACTIONS.FEEDBACK_SUBMITTED, { score: avg });

  return Response.json({ submitted: true, responseId: response.id });
}
