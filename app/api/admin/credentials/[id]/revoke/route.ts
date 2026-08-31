import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Revoke kredensial (lokal RAME dulu; sinkron provider e.id menyusul setelah issuer di-onboard). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role !== "ADMIN") return apiError("Khusus admin.", "FORBIDDEN", 403);

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  if (!body.reason?.trim()) return apiError("Alasan revoke wajib diisi.", "REASON_REQUIRED", 400);

  const issuance = await prisma.credentialIssuance.findUnique({ where: { id } });
  if (!issuance) return apiError("Kredensial tidak ditemukan.", "CREDENTIAL_NOT_FOUND", 404);
  if (issuance.status === "REVOKED") return apiError("Kredensial sudah di-revoke.", "ALREADY_REVOKED", 409);

  const updated = await prisma.credentialIssuance.update({
    where: { id },
    data: { status: "REVOKED", revokedAt: new Date(), revokeReason: body.reason.trim() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.sub,
      action: "CREDENTIAL_REVOKED",
      resourceType: "CREDENTIAL",
      resourceId: id,
      reason: body.reason.trim(),
      before: { status: issuance.status } as object,
      after: { status: "REVOKED", localOnly: true } as object,
    },
  });

  return Response.json({ credential: { id: updated.id, status: updated.status, localOnly: true } });
}
