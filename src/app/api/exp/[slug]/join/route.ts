import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { joinSchema } from "@/lib/schemas";
import { assignCondition, materializeFeedOrder } from "@/lib/assignment";
import { verifyPreviewToken } from "@/lib/auth";
import { participantCookie, RECRUITING_STATUSES } from "@/lib/constants";
import { conditionView } from "@/lib/participant";
import { expireAbandonedSessions } from "@/lib/sessionLifecycle";
import { sessionDeadlineMs } from "@/lib/sessionTiming";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { external_id, preview_token, screen } = parsed.data;

  const experiment = await prisma.experiment.findUnique({
    where: { slug },
    include: {
      conditions: {
        include: {
          contentSet: {
            include: {
              items: {
                orderBy: { position: "asc" },
                include: { contentItem: true },
              },
            },
          },
        },
      },
    },
  });
  if (!experiment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await expireAbandonedSessions(experiment.id);

  // Preview tokens allow researchers into non-recruiting experiments and
  // force a condition (fable/06).
  const preview = preview_token
    ? await verifyPreviewToken(preview_token)
    : null;
  const validPreview = preview?.experimentId === experiment.id ? preview : null;

  if (
    !validPreview &&
    !RECRUITING_STATUSES.includes(experiment.status as never)
  ) {
    return NextResponse.json({ error: "not_recruiting" }, { status: 403 });
  }

  // 1. Returning participant via cookie — never reassigned.
  const cookieName = participantCookie(experiment.id);
  const cookiePid = req.cookies.get(cookieName)?.value;
  let participant = !validPreview && cookiePid
    ? await prisma.participant.findFirst({
        where: { id: cookiePid, experimentId: experiment.id },
        include: { condition: true },
      })
    : null;

  // 2. Returning recruited participant via external id (Prolific etc.).
  if (!validPreview && !participant && external_id) {
    participant = await prisma.participant.findFirst({
      where: { experimentId: experiment.id, externalId: external_id },
      include: { condition: true },
    });
  }

  let resumed = !!participant;

  if (participant?.status === "completed" && !validPreview) {
    return NextResponse.json({ error: "already_completed" }, { status: 409 });
  }

  if (
    !participant &&
    !validPreview &&
    experiment.targetSampleSize !== null &&
    (await prisma.participant.count({
      where: { experimentId: experiment.id, isPreview: false },
    })) >= experiment.targetSampleSize
  ) {
    return NextResponse.json({ error: "target_reached" }, { status: 403 });
  }

  if (experiment.conditions.length === 0) {
    return NextResponse.json({ error: "experiment_not_ready" }, { status: 409 });
  }

  // 3. New participant: assign + materialize feed order in one transaction.
  if (!participant) {
    participant = await prisma.$transaction(async (tx) => {
      const counts = await tx.participant.groupBy({
        by: ["conditionId"],
        where: { experimentId: experiment.id, isPreview: false },
        _count: { _all: true },
      });
      const countMap = new Map(
        counts.map((c) => [c.conditionId, c._count._all])
      );
      const total = counts.reduce((s, c) => s + c._count._all, 0);

      const condition = validPreview
        ? experiment.conditions.find((c) => c.id === validPreview.conditionId)
        : assignCondition(
            experiment.assignmentMethod,
            experiment.conditions,
            countMap,
            total
          );
      if (!condition) throw new Error("condition_not_found");

      const setItems =
        condition.contentSet?.items.map((si) => si.contentItem) ?? [];
      const feedItemOrder = materializeFeedOrder(
        condition.feedOrder,
        condition.maxItems,
        setItems
      );

      return tx.participant.create({
        data: {
          experimentId: experiment.id,
          conditionId: condition.id,
          externalId: external_id ?? null,
          consentVersion: experiment.consentVersion,
          feedItemOrder,
          isPilot: experiment.status === "pilot",
          isPreview: !!validPreview,
        },
        include: { condition: true },
      });
    });
    resumed = false;
  }

  // Session: reuse an open one inside the resume window, else create.
  const latest = await prisma.session.findFirst({
    where: { participantId: participant.id },
    orderBy: { startedAt: "desc" },
  });
  let session = latest;
  let sessionResumed = false;
  if (
    latest &&
    latest.endedAt === null &&
    latest.status === "active"
  ) {
    sessionResumed = true;
  } else {
    session = await prisma.session.create({
      data: {
        participantId: participant.id,
        userAgent: req.headers.get("user-agent") ?? "",
        screenWidth: screen?.w ?? null,
        screenHeight: screen?.h ?? null,
      },
    });
    if (participant.status === "abandoned") {
      await prisma.participant.update({
        where: { id: participant.id },
        data: { status: "active" },
      });
    }
  }

  const res = NextResponse.json({
    participant_id: participant.id,
    session_id: session!.id,
    condition: conditionView(participant.condition),
    resumed: resumed && sessionResumed,
    last_checkpoint: sessionResumed ? (session!.lastCheckpoint ?? null) : null,
    has_survey:
      Array.isArray(experiment.surveyJson) &&
      (experiment.surveyJson as unknown[]).length > 0,
    consent_version: experiment.consentVersion,
    session_started_at: session!.startedAt.toISOString(),
    deadline_at: sessionDeadlineMs(
      session!.startedAt,
      participant.condition.timeLimitSeconds
    ),
  });
  res.cookies.set(cookieName, participant.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 3600,
  });
  return res;
}
