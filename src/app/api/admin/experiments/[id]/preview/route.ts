import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signPreviewToken } from "@/lib/auth";

// Researcher preview (fable/06): a signed 1h token that forces the chosen
// condition and flags the participant is_preview.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conditionId = req.nextUrl.searchParams.get("condition");
  if (!conditionId) {
    return NextResponse.json({ error: "condition_required" }, { status: 400 });
  }
  const condition = await prisma.condition.findFirst({
    where: { id: conditionId, experimentId: id },
    include: { experiment: { select: { slug: true } } },
  });
  if (!condition) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const token = await signPreviewToken(id, conditionId);
  return NextResponse.json({
    url: `/exp/${condition.experiment.slug}/welcome?preview=${encodeURIComponent(token)}`,
  });
}
