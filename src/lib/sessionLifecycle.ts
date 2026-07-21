import { prisma } from "./db";
import { isSessionExpired } from "./sessionTiming";

export async function expireAbandonedSessions(experimentId?: string) {
  const sessions = await prisma.session.findMany({
    where: {
      status: "active",
      endedAt: null,
      ...(experimentId ? { participant: { experimentId } } : {}),
    },
    include: {
      participant: { include: { experiment: true } },
      events: {
        orderBy: { serverReceivedAt: "desc" },
        take: 1,
        select: { serverReceivedAt: true },
      },
    },
  });

  const expired = sessions.filter((session) =>
    isSessionExpired(
      session.startedAt,
      session.events[0]?.serverReceivedAt ?? null,
      session.participant.experiment.resumeWindowHours
    )
  );

  for (const session of expired) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.session.updateMany({
        where: { id: session.id, status: "active", endedAt: null },
        data: { status: "abandoned", endedAt: new Date() },
      });
      if (updated.count === 0) return;

      const otherOpenSessions = await tx.session.count({
        where: {
          participantId: session.participantId,
          status: "active",
          endedAt: null,
        },
      });
      if (
        otherOpenSessions === 0 &&
        session.participant.status !== "completed"
      ) {
        await tx.participant.update({
          where: { id: session.participantId },
          data: { status: "abandoned" },
        });
      }
    });
  }

  return expired.length;
}
