"use client";

import { useEffect, useState } from "react";
import { Card, inputCls, btnCls, btnGhostCls } from "@/components/admin/ui";

const KINDS = [
  { kind: "events", label: "events.csv", desc: "One row per behavioral event, common payload fields flattened." },
  { kind: "participants", label: "participants.csv", desc: "One row per participant: condition, status, timings, flags." },
  { kind: "item_exposures", label: "item_exposures.csv", desc: "One row per participant×item: served position, impressed, clicked, dwell, reactions, skipped." },
  { kind: "survey_responses", label: "survey_responses.csv", desc: "One row per participant×question." },
];

export default function ExportPage() {
  const [experiments, setExperiments] = useState<{ id: string; name: string }[]>([]);
  const [experiment, setExperiment] = useState("");
  const [includePreviews, setIncludePreviews] = useState(false);
  const [excludePilots, setExcludePilots] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/admin/experiments", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setExperiments(data.experiments);
        if (data.experiments[0]) setExperiment(data.experiments[0].id);
        setError(null);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError("Experiments could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const url = (kind: string) => {
    const params = new URLSearchParams();
    if (includePreviews) params.set("previews", "1");
    if (excludePilots) params.set("pilots", "0");
    return `/api/admin/export/${experiment}/${kind}?${params}`;
  };

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-bold">Data export</h1>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} Reload the page to retry.
        </p>
      )}
      <Card title="Scope">
        <select
          value={experiment}
          onChange={(e) => setExperiment(e.target.value)}
          className={`${inputCls} max-w-sm`}
        >
          {loading && <option value="">Loading experiments...</option>}
          {!loading && experiments.length === 0 && (
            <option value="">No experiments available</option>
          )}
          {experiments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <div className="mt-3 flex flex-col gap-3 text-xs text-gray-600 sm:flex-row sm:gap-5">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={includePreviews}
              onChange={(e) => setIncludePreviews(e.target.checked)}
            />
            Include researcher previews
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={excludePilots}
              onChange={(e) => setExcludePilots(e.target.checked)}
            />
            Exclude pilot participants
          </label>
        </div>
      </Card>

      <Card
        title="Files"
        right={
          experiment ? (
            <a href={url("dictionary")} className={btnGhostCls}>
              Data dictionary
            </a>
          ) : (
            <button type="button" disabled className={btnGhostCls}>
              Data dictionary
            </button>
          )
        }
      >
        <div className="space-y-3">
          {KINDS.map((k) => (
            <div key={k.kind} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              {experiment ? (
                <a href={url(k.kind)} className={`${btnCls} w-full text-center sm:w-52`}>
                  {k.label}
                </a>
              ) : (
                <button type="button" disabled className={`${btnCls} w-full sm:w-52`}>
                  {k.label}
                </button>
              )}
              <p className="text-xs text-gray-500">{k.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-gray-400">
          Exports use pseudonymous identifiers. Treat them as research data and
          archive the data dictionary alongside the CSV files.
        </p>
      </Card>
    </div>
  );
}
