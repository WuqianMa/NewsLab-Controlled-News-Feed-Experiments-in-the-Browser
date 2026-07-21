import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { conditionUpsertSchema } from "@/lib/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const experiment = await prisma.experiment.findUnique({ where: { id } });
  if (!experiment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* defaults */
  }
  const parsed = conditionUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (parsed.data.contentSetId) {
    const set = await prisma.contentSet.findFirst({
      where: { id: parsed.data.contentSetId, experimentId: id },
    });
    if (!set) {
      return NextResponse.json({ error: "set_not_in_experiment" }, { status: 400 });
    }
  }
  const count = await prisma.condition.count({ where: { experimentId: id } });
  const condition = await prisma.condition.create({
    data: {
      experimentId: id,
      label: parsed.data.label ?? `condition_${count + 1}`,
      ...parsed.data,
    },
  });
  return NextResponse.json({ id: condition.id }, { status: 201 });
}
