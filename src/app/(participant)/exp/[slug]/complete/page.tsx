import { prisma } from "@/lib/db";
import { Markdown } from "@/lib/markdown";
import { CompleteClient } from "./CompleteClient";

export default async function CompletePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const experiment = await prisma.experiment.findUnique({
    where: { slug },
    select: {
      completionContent: true,
      completionRedirectUrl: true,
      completionCode: true,
    },
  });
  if (!experiment) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-gray-500">Not found.</p>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-xl p-4 py-8">
      <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <Markdown text={experiment.completionContent} className="text-[15px]" />
        <CompleteClient
          slug={slug}
          redirectUrl={experiment.completionRedirectUrl}
          completionCode={experiment.completionCode}
        />
      </div>
    </main>
  );
}
