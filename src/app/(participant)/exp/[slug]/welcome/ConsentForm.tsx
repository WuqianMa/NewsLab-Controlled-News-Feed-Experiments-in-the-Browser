"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tracker } from "@/lib/tracker";
import { writeParticipantState } from "@/lib/participantState";

const CHECKBOXES = [
  "I have read and understood the information above",
  "I consent to participate",
  "I understand I can withdraw at any time",
];

export function ConsentForm({
  slug,
  consentVersion,
  externalId,
  previewToken,
}: {
  slug: string;
  consentVersion: number;
  externalId?: string;
  previewToken?: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allChecked = checked.every(Boolean);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/exp/${slug}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          external_id: externalId,
          preview_token: previewToken,
          screen: { w: window.screen.width, h: window.screen.height },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          ["not_recruiting", "target_reached"].includes(data.error)
            ? "This study is not currently accepting participants."
            : data.error === "already_completed"
              ? "This study has already been completed in this browser."
              : "Something went wrong. Please try again."
        );
        setBusy(false);
        return;
      }
      const data = await res.json();
      writeParticipantState(slug, {
        participant_id: data.participant_id,
        session_id: data.session_id,
        has_survey: data.has_survey,
        session_started_at: data.session_started_at,
        deadline_at: data.deadline_at,
        last_checkpoint: data.last_checkpoint,
      });
      tracker.init({
        endpoint: `/api/exp/${slug}/events`,
        sessionId: data.session_id,
      });
      tracker.track(data.resumed ? "session_resumed" : "session_started", {
        participant_id: data.participant_id,
        condition_id: data.condition.id,
        user_agent: navigator.userAgent,
        screen: { w: window.screen.width, h: window.screen.height },
      });
      tracker.track("consent_given", { consent_version: consentVersion });
      router.push(`/exp/${slug}/feed`);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-5">
      {CHECKBOXES.map((label, i) => (
        <label
          key={i}
          className="mb-3 flex cursor-pointer items-start gap-3 text-sm"
        >
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={checked[i]}
            onChange={() =>
              setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
            }
          />
          {label}
        </label>
      ))}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={!allChecked || busy}
        onClick={submit}
        className="mt-2 w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "One moment…" : "Continue"}
      </button>
    </div>
  );
}
