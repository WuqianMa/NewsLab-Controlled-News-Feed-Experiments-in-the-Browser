import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { surveySubmitSchema, surveyDefinitionSchema } from "@/lib/schemas";
import { getParticipant } from "@/lib/participant";
import { validateSurveyAnswers } from "@/lib/survey";

// GET returns the survey questions for this experiment (cookie-gated).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const experiment = await prisma.experiment.findUnique({
    where: { slug },
    select: { id: true, surveyJson: true },
  });
  if (!experiment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const participant = await getParticipant(req, experiment.id);
  if (!participant) {
    return NextResponse.json({ error: "no_participant" }, { status: 401 });
  }
  return NextResponse.json({ questions: experiment.surveyJson ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const experiment = await prisma.experiment.findUnique({
    where: { slug },
    select: { id: true, surveyJson: true },
  });
  if (!experiment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const participant = await getParticipant(req, experiment.id);
  if (!participant) {
    return NextResponse.json({ error: "no_participant" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = surveySubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const questions = surveyDefinitionSchema.safeParse(experiment.surveyJson);
  if (!questions.success) {
    return NextResponse.json({ error: "no_survey" }, { status: 400 });
  }
  const byId = new Map(questions.data.map((q) => [q.id, q]));
  const answerIssue = validateSurveyAnswers(questions.data, parsed.data.answers);
  if (answerIssue) {
    return NextResponse.json(
      { error: answerIssue.code, question_id: answerIssue.question_id },
      { status: 400 }
    );
  }

  // Upsert per answer: resubmission overwrites, never duplicates.
  if (parsed.data.answers.length > 0) {
    await prisma.$transaction(
      parsed.data.answers.map((a) =>
        prisma.surveyResponse.upsert({
        where: {
          participantId_questionId: {
            participantId: participant.id,
            questionId: a.question_id,
          },
        },
        create: {
          participantId: participant.id,
          questionId: a.question_id,
          questionPrompt: byId.get(a.question_id)!.prompt,
          answer: a.answer,
        },
        update: { answer: a.answer },
        })
      )
    );
  }

  return NextResponse.json({ ok: true });
}
