"use client";

import { useEffect, useState } from "react";
import { endParticipantSession, readParticipantState } from "@/lib/participantState";

export function CompleteClient({
  slug,
  redirectUrl,
  completionCode,
}: {
  slug: string;
  redirectUrl: string | null;
  completionCode: string | null;
}) {
  const [copyState, setCopyState] = useState<"copied" | "error" | null>(null);
  const [countdown, setCountdown] = useState(redirectUrl ? 5 : null);

  useEffect(() => {
    const state = readParticipantState(slug);
    if (!state) return;
    void endParticipantSession(slug, {
      total_duration_ms:
        Date.now() - new Date(state.session_started_at).getTime(),
      reason: "completion_page",
    });
  }, [slug]);

  useEffect(() => {
    if (countdown === null || !redirectUrl) return;
    if (countdown <= 0) {
      window.location.href = redirectUrl;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, redirectUrl]);

  return (
    <div className="mt-6 border-t border-gray-200 pt-5">
      {redirectUrl && (
        <p className="text-sm text-gray-600">
          Returning you in {countdown}s…{" "}
          <a href={redirectUrl} className="text-blue-700 underline">
            continue now
          </a>
        </p>
      )}
      {!redirectUrl && completionCode && (
        <div>
          <p className="mb-2 text-sm text-gray-600">Your completion code:</p>
          <button
            type="button"
            className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-2 font-mono text-sm"
            onClick={async () => {
              try {
                if (!navigator.clipboard?.writeText) throw new Error();
                await navigator.clipboard.writeText(completionCode);
                setCopyState("copied");
              } catch {
                setCopyState("error");
              }
              setTimeout(() => setCopyState(null), 1800);
            }}
          >
            {completionCode} {copyState === "copied" ? "copied" : "copy"}
          </button>
          {copyState === "error" && (
            <p className="mt-2 text-xs text-red-600">The code could not be copied.</p>
          )}
        </div>
      )}
      {!redirectUrl && !completionCode && (
        <p className="text-sm text-gray-500">You may now close this page.</p>
      )}
    </div>
  );
}
