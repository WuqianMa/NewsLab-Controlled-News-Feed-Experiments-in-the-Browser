import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const src = await prisma.experiment.findUnique({
    where: { id },
    include: {
      conditions: { orderBy: { createdAt: "asc" } },
      contentSets: { include: { items: true } },
    },
  });
  if (!src) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const suffix = Math.random().toString(36).slice(2, 6);
  const copy = await prisma.$transaction(async (tx) => {
    const experiment = await tx.experiment.create({
      data: {
        researcherId: src.researcherId,
        name: `${src.name} (copy)`,
        slug: `${src.slug}-copy-${suffix}`,
        description: src.description,
        status: "draft",
        assignmentMethod: src.assignmentMethod,
        targetSampleSize: src.targetSampleSize,
        welcomeContent: src.welcomeContent,
        completionContent: src.completionContent,
        completionRedirectUrl: src.completionRedirectUrl,
        completionCode: src.completionCode,
        surveyJson: (src.surveyJson ?? undefined) as Prisma.InputJsonValue,
        resumeWindowHours: src.resumeWindowHours,
      },
    });
    // Content sets copied (sharing the same content ITEMS); conditions re-linked.
    const setIdMap = new Map<string, string>();
    for (const set of src.contentSets) {
      const newSet = await tx.contentSet.create({
        data: { name: set.name, experimentId: experiment.id },
      });
      setIdMap.set(set.id, newSet.id);
      if (set.items.length > 0) {
        await tx.contentSetItem.createMany({
          data: set.items.map((si) => ({
            contentSetId: newSet.id,
            contentItemId: si.contentItemId,
            position: si.position,
          })),
        });
      }
    }
    for (const c of src.conditions) {
      await tx.condition.create({
        data: {
          experimentId: experiment.id,
          label: c.label,
          description: c.description,
          contentSetId: c.contentSetId ? (setIdMap.get(c.contentSetId) ?? null) : null,
          feedLayout: c.feedLayout,
          feedOrder: c.feedOrder,
          maxItems: c.maxItems,
          timeLimitSeconds: c.timeLimitSeconds,
          showSourceLabels: c.showSourceLabels,
          showEngagementCounts: c.showEngagementCounts,
          showActionBar: c.showActionBar,
          customCssClass: c.customCssClass,
          weight: c.weight,
        },
      });
    }
    return experiment;
  });

  return NextResponse.json({ id: copy.id }, { status: 201 });
}
