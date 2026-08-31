import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import prisma from "@/lib/db";
import { eidStatus } from "@/lib/eid";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ user: null, eid: eidStatus() });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      externalIdentities: { where: { provider: "e.id" }, take: 1 },
      memberships: { include: { organization: true } },
    },
  });
  if (!user) return NextResponse.json({ user: null, eid: eidStatus() });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgId: session.orgId ?? null,
      // status koneksi e.id saja — DID/trust level tetap internal (dipakai
      // integration credential issuance, bukan untuk UI participant).
      eidConnected: Boolean(user.externalIdentities[0]),
    },
    eid: eidStatus(),
  });
}
