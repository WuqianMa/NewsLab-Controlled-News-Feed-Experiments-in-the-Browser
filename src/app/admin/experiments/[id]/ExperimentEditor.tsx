"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSIGNMENT_METHODS,
  EXPERIMENT_STATUSES,
  FEED_LAYOUTS,
  FEED_ORDERS,
  SURVEY_QUESTION_TYPES,
  type SurveyQuestion,
} from "@/lib/constants";
import { Card, StatusBadge, inputCls, btnCls, btnGhostCls } from "@/components/admin/ui";
import type { LaunchIssue } from "@/lib/launchReadiness";

interface ConditionData {
  id: string;
  label: string;
  description: string;
  contentSetId: string | null;
  feedLayout: string;
  feedOrder: string;
  maxItems: number | null;
  timeLimitSeconds: number | null;
  showSourceLabels: boolean;
  showEngagementCounts: boolean;
  showActionBar: boolean;
  weight: number;
  _count: { participants: number };
}

interface ExperimentData {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  assignmentMethod: string;
  targetSampleSize: number | null;
  welcomeContent: string;
  consentVersion: number;
  completionContent: string;
  completionRedirectUrl: string | null;
  completionCode: string | null;
  surveyJson: SurveyQuestion[] | null;
  resumeWindowHours: number;
  conditions: ConditionData[];
  contentSets: { id: string; name: string }[];
}

const STATUS_HELP: Record<string, string> = {
  draft: "Being configured — participants cannot join.",
  pilot: "Test run — joiners are flagged is_pilot.",
  active: "Open for recruitment.",
  paused: "No new participants; existing sessions can finish.",
  completed: "Closed; data ready for export.",
  archived: "Read-only.",
};

function useSave() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async (url: string, method: string, body?: unknown) => {
    setSaving(true);
    setMsg(null);
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setMsg("Saved ✓");
      setTimeout(() => setMsg(null), 2000);
      router.refresh();
      return data;
    }
    const detail = Array.isArray(data.issues)
      ? data.issues.map((issue: LaunchIssue) => issue.message).join(" ")
      : Array.isArray(data.detail)
        ? data.detail.map((issue: { message?: string }) => issue.message).filter(Boolean).join(" ")
        : data.error ?? res.status;
    setMsg(`Error: ${detail}`);
    return null;
  };
  return { save, saving, msg };
}

