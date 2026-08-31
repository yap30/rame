import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/** Statistik platform (angka nyata dari DB — bukan hard-coded) */
export async function GET() {
  const [events, participants, stamps, xpAgg] = await Promise.all([
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.eventParticipant.count({ where: { status: { in: ["JOINED", "COMPLETED"] } } }),
    prisma.participantStamp.count(),
    prisma.xpTransaction.aggregate({ _sum: { amount: true } }),
  ]);

  return Response.json({
    stats: {
      events,
      participants,
      stamps,
      xp: xpAgg._sum.amount ?? 0,
    },
  });
}
