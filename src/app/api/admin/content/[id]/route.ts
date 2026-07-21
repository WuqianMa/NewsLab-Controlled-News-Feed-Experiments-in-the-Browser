import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdmin } from "@/lib/auth";
import { contentItemUpsertSchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.contentItem.findUnique({
    where: { id },
    include: {
      sourceItem: true,
      generationLog: true,
    },
  });
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ item });
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
  const parsed = contentItemUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", detail: parsed.error.issues },
      { status: 400 }
    );
  }
  const existing = await prisma.contentItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { publishedAt, metadata, approved, ...rest } = parsed.data;
  // Approving an item stamps who/when (review-queue action).
  const approving = approved === true && !existing.approved;
  const adminId = approving ? await getAdmin(req) : null;

  await prisma.contentItem.update({
    where: { id },
    data: {
      ...rest,
      ...(publishedAt ? { publishedAt: new Date(publishedAt) } : {}),
      ...(metadata !== undefined
        ? { metadata: (metadata ?? Prisma.DbNull) as Prisma.InputJsonValue }
        : {}),
      ...(approved !== undefined ? { approved } : {}),
      ...(approving ? { approvedAt: new Date(), approvedById: adminId } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.contentItem.findUnique({
    where: { id },
    include: { _count: { select: { setItems: true, variants: true } } },
  });
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (item._count.setItems > 0) {
    return NextResponse.json(
      { error: "in_sets", detail: "Remove it from content sets first." },
      { status: 409 }
    );
  }
  if (item._count.variants > 0) {
    return NextResponse.json(
      { error: "has_variants", detail: "Delete its variants first." },
      { status: 409 }
    );
  }
  await prisma.contentItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
