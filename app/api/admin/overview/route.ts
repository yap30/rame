import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";
import { eidStatus } from "@/lib/eid";

export const dynamic = "force-dynamic";

/** Ringkasan platform untuk admin */
export async function GET() {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role !== "ADMIN") return apiError("Khusus admin.", "FORBIDDEN", 403);

  const [users, organizations, events, participants, loginSessions, completions] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.event.count(),
    prisma.eventParticipant.count(),
    prisma.authLoginSession.count(),
    prisma.activityCompletion.count(),
  ]);

  return Response.json({
    overview: { users, organizations, events, participants, loginSessions, completions },
    eid: eidStatus(),
  });
}
