"use client";

import { useEffect, useRef, type RefObject } from "react";
import { tracker } from "@/lib/tracker";

// Throttled (200 ms trailing) scroll sampling + one-shot feed_reached_end
// (re-armed after scrolling 200px back up). Pass a container ref for
// scrollable containers (fullscreen layout); defaults to window.
export function useScrollTracker(
  containerRef?: RefObject<HTMLElement | null>
) {
  const lastSample = useRef<{ y: number; t: number } | null>(null);
  const pending = useRef<number | null>(null);
  const endArmed = useRef(true);

  useEffect(() => {
    const container = containerRef?.current ?? null;
    const target: EventTarget = container ?? window;

    const read = () => {
      if (container) {
        return {
          y: container.scrollTop,
          viewport: container.clientHeight,
          total: container.scrollHeight,
        };
      }
      return {
        y: window.scrollY,
        viewport: window.innerHeight,
        total: document.documentElement.scrollHeight,
      };
    };

    const sample = () => {
      pending.current = null;
      const { y, viewport, total } = read();
      const now = Date.now();
      const prev = lastSample.current;
      const direction = prev ? (y >= prev.y ? "down" : "up") : "down";
      const velocity =
        prev && now > prev.t
          ? Math.round((Math.abs(y - prev.y) / (now - prev.t)) * 1000)
          : 0;
      lastSample.current = { y, t: now };
      tracker.track("feed_scrolled", {
        scroll_position: Math.round(y),
        scroll_direction: direction,
        scroll_velocity: velocity,
        viewport_height: viewport,
      });

      const atBottom = y + viewport >= total - 4;
      if (atBottom && endArmed.current) {
        endArmed.current = false;
        tracker.track("feed_reached_end", { scroll_position: Math.round(y) });
      } else if (!atBottom && total - (y + viewport) > 200) {
        endArmed.current = true;
      }
    };

    const onScroll = () => {
      if (pending.current === null) {
        pending.current = window.setTimeout(sample, 200);
      }
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      if (pending.current !== null) clearTimeout(pending.current);
    };
  }, [containerRef]);
}
