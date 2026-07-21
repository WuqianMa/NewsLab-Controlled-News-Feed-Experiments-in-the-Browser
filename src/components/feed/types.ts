export interface FeedItem {
  id: string;
  title: string;
  snippet: string;
  source_name: string;
  source_logo_url: string | null;
  thumbnail_url: string | null;
  category: string;
  published_at: string;
  fake_likes: number | null;
  fake_comments: number | null;
  fake_views: number | null;
  media?: string | null;
}

export interface ConditionView {
  id: string;
  label: string;
  feed_layout: string;
  show_source_labels: boolean;
  show_engagement_counts: boolean;
  show_action_bar: boolean;
  time_limit_seconds: number | null;
  custom_css_class: string | null;
}

export type RegisterRef = (
  id: string,
  position: number
) => (el: HTMLElement | null) => void;