function ConditionCard({
  condition,
  sets,
  experimentId,
}: {
  condition: ConditionData;
  sets: { id: string; name: string }[];
  experimentId: string;
}) {
  const [c, setC] = useState(condition);
  const { save, saving, msg } = useSave();
  const router = useRouter();
  const [previewing, setPreviewing] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof ConditionData>(k: K, v: ConditionData[K]) =>
    setC((prev) => ({ ...prev, [k]: v }));

  const preview = async () => {
    setPreviewing(true);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/admin/experiments/${experimentId}/preview?condition=${condition.id}`
      );
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setActionMsg("Preview could not be opened.");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          value={c.label}
          onChange={(e) => set("label", e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-sm font-semibold"
        />
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{c._count.participants} participants</span>
          <button type="button" onClick={preview} disabled={previewing} className={btnGhostCls}>
            {previewing ? "Opening..." : "Preview"}
          </button>
        </div>
      </div>
      {!c.contentSetId && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
          ⚠ No content set linked — participants would see an empty feed.
        </p>
      )}
      {actionMsg && <p className="mt-2 text-xs text-red-600">{actionMsg}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-gray-600">
          Content set
          <select
            value={c.contentSetId ?? ""}
            onChange={(e) => set("contentSetId", e.target.value || null)}
            className={`mt-1 ${inputCls}`}
          >
            <option value="">— none —</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-gray-600">
          Layout
          <select
            value={c.feedLayout}
            onChange={(e) => set("feedLayout", e.target.value)}
            className={`mt-1 ${inputCls}`}
          >
            {FEED_LAYOUTS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block text-gray-600">
          Order
          <select
            value={c.feedOrder}
            onChange={(e) => set("feedOrder", e.target.value)}
            className={`mt-1 ${inputCls}`}
          >
            {FEED_ORDERS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="block text-gray-600">
          Max items
          <input
            type="number"
            min={1}
            max={500}
            value={c.maxItems ?? ""}
            onChange={(e) =>
              set("maxItems", e.target.value ? parseInt(e.target.value, 10) : null)
            }
            className={`mt-1 ${inputCls}`}
            placeholder="all"
          />
        </label>
        <label className="block text-gray-600">
          Time limit (s)
          <input
            type="number"
            min={1}
            max={86400}
            value={c.timeLimitSeconds ?? ""}
            onChange={(e) =>
              set(
                "timeLimitSeconds",
                e.target.value ? parseInt(e.target.value, 10) : null
              )
            }
            className={`mt-1 ${inputCls}`}
            placeholder="none"
          />
        </label>
        <label className="block text-gray-600">
          Weight
          <input
            type="number"
            min={0.1}
            max={100}
            step="0.1"
            value={c.weight}
            onChange={(e) => set("weight", parseFloat(e.target.value) || 1)}
            className={`mt-1 ${inputCls}`}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
        {(
          [
            ["showSourceLabels", "Source labels"],
            ["showEngagementCounts", "Engagement counts"],
            ["showActionBar", "Like/share/save buttons"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={c[key]}
              onChange={(e) => set(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          className={btnCls}
          onClick={() =>
            save(`/api/admin/conditions/${c.id}`, "PATCH", {
              label: c.label,
              contentSetId: c.contentSetId,
              feedLayout: c.feedLayout,
              feedOrder: c.feedOrder,
              maxItems: c.maxItems,
              timeLimitSeconds: c.timeLimitSeconds,
              showSourceLabels: c.showSourceLabels,
              showEngagementCounts: c.showEngagementCounts,
              showActionBar: c.showActionBar,
              weight: c.weight,
            })
          }
        >
          Save condition
        </button>
        {confirmDelete ? (
          <>
            <button
              type="button"
              className="rounded-lg bg-red-700 px-3 py-2 text-xs text-white"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                setActionMsg(null);
                try {
                  const res = await fetch(`/api/admin/conditions/${c.id}`, {
                    method: "DELETE",
                  });
                  if (!res.ok) throw new Error();
                  router.refresh();
                } catch {
                  setActionMsg("Cannot delete a condition that has participants.");
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting..." : "Confirm delete"}
            </button>
            <button type="button" disabled={deleting} className={btnGhostCls} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="text-xs text-red-600 hover:underline"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        )}
        {msg && <span className="text-xs text-gray-500">{msg}</span>}
      </div>
    </div>
  );
}

function SurveyBuilder({
  value,
  onChange,
}: {
  value: SurveyQuestion[];
  onChange: (q: SurveyQuestion[]) => void;
}) {
  const update = (i: number, patch: Partial<SurveyQuestion>) =>
    onChange(value.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {value.map((q, i) => (
        <div key={`${q.id}-${i}`} className="rounded-lg border border-gray-200 p-3 text-xs">
          <div className="flex flex-wrap gap-2">
            <input
              value={q.id}
              onChange={(e) => update(i, { id: e.target.value })}
              className="w-28 rounded border border-gray-200 px-2 py-1 font-mono"
              placeholder="id"
            />
            <select
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as SurveyQuestion["type"];
                update(i, {
                  type,
                  options: type === "choice" ? ["Option 1", "Option 2"] : undefined,
                });
              }}
              className="rounded border border-gray-200 px-2 py-1"
            >
              {SURVEY_QUESTION_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={q.required ?? false}
                onChange={(e) => update(i, { required: e.target.checked })}
              />
              required
            </label>
            <span className="flex-1" />
            <button
              type="button"
              aria-label={`Move ${q.id || `question ${i + 1}`} up`}
              title="Move up"
              disabled={i === 0}
              className="disabled:opacity-30"
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${q.id || `question ${i + 1}`} down`}
              title="Move down"
              disabled={i === value.length - 1}
              className="disabled:opacity-30"
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="text-red-600"
              aria-label={`Remove ${q.id || `question ${i + 1}`}`}
              title="Remove question"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
          <input
            value={q.prompt}
            onChange={(e) => update(i, { prompt: e.target.value })}
            className={`mt-2 ${inputCls}`}
            placeholder="Question prompt"
          />
          {q.type === "choice" && (
            <input
              value={(q.options ?? []).join(", ")}
              onChange={(e) =>
                update(i, {
                  options: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className={`mt-2 ${inputCls}`}
              placeholder="Options, comma-separated"
            />
          )}
        </div>
      ))}
      <button
        type="button"
        className={btnGhostCls}
        onClick={() =>
          onChange([
            ...value,
            { id: `q${value.length + 1}`, type: "likert5", prompt: "", required: true },
          ])
        }
      >
        Add question
      </button>
    </div>
  );
}

