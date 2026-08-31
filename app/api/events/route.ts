import { NextRequest } from "next/server";
import { listEventCards } from "@/lib/event";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const events = await listEventCards();
  return Response.json({ events });
}
