import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      condition: { select: { label: true } },
      sessions: {
        orderBy: { startedAt: "asc" },
        include: { _count: { select: { events: true } } },
      },
      surveyResponses: true,
    },
  });
  if (!participant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const histogram = await prisma.event.groupBy({
    by: ["eventType"],
    where: { session: { participantId: id } },
    _count: { _all: true },
  });
  return NextResponse.json({
    participant: JSON.parse(
      JSON.stringify(participant, (_k, v) =>
        typeof v === "bigint" ? Number(v) : v
      )
    ),
    event_histogram: histogram.map((h) => ({
      event_type: h.eventType,
      count: h._count._all,
    })),
  });
}

// RGPD right-to-deletion (description/07): removes the participant and, via
// cascades, all sessions, events, and survey responses.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participant = await prisma.participant.findUnique({ where: { id } });
  if (!participant) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const [events, sessions, surveys] = await Promise.all([
    prisma.event.count({ where: { session: { participantId: id } } }),
    prisma.session.count({ where: { participantId: id } }),
    prisma.surveyResponse.count({ where: { participantId: id } }),
  ]);
  await prisma.participant.delete({ where: { id } });
  console.log(
    `[RGPD] deleted participant ${id}: ${sessions} sessions, ${events} events, ${surveys} survey responses`
  );
  return NextResponse.json({
    ok: true,
    removed: { participants: 1, sessions, events, survey_responses: surveys },
  });
}
