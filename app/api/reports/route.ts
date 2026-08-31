import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Buat laporan — participant (user/event/organizer/activity/content) & admin (INTERNAL case).
 * POST /api/reports  { targetType, targetId, category, description }
 */
export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);

  const body = (await req.json().catch(() => ({}))) as { targetType?: string; targetId?: string; category?: string; description?: string };
  const TYPES = ["EVENT", "USER", "ORGANIZER", "ACTIVITY", "CONTENT", "INTERNAL"];
  const targetType = body.targetType && TYPES.includes(body.targetType) ? body.targetType : null;
  if (!targetType) return apiError("Tipe target tidak valid.", "INVALID_TARGET", 400);
  if (!body.targetId?.trim()) return apiError("Target wajib diisi.", "TARGET_REQUIRED", 400);
  if (!body.category?.trim()) return apiError("Kategori wajib diisi.", "CATEGORY_REQUIRED", 400);

  const report = await prisma.report.create({
    data: {
      reporterId: session.sub,
      targetType,
      targetId: body.targetId.trim(),
      category: body.category.trim(),
      description: body.description?.trim() || null,
    },
  });

  return Response.json({ report: { id: report.id, status: report.status } }, { status: 201 });
}