export function ExperimentEditor({
  experiment,
  readiness,
}: {
  experiment: ExperimentData;
  readiness: LaunchIssue[];
}) {
  const router = useRouter();
  const [e, setE] = useState(experiment);
  const [origin, setOrigin] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [conditionBusy, setConditionBusy] = useState(false);
  const [conditionMsg, setConditionMsg] = useState<string | null>(null);
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const [dangerMsg, setDangerMsg] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const basics = useSave();
  const pages = useSave();
  const survey = useSave();
  const set = <K extends keyof ExperimentData>(k: K, v: ExperimentData[K]) =>
    setE((prev) => ({ ...prev, [k]: v }));

  useEffect(() => setOrigin(window.location.origin), []);

  const joinPath = `/exp/${experiment.slug}/welcome`;
  const joinUrl = origin ? `${origin}${joinPath}` : joinPath;

  const copyUrl = async (url: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement("textarea");
        input.value = url;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("copy_failed");
      }
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl(null), 1600);
    } catch {
      setCopiedUrl("error");
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">{experiment.name}</h1>
        <StatusBadge status={experiment.status} />
      </div>

      <Card title="Launch readiness">
        {readiness.length === 0 ? (
          <p className="text-sm font-medium text-green-700">Ready for pilot or launch.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
            {readiness.map((issue) => (
              <li key={`${issue.code}-${issue.conditionId ?? "experiment"}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Basics" right={<span className="text-xs text-gray-400">{basics.msg}</span>}>
        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <label className="block text-gray-600">
            Name
            <input value={e.name} onChange={(ev) => set("name", ev.target.value)} className={`mt-1 ${inputCls}`} />
          </label>
          <label className="block text-gray-600">
            Status
            <select
              value={e.status}
              onChange={(ev) => set("status", ev.target.value)}
              className={`mt-1 ${inputCls}`}
            >
              {EXPERIMENT_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-gray-400">
              {STATUS_HELP[e.status]}
            </span>
          </label>
          <label className="block text-gray-600">
            Assignment
            <select
              value={e.assignmentMethod}
              onChange={(ev) => set("assignmentMethod", ev.target.value)}
              className={`mt-1 ${inputCls}`}
            >
              {ASSIGNMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block text-gray-600">
            Target sample size
            <input
              type="number"
              min={1}
              max={1000000}
              value={e.targetSampleSize ?? ""}
              onChange={(ev) =>
                set(
                  "targetSampleSize",
                  ev.target.value ? parseInt(ev.target.value, 10) : null
                )
              }
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="block text-gray-600">
            Resume window (hours)
            <input
              type="number"
              min={1}
              max={24 * 30}
              value={e.resumeWindowHours}
              onChange={(ev) =>
                set("resumeWindowHours", parseInt(ev.target.value, 10) || 24)
              }
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="block text-gray-600">
            Description (internal)
            <input
              value={e.description}
              onChange={(ev) => set("description", ev.target.value)}
              className={`mt-1 ${inputCls}`}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={basics.saving}
          className={`mt-4 ${btnCls}`}
          onClick={() =>
            basics.save(`/api/admin/experiments/${e.id}`, "PATCH", {
              name: e.name,
              status: e.status,
              assignmentMethod: e.assignmentMethod,
              targetSampleSize: e.targetSampleSize,
              resumeWindowHours: e.resumeWindowHours,
              description: e.description,
            })
          }
        >
          Save basics
        </button>
      </Card>

      <Card title="Join links">
        <div className="space-y-2 text-xs">
          {[joinUrl, `${joinUrl}?PROLIFIC_PID={{%PROLIFIC_PID%}}`].map((url) => (
            <div key={url} className="flex flex-wrap items-center gap-2">
              <code className="flex-1 truncate rounded bg-gray-50 px-2 py-1.5">{url}</code>
              <button
                type="button"
                className={btnGhostCls}
                onClick={() => void copyUrl(url)}
              >
                {copiedUrl === url ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
          {copiedUrl === "error" && (
            <p className="text-red-600">The link could not be copied.</p>
          )}
        </div>
      </Card>

      <Card
        title="Conditions"
        right={
          <button
            type="button"
            className={btnGhostCls}
            disabled={conditionBusy}
            onClick={async () => {
              setConditionBusy(true);
              setConditionMsg(null);
              try {
                const res = await fetch(`/api/admin/experiments/${e.id}/conditions`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({}),
                });
                if (!res.ok) throw new Error();
                router.refresh();
              } catch {
                setConditionMsg("Condition could not be added.");
              } finally {
                setConditionBusy(false);
              }
            }}
          >
            {conditionBusy ? "Adding..." : "Add condition"}
          </button>
        }
      >
        {conditionMsg && <p className="mb-3 text-sm text-red-600">{conditionMsg}</p>}
        <div className="space-y-4">
          {experiment.conditions.map((c) => (
            <ConditionCard
              key={c.id}
              condition={c}
              sets={experiment.contentSets}
              experimentId={e.id}
            />
          ))}
          {experiment.conditions.length === 0 && (
            <p className="text-sm text-gray-400">No conditions yet.</p>
          )}
        </div>
      </Card>

      <Card
        title={`Pages (consent v${experiment.consentVersion})`}
        right={<span className="text-xs text-gray-400">{pages.msg}</span>}
      >
        <label className="block text-xs text-gray-600">
          Welcome / consent (Markdown) — editing after launch bumps the consent version
          <textarea
            value={e.welcomeContent}
            onChange={(ev) => set("welcomeContent", ev.target.value)}
            rows={8}
            className={`mt-1 ${inputCls} font-mono text-[12px]`}
          />
        </label>
        <label className="mt-3 block text-xs text-gray-600">
          Completion / debrief (Markdown)
          <textarea
            value={e.completionContent}
            onChange={(ev) => set("completionContent", ev.target.value)}
            rows={6}
            className={`mt-1 ${inputCls} font-mono text-[12px]`}
          />
        </label>
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <label className="block text-gray-600">
            Redirect URL (Prolific)
            <input
              value={e.completionRedirectUrl ?? ""}
              onChange={(ev) => set("completionRedirectUrl", ev.target.value || null)}
              className={`mt-1 ${inputCls}`}
              placeholder="https://app.prolific.com/submissions/complete?cc=..."
            />
          </label>
          <label className="block text-gray-600">
            Completion code (fallback)
            <input
              value={e.completionCode ?? ""}
              onChange={(ev) => set("completionCode", ev.target.value || null)}
              className={`mt-1 ${inputCls}`}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={pages.saving}
          className={`mt-4 ${btnCls}`}
          onClick={() =>
            pages.save(`/api/admin/experiments/${e.id}`, "PATCH", {
              welcomeContent: e.welcomeContent,
              completionContent: e.completionContent,
              completionRedirectUrl: e.completionRedirectUrl,
              completionCode: e.completionCode,
            })
          }
        >
          Save pages
        </button>
      </Card>

      <Card
        title="Post-feed survey"
        right={<span className="text-xs text-gray-400">{survey.msg}</span>}
      >
        <SurveyBuilder
          value={e.surveyJson ?? []}
          onChange={(q) => set("surveyJson", q)}
        />
        <button
          type="button"
          disabled={survey.saving}
          className={`mt-4 ${btnCls}`}
          onClick={() =>
            survey.save(`/api/admin/experiments/${e.id}`, "PATCH", {
              surveyJson: e.surveyJson && e.surveyJson.length > 0 ? e.surveyJson : null,
            })
          }
        >
          Save survey
        </button>
      </Card>

      <Card title="Danger zone">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={btnGhostCls}
            disabled={duplicateBusy}
            onClick={async () => {
              setDuplicateBusy(true);
              setDangerMsg(null);
              try {
                const res = await fetch(`/api/admin/experiments/${e.id}/duplicate`, {
                  method: "POST",
                });
                if (!res.ok) throw new Error();
                const { id } = await res.json();
                router.push(`/admin/experiments/${id}`);
              } catch {
                setDangerMsg("Experiment could not be duplicated.");
                setDuplicateBusy(false);
              }
            }}
          >
            {duplicateBusy ? "Duplicating..." : "Duplicate"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            disabled={deleteBusy}
            onClick={() => {
              setShowDelete((shown) => !shown);
              setDeleteConfirm("");
              setDangerMsg(null);
            }}
          >
            Delete
          </button>
        </div>
        {showDelete && (
          <div className="mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 p-3">
            <label className="block text-xs text-red-800">
              Type <strong>{experiment.slug}</strong> to delete the experiment and all its data.
              <input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                className={`mt-2 ${inputCls}`}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={deleteBusy || deleteConfirm !== experiment.slug}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                onClick={async () => {
                  setDeleteBusy(true);
                  setDangerMsg(null);
                  try {
                    const res = await fetch(`/api/admin/experiments/${e.id}`, {
                      method: "DELETE",
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error);
                    router.push("/admin/experiments");
                  } catch {
                    setDangerMsg(
                      "Only draft or archived experiments can be deleted. Archive it first."
                    );
                    setDeleteBusy(false);
                  }
                }}
              >
                {deleteBusy ? "Deleting..." : "Delete permanently"}
              </button>
              <button
                type="button"
                className={btnGhostCls}
                disabled={deleteBusy}
                onClick={() => setShowDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {dangerMsg && <p className="mt-3 text-sm text-red-600">{dangerMsg}</p>}
      </Card>
    </div>
  );
}
