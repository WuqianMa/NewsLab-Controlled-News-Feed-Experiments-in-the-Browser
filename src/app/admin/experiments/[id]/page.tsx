import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ExperimentEditor } from "./ExperimentEditor";
import { getLaunchReadiness } from "@/lib/launchReadiness";

export const dynamic = "force-dynamic";

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const experiment = await prisma.experiment.findUnique({
    where: { id },
    include: {
      conditions: {
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { participants: { where: { isPreview: false } } } },
        },
      },
      contentSets: { select: { id: true, name: true } },
    },
  });
  if (!experiment) notFound();
  const readiness = await getLaunchReadiness(id);

  return (
    <ExperimentEditor
      experiment={JSON.parse(JSON.stringify(experiment))}
      readiness={readiness ?? []}
    />
  );
}
