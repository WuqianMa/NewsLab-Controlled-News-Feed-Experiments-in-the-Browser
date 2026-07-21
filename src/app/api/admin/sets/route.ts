import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const sets = await prisma.contentSet.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      experiment: { select: { id: true, name: true, slug: true } },
      conditions: { select: { id: true, label: true } },
      items: {
        orderBy: { position: "asc" },
        include: {
          contentItem: {
            select: {
              id: true,
              title: true,
              sourceName: true,
              variantType: true,
              isFiller: true,
              approved: true,
            },
          },
        },
      },
    },
  });
  return NextResponse.json({ sets });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  experiment_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const experiment = await prisma.experiment.findUnique({
    where: { id: parsed.data.experiment_id },
  });
  if (!experiment) {
    return NextResponse.json({ error: "experiment_not_found" }, { status: 404 });
  }
  const set = await prisma.contentSet.create({
    data: { name: parsed.data.name, experimentId: parsed.data.experiment_id },
  });
  return NextResponse.json({ id: set.id }, { status: 201 });
}
