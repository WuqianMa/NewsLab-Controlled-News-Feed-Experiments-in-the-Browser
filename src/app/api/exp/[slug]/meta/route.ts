import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RECRUITING_STATUSES } from "@/lib/constants";

// Public, pre-consent metadata for the welcome page. Never returns condition
// info or anything experiment-flavored beyond the researcher's welcome text.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const experiment = await prisma.experiment.findUnique({
    where: { slug },
    select: {
      welcomeContent: true,
      consentVersion: true,
      status: true,
      surveyJson: true,
    },
  });
  if (!experiment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    welcome_content: experiment.welcomeContent,
    consent_version: experiment.consentVersion,
    recruiting: RECRUITING_STATUSES.includes(experiment.status as never),
    has_survey:
      Array.isArray(experiment.surveyJson) &&
      (experiment.surveyJson as unknown[]).length > 0,
  });
}
