"use client";

import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { endParticipantSession, readParticipantState } from "@/lib/participantState";

export function ParticipantSessionGuard() {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      pathname.endsWith("/welcome") ||
      pathname.endsWith("/survey") ||
      pathname.endsWith("/complete")
    ) {
      return;
    }
    const state = readParticipantState(slug);
    if (!state?.deadline_at || state.ended) return;

    const finish = async () => {
      await endParticipantSession(slug, {
        total_duration_ms:
          Date.now() - new Date(state.session_started_at).getTime(),
        reason: "time_limit",
      });
      router.replace(
        state.has_survey ? `/exp/${slug}/survey` : `/exp/${slug}/complete`
      );
    };

    const remaining = state.deadline_at - Date.now();
    if (remaining <= 0) {
      void finish();
      return;
    }
    const timer = window.setTimeout(() => void finish(), remaining);
    return () => window.clearTimeout(timer);
  }, [pathname, router, slug]);

  return null;
}
