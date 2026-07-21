import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getParticipant, conditionView } from "@/lib/participant";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const experiment = await prisma.experiment.findUnique({
    where: { slug },
    select: { id: true, surveyJson: true },
  });
  if (!experiment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const participant = await getParticipant(req, experiment.id);
  if (!participant) {
    return NextResponse.json({ error: "no_participant" }, { status: 401 });
  }

  const order = (participant.feedItemOrder as string[]) ?? [];
  const items = await prisma.contentItem.findMany({
    where: { id: { in: order } },
  });
  const byId = new Map(items.map((i) => [i.id, i]));

  // Serve EXACTLY the stored order (fable/07). Never include body, variant
  // type, or filler flags in the feed payload.
  const feed = order
    .map((id) => byId.get(id))
    .filter((i): i is NonNullable<typeof i> => !!i)
    .map((i) => ({
      id: i.id,
      title: i.title,
      snippet: i.snippet,
      source_name: i.sourceName,
      source_logo_url: i.sourceLogoUrl,
      thumbnail_url: i.thumbnailUrl,
      category: i.category,
      published_at: i.publishedAt.toISOString(),
      fake_likes: i.fakeLikes,
      fake_comments: i.fakeComments,
      fake_views: i.fakeViews,
      media:
        i.metadata && typeof i.metadata === "object"
          ? ((i.metadata as Record<string, unknown>).media ?? null)
          : null,
    }));

  return NextResponse.json({
    items: feed,
    condition: conditionView(participant.condition),
    has_survey:
      Array.isArray(experiment.surveyJson) &&
      (experiment.surveyJson as unknown[]).length > 0,
  });
}
