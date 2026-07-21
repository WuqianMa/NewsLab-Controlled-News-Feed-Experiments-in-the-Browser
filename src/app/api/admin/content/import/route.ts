import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { contentImportSchema } from "@/lib/schemas";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  // Validate the envelope loosely, each item strictly — so one bad row
  // produces an indexed error instead of rejecting the whole batch.
  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as Record<string, unknown>).items)
  ) {
    return NextResponse.json({ error: "items_array_required" }, { status: 400 });
  }
  const rows = (body as { items: unknown[] }).items.slice(0, 200);
  const itemSchema = contentImportSchema.shape.items.element;

  let created = 0;
  const errors: { index: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const parsed = itemSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push({
        index: i,
        message: parsed.error.issues
          .map((iss) => `${iss.path.join(".")}: ${iss.message}`)
          .join("; "),
      });
      continue;
    }
    const { publishedAt, metadata, ...rest } = parsed.data;
    await prisma.contentItem.create({
      data: {
        ...rest,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        approved: true,
      },
    });
    created++;
  }
  return NextResponse.json({ created, errors });
}
