import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { expireAbandonedSessions } from "@/lib/sessionLifecycle";

export async function GET(req: NextRequest) {
  await expireAbandonedSessions();
  const q = req.nextUrl.searchParams;
  const where: Prisma.ParticipantWhereInput = {};
  if (q.get("experiment")) where.experimentId = q.get("experiment")!;
  if (q.get("previews") !== "1") where.isPreview = false;

  const participants = await prisma.participant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: {
      condition: { select: { label: true } },
      experiment: { select: { name: true, slug: true } },
      sessions: { select: { id: true, startedAt: true, endedAt: true } },
      _count: { select: { surveyResponses: true } },
    },
  });
  const eventCounts = await prisma.event.groupBy({
    by: ["sessionId"],
    _count: { _all: true },
  });
  const bySession = new Map(eventCounts.map((e) => [e.sessionId, e._count._all]));

  return NextResponse.json({
    participants: participants.map((p) => ({
      id: p.id,
      experiment: p.experiment.name,
      condition: p.condition.label,
      status: p.status,
      is_pilot: p.isPilot,
      is_preview: p.isPreview,
      external_id: p.externalId,
      consent_version: p.consentVersion,
      created_at: p.createdAt,
      sessions: p.sessions.length,
      events: p.sessions.reduce((s, x) => s + (bySession.get(x.id) ?? 0), 0),
      survey_answers: p._count.surveyResponses,
    })),
  });
}
