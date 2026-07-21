import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getParticipant } from "@/lib/participant";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const experiment = await prisma.experiment.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!experiment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const participant = await getParticipant(req, experiment.id);
  if (!participant) {
    return NextResponse.json({ error: "no_participant" }, { status: 401 });
  }

  const order = (participant.feedItemOrder as string[]) ?? [];
  const idx = order.indexOf(id);
  // Prevent URL-guessing across conditions: only items actually served to
  // THIS participant are readable.
  if (idx === -1) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const relatedIds = order.slice(idx + 1, idx + 4);
  const [item, related] = await Promise.all([
    prisma.contentItem.findUnique({ where: { id } }),
    prisma.contentItem.findMany({ where: { id: { in: relatedIds } } }),
  ]);
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const relById = new Map(related.map((r) => [r.id, r]));

  return NextResponse.json({
    id: item.id,
    title: item.title,
    body: item.body,
    source_name: item.sourceName,
    source_logo_url: item.sourceLogoUrl,
    thumbnail_url: item.thumbnailUrl,
    category: item.category,
    published_at: item.publishedAt.toISOString(),
    fake_likes: item.fakeLikes,
    fake_comments: item.fakeComments,
    fake_views: item.fakeViews,
    position_in_feed: idx,
    related: relatedIds
      .map((rid) => relById.get(rid))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((r) => ({
        id: r.id,
        title: r.title,
        source_name: r.sourceName,
        thumbnail_url: r.thumbnailUrl,
        published_at: r.publishedAt.toISOString(),
      })),
  });
}
