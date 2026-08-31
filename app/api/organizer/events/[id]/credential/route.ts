import { NextRequest } from "next/server";
import { requireCapability, guardError } from "@/lib/org-guard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Upsert konfigurasi kredensial event (POST) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireCapability(id, "CREDENTIAL");
  if (!guard.ok) return guardError(guard);

  const body = (await req.json().catch(() => ({}))) as {
    enabled?: boolean;
    title?: string;
    description?: string;
    schemaId?: string;
    eligibilityPolicy?: string;
    policyValue?: Record<string, unknown>;
    issuerOrgName?: string;
  };

  const existing = await prisma.credentialConfig.findUnique({ where: { eventId: id } });
  const config = existing
    ? await prisma.credentialConfig.update({
        where: { id: existing.id },
        data: {
          enabled: Boolean(body.enabled ?? existing.enabled),
          title: body.title ?? existing.title,
          description: body.description ?? existing.description,
          schemaId: body.schemaId ?? existing.schemaId,
          eligibilityPolicy: body.eligibilityPolicy ?? existing.eligibilityPolicy,
          policyValue: (body.policyValue ?? existing.policyValue) as object,
          issuerOrgName: body.issuerOrgName ?? existing.issuerOrgName,
        },
      })
    : await prisma.credentialConfig.create({
        data: {
          eventId: id,
          enabled: Boolean(body.enabled ?? true),
          title: body.title ?? "Kredensial Event",
          description: body.description ?? null,
          schemaId: body.schemaId ?? `rame-${id.slice(0, 8)}`,
          eligibilityPolicy: body.eligibilityPolicy ?? "EVENT_COMPLETION",
          policyValue: (body.policyValue ?? {}) as object,
          issuerOrgName: body.issuerOrgName ?? null,
        },
      });

  return Response.json({ credentialConfig: config });
}
