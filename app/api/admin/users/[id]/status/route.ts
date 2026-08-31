import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Suspend / unsuspend user oleh admin. SUSPENDED = blokir login & akses total. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role !== "ADMIN") return apiError("Khusus admin.", "FORBIDDEN", 403);
  if (session.sub === id) return apiError("Tidak bisa mengubah status akun sendiri.", "SELF_ACTION", 409);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return apiError("User tidak ditemukan.", "USER_NOT_FOUND", 404);

  const body = (await req.json().catch(() => ({}))) as { status?: string; reason?: string };
  const next = body.status === "ACTIVE" ? "ACTIVE" : body.status === "SUSPENDED" ? "SUSPENDED" : null;
  if (!next) return apiError("Status tidak valid (ACTIVE/SUSPENDED).", "INVALID_STATUS", 400);
  if (next === "SUSPENDED" && !body.reason?.trim()) {
    return apiError("Alasan suspend wajib diisi.", "REASON_REQUIRED", 400);
  }

  const suspending = next === "SUSPENDED";
  const updated = await prisma.user.update({
    where: { id },
    data: suspending
      ? { status: "SUSPENDED", suspendReason: body.reason?.trim(), suspendedAt: new Date() }
      : { status: "ACTIVE", suspendReason: null, suspendedAt: null },
  });

  // audit log (admin action — terpisah dari EventLog yg bersifat event-scoped)
  await prisma.auditLog.create({
    data: {
      actorId: session.sub,
      action: suspending ? "USER_SUSPENDED" : "USER_UNSUSPENDED",
      resourceType: "USER",
      resourceId: id,
      reason: body.reason?.trim() ?? null,
      before: { status: user.status } as object,
      after: { status: updated.status } as object,
    },
  });

  // notifikasi in-app ke user (bukan data investigasi — hanya status + alasan)
  await prisma.notification.create({
    data: {
      userId: id,
      type: suspending ? "SUSPENDED" : "UNSUSPENDED",
      title: suspending ? "Akun disuspend" : "Akun dipulihkan",
      body: suspending
        ? `Akun Anda sedang disuspend${body.reason?.trim() ? `: ${body.reason.trim()}` : ""}. Hubungi dukungan jika ada pertanyaan.`
        : "Akun Anda telah dipulihkan dan dapat digunakan kembali.",
    },
  });

  return Response.json({ user: { id: updated.id, status: updated.status } });
}
