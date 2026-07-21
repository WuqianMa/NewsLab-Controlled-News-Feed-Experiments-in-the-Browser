import { prisma } from "./db";
import { surveyDefinitionSchema } from "./schemas";

export interface LaunchIssue {
  code: string;
  message: string;
  conditionId?: string;
}

export interface LaunchCandidate {
  welcomeContent: string;
  completionContent: string;
  completionRedirectUrl: string | null;
  completionCode: string | null;
  surveyJson: unknown;
  conditions: {
    id: string;
    label: string;
    weight: number;
    contentSet: {
      items: { contentItem: { approved: boolean } }[];
    } | null;
  }[];
}

export function collectLaunchIssues(candidate: LaunchCandidate): LaunchIssue[] {
  const issues: LaunchIssue[] = [];
  if (!candidate.welcomeContent.trim()) {
    issues.push({ code: "missing_welcome", message: "Welcome and consent text is required." });
  }
  if (!candidate.completionContent.trim()) {
    issues.push({ code: "missing_completion", message: "Completion and debrief text is required." });
  }
  if (!candidate.completionRedirectUrl && !candidate.completionCode?.trim()) {
    issues.push({
      code: "missing_completion_route",
      message: "Set a completion redirect URL or completion code.",
    });
  }
  if (candidate.conditions.length === 0) {
    issues.push({ code: "missing_conditions", message: "Add at least one condition." });
  }

  for (const condition of candidate.conditions) {
    if (condition.weight <= 0) {
      issues.push({
        code: "invalid_weight",
        message: `${condition.label}: assignment weight must be positive.`,
        conditionId: condition.id,
      });
    }
    if (!condition.contentSet) {
      issues.push({
        code: "missing_content_set",
        message: `${condition.label}: select a content set.`,
        conditionId: condition.id,
      });
      continue;
    }
    if (!condition.contentSet.items.some((item) => item.contentItem.approved)) {
      issues.push({
        code: "empty_content_set",
        message: `${condition.label}: content set has no approved items.`,
        conditionId: condition.id,
      });
    }
  }

  if (
    candidate.surveyJson !== null &&
    candidate.surveyJson !== undefined &&
    !surveyDefinitionSchema.safeParse(candidate.surveyJson).success
  ) {
    issues.push({ code: "invalid_survey", message: "Fix the post-feed survey definition." });
  }
  return issues;
}

export async function getLaunchReadiness(experimentId: string) {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      conditions: {
        include: {
          contentSet: {
            include: {
              items: { include: { contentItem: { select: { approved: true } } } },
            },
          },
        },
      },
    },
  });
  if (!experiment) return null;
  return collectLaunchIssues(experiment);
}
