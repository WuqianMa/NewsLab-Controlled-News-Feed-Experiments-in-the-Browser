"use client";

import { useEffect, useRef, useState } from "react";
import { tracker } from "@/lib/tracker";
import { useImpressions } from "@/hooks/useImpressions";
import { useScrollTracker } from "@/hooks/useScrollTracker";
import { relativeTime } from "@/lib/relativeTime";
import { ContentCard, useCardInteractions } from "./ContentCard";
import { ActionBar } from "./ActionBar";
import type { ConditionView, FeedItem } from "./types";

interface FeedProps {
  items: FeedItem[];
  condition: ConditionView;
  onOpen: (id: string, clickTarget: string, position: number) => void;
  onContinue: () => void | Promise<void>;
  maxImpressedRef: React.MutableRefObject<() => number>;
  currentScrollRef: React.MutableRefObject<() => number>;
  initialScrollPosition: number | null;
  onInitialPositionApplied: () => void;
}

function useWindowRestore(position: number | null, onApplied: () => void) {
  useEffect(() => {
    if (position === null) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, position);
      onApplied();
    });
    return () => cancelAnimationFrame(frame);
  }, [onApplied, position]);
}

// Pull-to-refresh (visual only — spec realism item). Vertical + grid.
function usePullToRefresh(setRefreshing: (v: boolean) => void) {
  const startY = useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (startY.current === null) return;
      if (e.touches[0].clientY - startY.current > 70) {
        startY.current = null;
        setRefreshing(true);
        tracker.track("feed_refreshed", {});
        setTimeout(() => setRefreshing(false), 700);
      }
    },
  };
}

function ContinuePanel({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-5 flex items-center gap-3 px-8 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-300" />
        You&apos;re all caught up
        <span className="h-px flex-1 bg-gray-300" />
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-full bg-gray-900 px-8 py-2.5 text-sm font-medium text-white"
      >
        Continue →
      </button>
    </div>
  );
}

function FeedVertical(props: FeedProps) {
  const { registerRef, maxImpressedPosition } = useImpressions(0.5, 1000);
  props.maxImpressedRef.current = maxImpressedPosition;
  useScrollTracker();
  const [refreshing, setRefreshing] = useState(false);
  const pull = usePullToRefresh(setRefreshing);
  props.currentScrollRef.current = () => window.scrollY;
  useWindowRestore(props.initialScrollPosition, props.onInitialPositionApplied);

  return (
    <div className="mx-auto max-w-xl space-y-3 px-3 py-3 pb-20" {...pull}>
      {refreshing && (
        <div className="flex justify-center py-2">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        </div>
      )}
      {props.items.map((item, i) => (
        <ContentCard
          key={item.id}
          item={item}
          position={i}
          condition={props.condition}
          registerRef={registerRef}
          onOpen={props.onOpen}
        />
      ))}
      <ContinuePanel onContinue={props.onContinue} />
    </div>
  );
}

const TILE_COLORS = [
  "bg-slate-700",
  "bg-emerald-800",
  "bg-rose-800",
  "bg-indigo-800",
  "bg-amber-800",
];

function GridCard({
  item,
  position,
  condition,
  registerRef,
  onOpen,
}: {
  item: FeedItem;
  position: number;
  condition: ConditionView;
  registerRef: FeedProps["maxImpressedRef"] extends never
    ? never
    : (id: string, position: number) => (el: HTMLElement | null) => void;
  onOpen: FeedProps["onOpen"];
}) {
  const interactions = useCardInteractions(item.id);
  const tile = TILE_COLORS[item.id.charCodeAt(2) % TILE_COLORS.length];
  return (
    <article
      ref={registerRef(item.id, position)}
      className="nz-card-shadow mb-3 break-inside-avoid cursor-pointer overflow-hidden rounded-xl bg-white"
      onClick={(event) => {
        if (interactions.consumeLongPress()) {
          event.preventDefault();
          return;
        }
        onOpen(item.id, "card_body", position);
      }}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onOpen(item.id, "card_body", position);
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={item.title}
      {...interactions.handlers}
    >
      {item.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail_url}
          alt=""
          className="w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className={`${tile} p-4`}>
          <p className="nz-serif text-[15px] font-bold leading-snug text-white">
            {item.title}
          </p>
        </div>
      )}
      <div className="p-2.5">
        {item.thumbnail_url && (
          <p className="nz-serif text-[14px] font-bold leading-snug">
            {item.title}
          </p>
        )}
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400">
          {condition.show_source_labels ? (
            <span className="truncate">{item.source_name}</span>
          ) : (
            <span>{relativeTime(item.published_at)}</span>
          )}
          {condition.show_action_bar && (
            <ActionBar targetId={item.id} eventType="card_reaction" compact />
          )}
        </div>
      </div>
    </article>
  );
}

