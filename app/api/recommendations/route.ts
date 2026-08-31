import { NextRequest } from "next/server";
import { readSession, apiError } from "@/lib/session";
import { recommendEvents } from "@/lib/recommendations";

export const dynamic = "force-dynamic";

/** Rekomendasi event personal (deterministik) */
export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) return apiError("Silakan masuk terlebih dahulu.", "UNAUTHORIZED", 401);
  const limit = Math.min(12, Number(req.nextUrl.searchParams.get("limit") ?? 6));
  const recommendations = await recommendEvents(session.sub, limit);
  return Response.json({ recommendations });
}
