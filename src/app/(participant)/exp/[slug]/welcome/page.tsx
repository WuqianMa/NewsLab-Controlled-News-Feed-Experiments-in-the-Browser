import { prisma } from "@/lib/db";
import { Markdown } from "@/lib/markdown";
import { RECRUITING_STATUSES } from "@/lib/constants";
import { ConsentForm } from "./ConsentForm";

export default async function WelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const externalId =
    typeof sp.PROLIFIC_PID === "string"
      ? sp.PROLIFIC_PID
      : typeof sp.external_id === "string"
        ? sp.external_id
        : undefined;
  const previewToken = typeof sp.preview === "string" ? sp.preview : undefined;

  const experiment = await prisma.experiment.findUnique({
    where: { slug },
    select: { welcomeContent: true, consentVersion: true, status: true },
  });

  const inactive =
    !experiment ||
    (!RECRUITING_STATUSES.includes(experiment.status as never) &&
      !previewToken);

  if (inactive) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold">This link is not active</h1>
          <p className="mt-2 text-sm text-gray-600">
            This study is not currently accepting participants. If you believe
            this is an error, please contact the person who sent you the link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-4 py-8">
      <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
        <Markdown text={experiment.welcomeContent} className="text-[15px]" />
        <ConsentForm
          slug={slug}
          consentVersion={experiment.consentVersion}
          externalId={externalId}
          previewToken={previewToken}
        />
      </div>
    </main>
  );
}
