import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { contentItemUpsertSchema } from "@/lib/schemas";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const where: Prisma.ContentItemWhereInput = {};
  if (q.get("type") === "original") where.sourceItemId = null;
  if (q.get("type") === "variant") where.sourceItemId = { not: null };
  if (q.get("approved") === "false") where.approved = false;
  if (q.get("approved") === "true") where.approved = true;
  if (q.get("category")) where.category = q.get("category")!;
  if (q.get("q")) where.title = { contains: q.get("q")! };

  const items = await prisma.contentItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      setItems: { include: { contentSet: { select: { name: true } } } },
      sourceItem: { select: { title: true } },
      _count: { select: { variants: true } },
    },
    take: 500,
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = contentItemUpsertSchema.safeParse(body);
  if (
    !parsed.success ||
    !parsed.data.title ||
    !parsed.data.body ||
    !parsed.data.sourceName
  ) {
    return NextResponse.json(
      { error: "invalid_body", detail: "title, body, sourceName required" },
      { status: 400 }
    );
  }
  const { publishedAt, metadata, ...rest } = parsed.data;
  const item = await prisma.contentItem.create({
    data: {
      ...rest,
      title: parsed.data.title,
      body: parsed.data.body,
      sourceName: parsed.data.sourceName,
      publishedAt: publishedAt ? new Date(publishedAt) : undefined,
      metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      approved: true, // human-written originals are auto-approved
    },
  });
  return NextResponse.json({ id: item.id }, { status: 201 });
}
