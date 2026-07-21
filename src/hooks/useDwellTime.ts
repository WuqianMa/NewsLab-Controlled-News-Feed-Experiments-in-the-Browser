"use client";

import { useEffect } from "react";
import { tracker } from "@/lib/tracker";

// Article dwell time split by visibility, plus 25/50/75/100% scroll-depth
// milestones (each tracked once). Emits article_dwell_time on unmount/pagehide.
export function useDwellTime(articleId: string | null) {
  useEffect(() => {
    if (!articleId) return;
    let visibleMs = 0;
    let hiddenMs = 0;
    let segmentStart = Date.now();
    let wasVisible = document.visibilityState === "visible";
    let emitted = false;
    const milestones = new Set<number>();

    const rotate = () => {
      const now = Date.now();
      if (wasVisible) visibleMs += now - segmentStart;
      else hiddenMs += now - segmentStart;
      segmentStart = now;
    };

    const onVisibility = () => {
      rotate();
      wasVisible = document.visibilityState === "visible";
    };

    const checkDepth = () => {
      const total = document.documentElement.scrollHeight;
      const seen = window.scrollY + window.innerHeight;
      const pct = total > 0 ? (seen / total) * 100 : 100;
      for (const m of [25, 50, 75, 100]) {
        if (pct >= m && !milestones.has(m)) {
          milestones.add(m);
          tracker.track("article_scroll_depth", {
            article_id: articleId,
            depth_percentage: m,
          });
        }
      }
    };

    const emit = () => {
      if (emitted) return;
      emitted = true;
      rotate();
      tracker.track("article_dwell_time", {
        article_id: articleId,
        total_visible_ms: visibleMs,
        total_hidden_ms: hiddenMs,
        max_depth: Math.max(0, ...milestones),
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", checkDepth, { passive: true });
    window.addEventListener("pagehide", emit);
    // Content shorter than the viewport counts as fully read.
    const initial = window.setTimeout(checkDepth, 300);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", checkDepth);
      window.removeEventListener("pagehide", emit);
      clearTimeout(initial);
      emit();
    };
  }, [articleId]);
}
