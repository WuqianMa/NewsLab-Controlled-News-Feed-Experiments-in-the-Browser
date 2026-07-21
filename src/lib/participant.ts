import type { NextRequest } from "next/server";
import { prisma } from "./db";
import { participantCookie } from "./constants";

export async function getParticipant(req: NextRequest, experimentId: string) {
  const pid = req.cookies.get(participantCookie(experimentId))?.value;
  if (!pid) return null;
  return prisma.participant.findFirst({
    where: { id: pid, experimentId },
    include: { condition: true },
  });
}

// The condition fields the participant client is allowed to see. Never leak
// experiment-flavored data beyond presentation flags.
export function conditionView(c: {
  id: string;
  label: string;
  feedLayout: string;
  feedOrder: string;
  showSourceLabels: boolean;
  showEngagementCounts: boolean;
  showActionBar: boolean;
  timeLimitSeconds: number | null;
  customCssClass: string | null;
}) {
  return {
    id: c.id,
    label: c.label,
    feed_layout: c.feedLayout,
    show_source_labels: c.showSourceLabels,
    show_engagement_counts: c.showEngagementCounts,
    show_action_bar: c.showActionBar,
    time_limit_seconds: c.timeLimitSeconds,
    custom_css_class: c.customCssClass,
  };
}
