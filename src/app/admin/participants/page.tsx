"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { Card, btnGhostCls, inputCls } from "@/components/admin/ui";

interface Row {
  id: string;
  experiment: string;
  condition: string;
  status: string;
  is_pilot: boolean;
  is_preview: boolean;
  external_id: string | null;
  consent_version: number;
  created_at: string;
  sessions: number;
  events: number;
  survey_answers: number;
}

interface Detail {
  participant: {
    id: string;
    sessions: {
      id: string;
      status: string;
      startedAt: string;
      endedAt: string | null;
      lastCheckpoint: unknown;
      _count: { events: number };
    }[];
  };
  event_histogram: { event_type: string; count: number }[];
}

export default function ParticipantsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [experiments, setExperiments] = useState<{ id: string; name: string }[]>([]);
  const [experiment, setExperiment] = useState("");
  const [showPreviews, setShowPreviews] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (experiment) params.set("experiment", experiment);
    if (showPreviews) params.set("previews", "1");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/participants?${params}`, { signal });
      if (!res.ok) throw new Error();
      setRows((await res.json()).participants);
      setError(null);
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        setError("Participants could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [experiment, showPreviews]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    void (async () => {
      try {
        const res = await fetch("/api/admin/experiments", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        setExperiments((await res.json()).experiments);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError("Participant filters could not be loaded.");
        }
      }
    })();
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    setDetail(null);
    setDetailError(null);
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`/api/admin/participants/${openId}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        setDetail(await res.json());
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setDetailError("Participant details could not be loaded.");
        }
      }
    })();
    return () => controller.abort();
  }, [openId]);

  const byCondition = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.condition] = (acc[row.condition] ?? 0) + 1;
    return acc;
  }, {});
  const completed = rows.filter((row) => row.status === "completed").length;
  const active = rows.filter((row) => row.status === "active").length;

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="text-xl font-bold">Participants</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={experiment}
          onChange={(event) => setExperiment(event.target.value)}
          className={`${inputCls} max-w-xs`}
        >
          <option value="">All experiments</option>
          {experiments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={showPreviews}
            onChange={(event) => setShowPreviews(event.target.checked)}
          />
          Show researcher previews
        </label>
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" className={btnGhostCls} onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}
      {actionMsg && (
        <p className="text-sm text-gray-600" role="status">
          {actionMsg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total", rows.length],
          ["Consented to active", active],
          ["Completed", completed],
          [
            "Completion rate",
            rows.length ? `${Math.round((completed / rows.length) * 100)}%` : "-",
          ],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <Card title="By condition">
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(byCondition).map(([label, count]) => (
            <span key={label} className="rounded-lg bg-gray-100 px-3 py-1.5">
              {label}: <strong>{count}</strong>
            </span>
          ))}
          {!loading && rows.length === 0 && (
            <span className="text-gray-400">No participants yet.</span>
          )}
        </div>
      </Card>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">Condition</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Flags</th>
              <th className="px-3 py-2.5">Events</th>
              <th className="px-3 py-2.5">Survey</th>
              <th className="px-3 py-2.5">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  onClick={() => setOpenId(openId === row.id ? null : row.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setOpenId(openId === row.id ? null : row.id);
                    }
                  }}
                  tabIndex={0}
                  aria-expanded={openId === row.id}
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.id.slice(0, 8)}</td>
                  <td className="px-3 py-2">{row.condition}</td>
                  <td className="px-3 py-2 text-xs">{row.status}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.is_preview && (
                      <span className="mr-1 rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">
                        preview
                      </span>
                    )}
                    {row.is_pilot && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                        pilot
                      </span>
                    )}
                    {row.external_id && (
                      <span className="text-gray-400">ext:{row.external_id.slice(0, 10)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{row.events}</td>
                  <td className="px-3 py-2">{row.survey_answers > 0 ? "Yes" : "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                </tr>
                {openId === row.id && (
                  <tr>
                    <td colSpan={7} className="border-t border-gray-100 bg-gray-50 p-4">
                      {detailError ? (
                        <p className="text-xs text-red-600">{detailError}</p>
                      ) : !detail || detail.participant.id !== row.id ? (
                        <p className="text-xs text-gray-400">Loading...</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                          <div>
                            <p className="mb-1 font-semibold text-gray-600">Sessions</p>
                            {detail.participant.sessions.map((session) => (
                              <p key={session.id} className="text-gray-600">
                                {new Date(session.startedAt).toLocaleString()} / {session.status} /{" "}
                                {session._count.events} events
                              </p>
                            ))}
                          </div>
                          <div>
                            <p className="mb-1 font-semibold text-gray-600">Event types</p>
                            <div className="flex flex-wrap gap-1.5">
                              {detail.event_histogram.map((entry) => (
                                <span key={entry.event_type} className="rounded bg-white px-1.5 py-0.5">
                                  {entry.event_type}: {entry.count}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            {confirmDeleteId === row.id ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-red-700">This permanently removes all participant data.</span>
                                <button
                                  type="button"
                                  className="rounded-lg bg-red-700 px-3 py-1.5 text-white disabled:opacity-50"
                                  disabled={deleting === row.id}
                                  onClick={async (event) => {
                                    event.stopPropagation();
                                    setDeleting(row.id);
                                    setActionMsg(null);
                                    try {
                                      const res = await fetch(`/api/admin/participants/${row.id}`, {
                                        method: "DELETE",
                                      });
                                      if (!res.ok) throw new Error();
                                      const data = await res.json();
                                      setActionMsg(
                                        `Removed ${data.removed.sessions} sessions, ${data.removed.events} events, and ${data.removed.survey_responses} survey answers.`
                                      );
                                      setOpenId(null);
                                      setConfirmDeleteId(null);
                                      await load();
                                    } catch {
                                      setActionMsg("Participant data could not be deleted.");
                                    } finally {
                                      setDeleting(null);
                                    }
                                  }}
                                >
                                  {deleting === row.id ? "Deleting..." : "Confirm delete"}
                                </button>
                                <button type="button" className={btnGhostCls} disabled={deleting === row.id} onClick={() => setConfirmDeleteId(null)}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-50"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setConfirmDeleteId(row.id);
                                }}
                              >
                                Delete all data (RGPD)
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Loading participants...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No participants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
