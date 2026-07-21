import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { conditionUpsertSchema } from "@/lib/schemas";

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
  const parsed = conditionUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", detail: parsed.error.issues },
      { status: 400 }
    );
  }
  const existing = await prisma.condition.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (parsed.data.contentSetId) {
    const set = await prisma.contentSet.findFirst({
      where: { id: parsed.data.contentSetId, experimentId: existing.experimentId },
    });
    if (!set) {
      return NextResponse.json({ error: "set_not_in_experiment" }, { status: 400 });
    }
  }
  await prisma.condition.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const participants = await prisma.participant.count({
    where: { conditionId: id },
  });
  if (participants > 0) {
    return NextResponse.json(
      { error: "has_participants", count: participants },
      { status: 409 }
    );
  }
  await prisma.condition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
