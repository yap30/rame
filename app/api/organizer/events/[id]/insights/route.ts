import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import { generateInsights } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** Insight berbasis aturan (GET /api/organizer/events/{id}/insights) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "ANALYTICS");
  if (!guard.ok) return guardError(guard);

  const insights = await generateInsights(id);
  return Response.json({ insights });
}
