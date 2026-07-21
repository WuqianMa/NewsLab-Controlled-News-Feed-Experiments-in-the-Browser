"use client";

import { useEffect, useRef, useState } from "react";
import { tracker } from "@/lib/tracker";

const CHANNELS = ["WhatsApp", "Message", "Email", "Copy link"];

interface StoredReaction {
  liked: boolean;
  saved: boolean;
}

const reactionStorageKey = (sessionId: string) => `nl_reactions_${sessionId}`;

function readReaction(targetId: string): StoredReaction {
  try {
    const sessionId = tracker.currentSessionId;
    if (!sessionId) return { liked: false, saved: false };
    const all = JSON.parse(
      sessionStorage.getItem(reactionStorageKey(sessionId)) ?? "{}"
    ) as Record<string, StoredReaction>;
    return all[targetId] ?? { liked: false, saved: false };
  } catch {
    return { liked: false, saved: false };
  }
}

function writeReaction(targetId: string, value: StoredReaction) {
  try {
    const sessionId = tracker.currentSessionId;
    if (!sessionId) return;
    const key = reactionStorageKey(sessionId);
    const all = JSON.parse(sessionStorage.getItem(key) ?? "{}") as Record<
      string,
      StoredReaction
    >;
    all[targetId] = value;
    sessionStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* UI state should not interrupt the study */
  }
}

// Like / Share / Save — the tracked dependent variables (fable/06). The share
// sheet is fake: choosing a channel logs the intent, nothing leaves the app.
export function ActionBar({
  targetId,
  eventType,
  compact = false,
  vertical = false,
}: {
  targetId: string;
  eventType: "card_reaction" | "article_reaction";
  compact?: boolean;
  vertical?: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const firstChannelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const idKey = eventType === "card_reaction" ? "card_id" : "article_id";

  useEffect(() => {
    const stored = readReaction(targetId);
    setLiked(stored.liked);
    setSaved(stored.saved);
  }, [targetId]);

  useEffect(() => {
    if (!sheetOpen) return;
    firstChannelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheetOpen(false);
        shareButtonRef.current?.focus();
      } else if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button:not([disabled])"
          ) ?? []
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen]);

  const toggle = (
    reaction: "like" | "bookmark",
    state: boolean,
    set: (v: boolean) => void
  ) => {
    const next = !state;
    set(next);
    const stored = readReaction(targetId);
    writeReaction(targetId, {
      ...stored,
      ...(reaction === "like" ? { liked: next } : { saved: next }),
    });
    tracker.track(eventType, {
      [idKey]: targetId,
      reaction,
      toggled_on: next,
    });
  };

  const closeSheet = () => {
    setSheetOpen(false);
    shareButtonRef.current?.focus();
  };

  const btn = vertical
    ? "flex flex-col items-center gap-1 text-white drop-shadow"
    : "flex items-center gap-1.5 text-gray-500";
  const label = compact || vertical ? "text-[11px]" : "text-xs";

  return (
    <>
      <div
        className={
          vertical
            ? "flex flex-col items-center gap-5"
            : "flex items-center gap-6 pt-1"
        }
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={btn}
          onClick={() => toggle("like", liked, setLiked)}
          aria-pressed={liked}
        >
          <span className={liked ? "text-red-500" : ""}>
            {liked ? "♥" : "♡"}
          </span>
          <span className={label}>Like</span>
        </button>
        <button
          ref={shareButtonRef}
          type="button"
          className={btn}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <span>{"↗"}</span>
          <span className={label}>Share</span>
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => toggle("bookmark", saved, setSaved)}
          aria-pressed={saved}
        >
          <span className={saved ? "text-amber-500" : ""}>
            {saved ? "★" : "☆"}
          </span>
          <span className={label}>Save</span>
        </button>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={(e) => {
            e.stopPropagation();
            closeSheet();
          }}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-t-2xl bg-white p-4 pb-8 text-gray-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`share-title-${targetId}`}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded bg-gray-300" />
            <p id={`share-title-${targetId}`} className="mb-3 text-sm font-semibold">
              Share
            </p>
            {CHANNELS.map((channel, index) => (
              <button
                key={channel}
                ref={index === 0 ? firstChannelRef : undefined}
                type="button"
                className="block w-full rounded-lg px-3 py-3 text-left text-sm hover:bg-gray-100"
                onClick={() => {
                  tracker.track(eventType, {
                    [idKey]: targetId,
                    reaction: "share",
                    toggled_on: true,
                    channel,
                  });
                  closeSheet();
                }}
              >
                {channel}
              </button>
            ))}
            <button
              type="button"
              className="mt-2 block w-full rounded-lg bg-gray-100 px-3 py-3 text-center text-sm"
              onClick={closeSheet}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
