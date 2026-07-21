import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { experimentUpsertSchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { getLaunchReadiness } from "@/lib/launchReadiness";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const experiment = await prisma.experiment.findUnique({
    where: { id },
    include: {
      conditions: { orderBy: { createdAt: "asc" } },
      contentSets: { select: { id: true, name: true } },
    },
  });
  if (!experiment) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ experiment });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = experimentUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", detail: parsed.error.issues },
      { status: 400 }
    );
  }
  const existing = await prisma.experiment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const taken = await prisma.experiment.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (taken) return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  if (parsed.data.status && ["pilot", "active"].includes(parsed.data.status)) {
    const issues = await getLaunchReadiness(id);
    if (issues && issues.length > 0) {
      return NextResponse.json(
        { error: "experiment_not_ready", issues },
        { status: 409 }
      );
    }
  }

  // Consent versioning (fable/04): editing live consent text bumps the version.
  const bumpConsent =
    parsed.data.welcomeContent !== undefined &&
    parsed.data.welcomeContent !== existing.welcomeContent &&
    existing.status !== "draft";

  const { surveyJson, ...rest } = parsed.data;
  const updated = await prisma.experiment.update({
    where: { id },
    data: {
      ...rest,
      ...(surveyJson !== undefined
        ? { surveyJson: (surveyJson ?? Prisma.DbNull) as Prisma.InputJsonValue }
        : {}),
      ...(bumpConsent ? { consentVersion: { increment: 1 } } : {}),
    },
  });
  return NextResponse.json({
    ok: true,
    consent_version: updated.consentVersion,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await prisma.experiment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["draft", "archived"].includes(existing.status)) {
    return NextResponse.json(
      { error: "only_draft_or_archived_deletable" },
      { status: 409 }
    );
  }
  await prisma.experiment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
