"use client";

import { useCallback, useEffect, useRef } from "react";
import { tracker } from "@/lib/tracker";

// Card impression = >=`threshold` visible for >=`dwellMs`, tracked once per id.
export function useImpressions(threshold = 0.5, dwellMs = 1000) {
  const observer = useRef<IntersectionObserver | null>(null);
  const meta = useRef(new Map<Element, { id: string; position: number }>());
  const timers = useRef(new Map<string, number>());
  const done = useRef(new Set<string>());

  useEffect(() => {
    const timersMap = timers.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const m = meta.current.get(entry.target);
          if (!m || done.current.has(m.id)) continue;
          if (entry.intersectionRatio >= threshold) {
            if (!timersMap.has(m.id)) {
              timersMap.set(
                m.id,
                window.setTimeout(() => {
                  timersMap.delete(m.id);
                  if (done.current.has(m.id)) return;
                  done.current.add(m.id);
                  tracker.track("card_impressed", {
                    card_id: m.id,
                    position_in_feed: m.position,
                    viewport_percentage: Math.round(threshold * 100),
                  });
                }, dwellMs)
              );
            }
          } else {
            const t = timersMap.get(m.id);
            if (t !== undefined) {
              clearTimeout(t);
              timersMap.delete(m.id);
            }
          }
        }
      },
      { threshold: [threshold] }
    );
    observer.current = obs;
    for (const el of meta.current.keys()) obs.observe(el);
    return () => {
      obs.disconnect();
      timersMap.forEach((t) => clearTimeout(t));
      timersMap.clear();
    };
  }, [threshold, dwellMs]);

  const registerRef = useCallback(
    (id: string, position: number) => (el: HTMLElement | null) => {
      if (el) {
        meta.current.set(el, { id, position });
        observer.current?.observe(el);
      }
    },
    []
  );

  const maxImpressedPosition = useCallback(() => {
    let max = -1;
    for (const { id, position } of meta.current.values()) {
      if (done.current.has(id) && position > max) max = position;
    }
    return max;
  }, []);

  return { registerRef, maxImpressedPosition };
}