function FeedGrid(props: FeedProps) {
  const { registerRef, maxImpressedPosition } = useImpressions(0.5, 1000);
  props.maxImpressedRef.current = maxImpressedPosition;
  useScrollTracker();
  const [refreshing, setRefreshing] = useState(false);
  const pull = usePullToRefresh(setRefreshing);
  props.currentScrollRef.current = () => window.scrollY;
  useWindowRestore(props.initialScrollPosition, props.onInitialPositionApplied);

  return (
    <div className="mx-auto max-w-3xl px-3 py-3 pb-20" {...pull}>
      {refreshing && (
        <div className="flex justify-center py-2">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
        </div>
      )}
      <div className="columns-2 gap-3 sm:columns-3">
        {props.items.map((item, i) => (
          <GridCard
            key={item.id}
            item={item}
            position={i}
            condition={props.condition}
            registerRef={registerRef}
            onOpen={props.onOpen}
          />
        ))}
      </div>
      <ContinuePanel onContinue={props.onContinue} />
    </div>
  );
}

function FullscreenItem({
  item,
  position,
  condition,
  registerRef,
  onOpen,
}: {
  item: FeedItem;
  position: number;
  condition: ConditionView;
  registerRef: (
    id: string,
    position: number
  ) => (el: HTMLElement | null) => void;
  onOpen: FeedProps["onOpen"];
}) {
  const interactions = useCardInteractions(item.id);
  return (
    <section
      ref={registerRef(item.id, position)}
      className="relative flex h-dvh snap-start flex-col justify-end overflow-hidden bg-gray-900 text-white"
      onClick={(event) => {
        if (interactions.consumeLongPress()) {
          event.preventDefault();
          return;
        }
        onOpen(item.id, "card_body", position);
      }}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onOpen(item.id, "card_body", position);
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={item.title}
      {...interactions.handlers}
    >
      {item.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
      )}
      <div className="relative z-10 p-6 pb-24">
        {condition.show_source_labels && (
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/70">
            {item.source_name} · {relativeTime(item.published_at)}
          </p>
        )}
        <h2 className="nz-serif max-w-md text-2xl font-bold leading-snug">
          {item.title}
        </h2>
        {item.snippet && (
          <p className="mt-3 max-w-md text-sm text-white/80">{item.snippet}</p>
        )}
      </div>
      {condition.show_action_bar && (
        <div className="absolute bottom-28 right-4 z-10">
          <ActionBar
            targetId={item.id}
            eventType="card_reaction"
            vertical
          />
        </div>
      )}
    </section>
  );
}

function FeedFullscreen(props: FeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Snap layouts need a higher visibility threshold.
  const { registerRef, maxImpressedPosition } = useImpressions(0.6, 1000);
  props.maxImpressedRef.current = maxImpressedPosition;
  props.currentScrollRef.current = () => containerRef.current?.scrollTop ?? 0;
  useScrollTracker(containerRef);

  useEffect(() => {
    if (props.initialScrollPosition === null || !containerRef.current) return;
    containerRef.current.scrollTop = props.initialScrollPosition;
    props.onInitialPositionApplied();
  }, [props.initialScrollPosition, props.onInitialPositionApplied]);

  return (
    <div
      ref={containerRef}
      className="h-dvh snap-y snap-mandatory overflow-y-auto"
    >
      {props.items.map((item, i) => (
        <FullscreenItem
          key={item.id}
          item={item}
          position={i}
          condition={props.condition}
          registerRef={registerRef}
          onOpen={props.onOpen}
        />
      ))}
      <div className="flex h-dvh snap-start items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="mb-4 text-sm text-white/60">
            You&apos;re all caught up
          </p>
          <button
            type="button"
            onClick={props.onContinue}
            className="rounded-full bg-white px-8 py-2.5 text-sm font-medium text-gray-900"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

export function Feed(props: FeedProps) {
  if (props.condition.feed_layout === "grid") return <FeedGrid {...props} />;
  if (props.condition.feed_layout === "fullscreen")
    return <FeedFullscreen {...props} />;
  return <FeedVertical {...props} />;
}
