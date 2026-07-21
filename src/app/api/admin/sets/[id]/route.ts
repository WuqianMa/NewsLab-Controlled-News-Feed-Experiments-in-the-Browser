import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

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
  const parsed = z
    .object({ name: z.string().trim().min(1).max(100) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  await prisma.contentSet.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conditions = await prisma.condition.count({
    where: { contentSetId: id },
  });
  if (conditions > 0) {
    return NextResponse.json(
      { error: "linked_to_conditions", count: conditions },
      { status: 409 }
    );
  }
  await prisma.contentSet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
