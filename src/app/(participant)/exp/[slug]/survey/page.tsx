"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { SurveyQuestion } from "@/lib/constants";
import { endParticipantSession, readParticipantState } from "@/lib/participantState";

const LIKERT = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
];

export default function SurveyPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [questions, setQuestions] = useState<SurveyQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const state = readParticipantState(slug);
    if (state && !state.ended) {
      void endParticipantSession(slug, {
        total_duration_ms:
          Date.now() - new Date(state.session_started_at).getTime(),
        reason: "survey_page",
      });
    }
    void (async () => {
      try {
        const res = await fetch(`/api/exp/${slug}/survey`, {
          signal: controller.signal,
        });
        if (res.status === 401) {
          router.replace(`/exp/${slug}/welcome`);
          return;
        }
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          router.replace(`/exp/${slug}/complete`);
          return;
        }
        setQuestions(data.questions);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError("The questions could not be loaded. Please try again.");
        }
      }
    })();
    return () => controller.abort();
  }, [slug, router]);

  const submit = async () => {
    if (!questions) return;
    for (const q of questions) {
      if (q.required && !answers[q.id]?.trim()) {
        setError("Please answer all required questions.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/exp/${slug}/survey`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers)
            .filter(([, value]) => value.trim() !== "")
            .map(([question_id, answer]) => ({ question_id, answer })),
        }),
      });
      if (!res.ok) throw new Error();
      router.push(`/exp/${slug}/complete`);
    } catch {
      setError("Could not save your answers. Please try again.");
      setBusy(false);
    }
  };

  if (!questions && !error) {
    return (
      <div className="mx-auto max-w-xl p-4 py-10">
        <div className="nz-skeleton h-40 rounded-xl bg-white" />
      </div>
    );
  }

  if (!questions) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-gray-600">{error}</p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-4 py-8">
      <h1 className="mb-1 text-lg font-bold">A few quick questions</h1>
      <p className="mb-5 text-sm text-gray-600">
        Almost done — this takes about a minute.
      </p>
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="mb-3 text-[15px] font-medium">
              {q.prompt}
              {q.required && <span className="text-red-500"> *</span>}
            </p>
            {q.type === "likert5" && (
              <div className="flex flex-col gap-2">
                {LIKERT.map((label, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-center gap-3 text-sm"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === String(i + 1)}
                      onChange={() =>
                        setAnswers((a) => ({ ...a, [q.id]: String(i + 1) }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
            {q.type === "choice" && (
              <div className="flex flex-col gap-2">
                {(q.options ?? []).map((opt) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-3 text-sm"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            {q.type === "text" && (
              <textarea
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-gray-400"
                rows={3}
                value={answers[q.id] ?? ""}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
              />
            )}
          </div>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className="mt-6 w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "Saving…" : "Submit"}
      </button>
    </main>
  );
}
