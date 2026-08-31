import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import { computeAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** Analitik event (GET /api/organizer/events/{id}/analytics) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "ANALYTICS");
  if (!guard.ok) return guardError(guard);

  const analytics = await computeAnalytics(id);
  return Response.json({ analytics });
}
