import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { experimentUpsertSchema } from "@/lib/schemas";

export async function GET() {
  const experiments = await prisma.experiment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { conditions: true } },
      participants: { where: { isPreview: false }, select: { id: true } },
    },
  });
  return NextResponse.json({
    experiments: experiments.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      status: e.status,
      conditions: e._count.conditions,
      participants: e.participants.length,
      target: e.targetSampleSize,
      created_at: e.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const adminId = await getAdmin(req);
  if (!adminId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = experimentUpsertSchema.safeParse(body);
  if (!parsed.success || !parsed.data.name || !parsed.data.slug) {
    return NextResponse.json(
      { error: "invalid_body", detail: parsed.success ? "name and slug required" : parsed.error.issues },
      { status: 400 }
    );
  }
  const exists = await prisma.experiment.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (exists) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }
  const experiment = await prisma.experiment.create({
    data: {
      researcherId: adminId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description ?? "",
      welcomeContent:
        parsed.data.welcomeContent ??
        "## Welcome\n\nPlease read the study information and confirm below to continue.",
      completionContent:
        parsed.data.completionContent ?? "## Thank you!\n\nYour responses have been recorded.",
      surveyJson: parsed.data.surveyJson ?? undefined,
    },
  });
  return NextResponse.json({ id: experiment.id }, { status: 201 });
}
