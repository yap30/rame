import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Daftar penerbitan kredensial (admin) */
export async function GET() {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role !== "ADMIN") return apiError("Khusus admin.", "FORBIDDEN", 403);

  const issuances = await prisma.credentialIssuance.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      config: { select: { title: true, eventId: true, event: { select: { name: true, id: true } } } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return Response.json({
    credentials: issuances.map((c) => ({
      id: c.id,
      eventId: c.eventId,
      eventName: c.config.event?.name ?? null,
      title: c.config.title,
      participant: c.user.name,
      participantEmail: c.user.email,
      status: c.status,
      providerReference: c.providerReference ?? null,
      // revoke lokal RAME — belum sinkron ke provider e.id
      localOnly: c.status === "REVOKED" && !c.providerReference,
      revokedAt: c.revokedAt,
      revokeReason: c.revokeReason,
      createdAt: c.createdAt,
    })),
  });
}
