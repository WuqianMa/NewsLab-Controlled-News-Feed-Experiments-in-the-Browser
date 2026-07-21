"use client";

import { useRef } from "react";
import { tracker } from "@/lib/tracker";
import { relativeTime, formatCount } from "@/lib/relativeTime";
import { ActionBar } from "./ActionBar";
import type { ConditionView, FeedItem, RegisterRef } from "./types";

function SourceRow({
  item,
  show,
}: {
  item: FeedItem;
  show: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      {show && (
        <>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-600">
            {item.source_name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span className="font-medium text-gray-700">{item.source_name}</span>
          <span>·</span>
        </>
      )}
      <span>{relativeTime(item.published_at)}</span>
    </div>
  );
}

function EngagementRow({ item }: { item: FeedItem }) {
  const likes = formatCount(item.fake_likes);
  const comments = formatCount(item.fake_comments);
  const views = formatCount(item.fake_views);
  if (!likes && !comments && !views) return null;
  return (
    <div className="flex items-center gap-3 text-[11px] text-gray-400">
      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">
        {item.category}
      </span>
      {comments && <span>💬 {comments}</span>}
      {views && <span>👁 {views}</span>}
      {likes && <span>♥ {likes}</span>}
    </div>
  );
}

// Interaction wiring shared by all layouts: click targets, hover (desktop),
// long-press (touch). Impression tracking is the parent's job via registerRef.
export function useCardInteractions(itemId: string) {
  const hoverStart = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const canHover =
    typeof window !== "undefined" &&
    window.matchMedia?.("(hover: hover)").matches;

  const handlers = {
    onPointerEnter: () => {
      if (!canHover) return;
      hoverStart.current = Date.now();
      tracker.track("card_hover_start", { card_id: itemId });
    },
    onPointerLeave: () => {
      if (!canHover || hoverStart.current === null) return;
      tracker.track("card_hover_end", {
        card_id: itemId,
        hover_duration_ms: Date.now() - hoverStart.current,
      });
      hoverStart.current = null;
    },
    onTouchStart: () => {
      longPressed.current = false;
      pressTimer.current = window.setTimeout(() => {
        longPressed.current = true;
        tracker.track("card_long_press", { card_id: itemId });
      }, 500);
    },
    onTouchEnd: () => {
      if (pressTimer.current !== null) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    },
    onTouchMove: () => {
      if (pressTimer.current !== null) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    },
    onTouchCancel: () => {
      if (pressTimer.current !== null) clearTimeout(pressTimer.current);
      pressTimer.current = null;
      longPressed.current = false;
    },
  };
  const consumeLongPress = () => {
    if (!longPressed.current) return false;
    longPressed.current = false;
    return true;
  };
  return { handlers, consumeLongPress };
}

export function ContentCard({
  item,
  position,
  condition,
  registerRef,
  onOpen,
}: {
  item: FeedItem;
  position: number;
  condition: ConditionView;
  registerRef: RegisterRef;
  onOpen: (id: string, clickTarget: string, position: number) => void;
}) {
  const interactions = useCardInteractions(item.id);
  // Deterministic layout variety for realism: thumbnail left vs top.
  const thumbTop =
    !!item.thumbnail_url &&
    (item.id.charCodeAt(0) + item.id.charCodeAt(1)) % 2 === 0;

  const open = (target: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (interactions.consumeLongPress()) {
      e.preventDefault();
      return;
    }
    onOpen(item.id, target, position);
  };

  const thumb = item.thumbnail_url && (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-100 ${
        thumbTop ? "mb-2 aspect-[16/9] w-full" : "h-20 w-28 shrink-0"
      }`}
      onClick={open("image")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.thumbnail_url}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
      {item.media === "video" && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 pl-0.5 text-white">
            ▶
          </span>
        </span>
      )}
    </div>
  );

  return (
    <article
      ref={registerRef(item.id, position)}
      className="nz-card-shadow cursor-pointer rounded-xl bg-white p-3.5"
      onClick={open("card_body")}
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
      <SourceRow item={item} show={condition.show_source_labels} />
      <div className={thumbTop ? "mt-2" : "mt-2 flex gap-3"}>
        {thumbTop && thumb}
        <div className="min-w-0 flex-1">
          <h2
            className="nz-serif text-[17px] font-bold leading-snug"
            onClick={open("headline")}
          >
            {item.title}
          </h2>
          {item.snippet && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-600">
              {item.snippet}
            </p>
          )}
        </div>
        {!thumbTop && thumb}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        {condition.show_engagement_counts ? (
          <EngagementRow item={item} />
        ) : (
          <span />
        )}
        {condition.show_action_bar && (
          <ActionBar targetId={item.id} eventType="card_reaction" compact />
        )}
      </div>
    </article>
  );
}
