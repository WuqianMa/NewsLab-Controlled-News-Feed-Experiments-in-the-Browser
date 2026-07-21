"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { tracker } from "@/lib/tracker";
import {
  endParticipantSession,
  readParticipantState,
  writeParticipantState,
} from "@/lib/participantState";
import { Feed } from "@/components/feed/Feed";
import { FeedHeader, CardSkeleton } from "@/components/feed/Chrome";
import type { ConditionView, FeedItem } from "@/components/feed/types";

export default function FeedPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [condition, setCondition] = useState<ConditionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [initialScrollPosition, setInitialScrollPosition] = useState<number | null>(
    null
  );
  const maxImpressedRef = useRef<() => number>(() => -1);
  const currentScrollRef = useRef<() => number>(() => window.scrollY);
  const finished = useRef(false);

  const finish = useCallback(async () => {
    if (finished.current) return;
    finished.current = true;
    const state = readParticipantState(slug);
    await endParticipantSession(slug, {
      total_duration_ms: state
        ? Date.now() - new Date(state.session_started_at).getTime()
        : undefined,
      reason: "continue",
    });
    router.push(
      state?.has_survey ? `/exp/${slug}/survey` : `/exp/${slug}/complete`
    );
  }, [router, slug]);

  const clearRestoredCheckpoint = useCallback(() => {
    setInitialScrollPosition(null);
    const state = readParticipantState(slug);
    if (state?.last_checkpoint) {
      state.last_checkpoint = null;
      writeParticipantState(slug, state);
    }
  }, [slug]);

  useEffect(() => {
    const state = readParticipantState(slug);
    if (!state) {
      router.replace(`/exp/${slug}/welcome`);
      return;
    }
    finished.current = false;
    tracker.init({
      endpoint: `/api/exp/${slug}/events`,
      sessionId: state.session_id,
    });

    let cancelled = false;
    const controller = new AbortController();
    setError(null);
    setItems(null);
    void (async () => {
      try {
        const res = await fetch(`/api/exp/${slug}/feed`, {
          signal: controller.signal,
        });
        if (res.status === 401) {
          router.replace(`/exp/${slug}/welcome`);
          return;
        }
        if (!res.ok) throw new Error(`feed_${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setItems(data.items);
        setCondition(data.condition);
        tracker.track("feed_loaded", {
          item_count: data.items.length,
          layout: data.condition.feed_layout,
        });

        const backPosition = sessionStorage.getItem(`nl_scroll_${slug}`);
        if (backPosition !== null) {
          sessionStorage.removeItem(`nl_scroll_${slug}`);
          setInitialScrollPosition(parseInt(backPosition, 10) || 0);
        } else if (state.last_checkpoint) {
          setInitialScrollPosition(state.last_checkpoint.scroll_position);
        }
      } catch (caught) {
        if (!cancelled && (caught as Error).name !== "AbortError") {
          setError("The feed could not be loaded. Check your connection and try again.");
        }
      }
    })();

    tracker.registerCheckpointProvider(() => ({
      scroll_position: Math.round(currentScrollRef.current()),
      last_card_index: maxImpressedRef.current(),
      elapsed_ms:
        Date.now() - new Date(state.session_started_at).getTime(),
    }));

    const onPageHide = () => {
      if (finished.current) return;
      tracker.track("feed_abandoned", {
        scroll_position: Math.round(currentScrollRef.current()),
        last_card_index: maxImpressedRef.current(),
      });
      void tracker.flush({ useBeacon: true });
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener("pagehide", onPageHide);
      tracker.registerCheckpointProvider(null);
    };
  }, [finish, loadAttempt, router, slug]);

  const onOpen = useCallback(
    (id: string, clickTarget: string, position: number) => {
      tracker.track("card_clicked", {
        card_id: id,
        click_target: clickTarget,
        position_in_feed: position,
      });
      sessionStorage.setItem(
        `nl_scroll_${slug}`,
        String(currentScrollRef.current())
      );
      router.push(`/exp/${slug}/article/${id}`);
    },
    [router, slug]
  );

  const fullscreen = condition?.feed_layout === "fullscreen";

  return (
    <div className={condition?.custom_css_class ?? ""}>
      {!fullscreen && <FeedHeader />}
      {error ? (
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <p className="text-sm text-gray-600">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            Try again
          </button>
        </main>
      ) : items && condition ? (
        items.length > 0 ? (
          <Feed
            items={items}
            condition={condition}
            onOpen={onOpen}
            onContinue={finish}
            maxImpressedRef={maxImpressedRef}
            currentScrollRef={currentScrollRef}
            initialScrollPosition={initialScrollPosition}
            onInitialPositionApplied={clearRestoredCheckpoint}
          />
        ) : (
          <main className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-sm text-gray-600">No stories are available.</p>
            <button
              type="button"
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => void finish()}
            >
              Continue
            </button>
          </main>
        )
      ) : (
        <div className="mx-auto max-w-xl space-y-3 px-3 py-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
