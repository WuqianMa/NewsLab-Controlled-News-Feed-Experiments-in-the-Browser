"use client";

import { tracker } from "./tracker";

export interface ParticipantCheckpoint {
  scroll_position: number;
  last_card_index: number;
  elapsed_ms: number;
}

export interface ParticipantLocalState {
  participant_id: string;
  session_id: string;
  has_survey: boolean;
  session_started_at: string;
  deadline_at: number | null;
  last_checkpoint?: ParticipantCheckpoint | null;
  end_event_id?: string;
  ended?: boolean;
}

export const participantStateKey = (slug: string) => `nl_state_${slug}`;

export function readParticipantState(slug: string): ParticipantLocalState | null {
  try {
    return JSON.parse(
      localStorage.getItem(participantStateKey(slug)) ?? "null"
    ) as ParticipantLocalState | null;
  } catch {
    return null;
  }
}

export function writeParticipantState(
  slug: string,
  state: ParticipantLocalState
) {
  localStorage.setItem(participantStateKey(slug), JSON.stringify(state));
}

export async function endParticipantSession(
  slug: string,
  payload: Record<string, unknown> = {}
): Promise<boolean> {
  const state = readParticipantState(slug);
  if (!state) return false;
  if (state.ended) return true;

  tracker.init({
    endpoint: `/api/exp/${slug}/events`,
    sessionId: state.session_id,
  });

  let eventId = state.end_event_id;
  if (!eventId) {
    eventId = crypto.randomUUID();
    state.end_event_id = eventId;
    writeParticipantState(slug, state);
  }
  if (!tracker.hasBufferedEvent(eventId)) {
    tracker.track("session_ended", payload, eventId);
  }

  // User-initiated completion can wait for a real HTTP acknowledgement. The
  // tracker still uses beacon delivery for pagehide/visibility fallbacks.
  const delivered = await tracker.flush();
  if (delivered) {
    state.ended = true;
    state.end_event_id = undefined;
    state.last_checkpoint = null;
    writeParticipantState(slug, state);
  }
  return delivered;
}
