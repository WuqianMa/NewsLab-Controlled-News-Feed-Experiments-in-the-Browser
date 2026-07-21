import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setItemsSchema } from "@/lib/schemas";

// Replace the FULL ordered item list — one endpoint, trivially correct
// ordering (fable/06 §4). Positions = array index.
export async function PUT(
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
  const parsed = setItemsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const set = await prisma.contentSet.findUnique({ where: { id } });
  if (!set) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ids = parsed.data.item_ids;
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    return NextResponse.json({ error: "duplicate_items" }, { status: 400 });
  }
  const items = await prisma.contentItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, approved: true },
  });
  if (items.length !== ids.length) {
    return NextResponse.json({ error: "unknown_item" }, { status: 400 });
  }
  const unapproved = items.filter((i) => !i.approved);
  if (unapproved.length > 0) {
    return NextResponse.json(
      { error: "unapproved_items", ids: unapproved.map((i) => i.id) },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.contentSetItem.deleteMany({ where: { contentSetId: id } }),
    prisma.contentSetItem.createMany({
      data: ids.map((itemId, i) => ({
        contentSetId: id,
        contentItemId: itemId,
        position: i,
      })),
    }),
  ]);
  return NextResponse.json({ ok: true, count: ids.length });
}
