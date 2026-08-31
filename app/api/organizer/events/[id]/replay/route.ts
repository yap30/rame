import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import { replayEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** Event replay (GET /api/organizer/events/{id}/replay) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "EVENT_REPLAY");
  if (!guard.ok) return guardError(guard);

  const limit = Math.min(500, Number(req.nextUrl.searchParams.get("limit") ?? 200));
  const offset = Number(req.nextUrl.searchParams.get("offset") ?? 0);
  const replay = await replayEvent(id, limit, offset);
  return Response.json({ replay });
}
