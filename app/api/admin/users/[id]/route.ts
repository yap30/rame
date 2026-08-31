import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Ubah role pengguna (admin) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  if (session.role !== "ADMIN") return apiError("Khusus admin.", "FORBIDDEN", 403);

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { role?: string };
  const role = String(body.role ?? "").toUpperCase();
  if (!["PARTICIPANT", "ORGANIZER", "ADMIN"].includes(role)) {
    return apiError("Role tidak valid.", "INVALID_ROLE", 422);
  }

  const user = await prisma.user.update({ where: { id }, data: { role } });
  return Response.json({ user: { id: user.id, name: user.name, role: user.role } });
}
