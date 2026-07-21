// Enum value lists — SQLite has no native enums (see fable/01), so these arrays
// are the single source of truth, enforced by Zod at every API boundary.

export const EXPERIMENT_STATUSES = [
  "draft",
  "pilot",
  "active",
  "paused",
  "completed",
  "archived",
] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const RECRUITING_STATUSES: ExperimentStatus[] = ["active", "pilot"];

export const ASSIGNMENT_METHODS = ["random", "balanced", "sequential"] as const;
export type AssignmentMethod = (typeof ASSIGNMENT_METHODS)[number];

export const FEED_LAYOUTS = ["vertical", "grid", "fullscreen"] as const;
export type FeedLayout = (typeof FEED_LAYOUTS)[number];

export const FEED_ORDERS = [
  "fixed",
  "shuffled",
  "reverse_chronological",
] as const;
export type FeedOrder = (typeof FEED_ORDERS)[number];

export const SESSION_STATUSES = [
  "active",
  "paused",
  "completed",
  "abandoned",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const PARTICIPANT_STATUSES = [
  "consented",
  "active",
  "completed",
  "abandoned",
] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const VARIANT_TYPES = [
  "reframed_left",
  "reframed_right",
  "reframed_neutral",
  "with_rebuttal",
  "simplified",
  "custom",
] as const;
export type VariantType = (typeof VARIANT_TYPES)[number];

export const REACTIONS = ["like", "share", "bookmark"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const EVENT_TYPES = [
  "feed_loaded",
  "feed_scrolled",
  "feed_reached_end",
  "feed_refreshed",
  "feed_abandoned",
  "card_impressed",
  "card_clicked",
  "card_hover_start",
  "card_hover_end",
  "card_long_press",
  "card_reaction",
  "article_opened",
  "article_scroll_depth",
  "article_dwell_time",
  "article_closed",
  "article_reaction",
  "article_link_clicked",
  "session_started",
  "session_resumed",
  "session_ended",
  "consent_given",
  "page_visibility_changed",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const SURVEY_QUESTION_TYPES = ["likert5", "choice", "text"] as const;
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  prompt: string;
  options?: string[];
  required?: boolean;
}

// Cookie names
export const participantCookie = (experimentId: string) =>
  `nl_pid_${experimentId}`;
export const ADMIN_COOKIE = "nl_admin";

// The participant-facing fake platform brand. Never expose experiment
// vocabulary in participant UI.
export const BRAND = "Nuze";
