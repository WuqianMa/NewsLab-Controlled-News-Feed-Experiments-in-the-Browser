// Shipped with every export so the dataset is self-explaining in R / OSF.
export const DATA_DICTIONARY = `# NewsLab export — data dictionary

All timestamps are ISO 8601 unless noted. \`client_timestamp\` is Unix
milliseconds from the participant's browser clock (use relative timing within a
session, not absolute). Participant IDs are pseudonymous UUIDs; no PII is
collected. Researcher previews are excluded unless you exported with
"include previews"; pilot rows are flagged, filter on \`is_pilot\` as needed.

## events.csv — one row per behavioral event
| column | meaning |
|---|---|
| event_id | client-generated UUID (idempotency key) |
| experiment_slug | experiment |
| participant_id | pseudonymous participant |
| condition_label | assigned condition |
| session_id | browsing session (a participant can have several) |
| tab_id | browser tab (per-tab UUID; multi-tab behavior is distinguishable) |
| event_type | see the event taxonomy in description/02-BEHAVIOR-TRACKING.md |
| client_timestamp | Unix ms, browser clock |
| server_received_at | server receipt time of the batch |
| card_id / article_id | content item the event refers to (if any) |
| position_in_feed | 0-based index into the participant's served feed order |
| reaction / toggled_on / channel | like·share·bookmark details (card_reaction, article_reaction) |
| scroll_position / scroll_velocity | px, px/s (feed_scrolled) |
| depth_percentage | 25/50/75/100 milestone (article_scroll_depth) |
| dwell_visible_ms / dwell_hidden_ms | article dwell split by tab visibility (article_dwell_time) |
| click_target | headline / image / card_body / related (card_clicked) |
| payload_json | full raw payload (JSON) for anything not flattened |

## participants.csv — one row per participant
| column | meaning |
|---|---|
| participant_id, experiment_slug, condition_label | identity & assignment |
| status | consented / active / completed / abandoned |
| is_pilot | joined while experiment status was "pilot" |
| is_preview | researcher preview — exclude from analysis |
| external_id | Prolific/MTurk id if recruited |
| consent_version | which consent text version they agreed to |
| consented_at, first_session_at, last_activity_at | timings |
| n_sessions, total_events | volume |
| survey_completed | 1 if any survey answers exist |

## item_exposures.csv — one row per participant × served item
Derived from the participant's stored feed order + events. This is where
"skipped" lives: served but never impressed.
| column | meaning |
|---|---|
| participant_id, condition_label | identity |
| content_item_id, item_title | the item |
| variant_type | null = original; else reframed_left / with_rebuttal / … |
| is_filler | filler item (not a measured stimulus) |
| served_position | 0-based position in this participant's feed |
| impressed | 1 if the card was ≥50% visible for ≥1s |
| impressed_at | client ms of the impression |
| clicked | 1 if the card was clicked |
| article_opened | 1 if the article page loaded |
| max_scroll_depth | deepest article milestone (0–100) |
| dwell_visible_ms | article visible-time total |
| liked / shared / bookmarked | 1 if the reaction was toggled on at least once |
| skipped | 1 = served but never impressed |

## survey_responses.csv — one row per participant × question
| column | meaning |
|---|---|
| participant_id, condition_label | identity |
| question_id | stable id from the survey definition |
| question_prompt | prompt text at answer time (denormalized) |
| answer | likert 1–5 (string), choice label, or free text |
| answered_at | server time |
`;
