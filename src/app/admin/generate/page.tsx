"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, inputCls, btnCls, btnGhostCls } from "@/components/admin/ui";

interface Item {
  id: string;
  title: string;
  sourceName: string;
  category: string;
  body?: string;
}

interface PendingItem {
  id: string;
  title: string;
  body: string;
  snippet: string;
  variantType: string | null;
  sourceItem: { title: string } | null;
  sourceItemId: string | null;
  generationLogId: string | null;
}

interface TemplateInfo {
  name: string;
  label: string;
  description: string;
  variables: { key: string; label: string; options: string[] }[];
}

const TEMPLATES: TemplateInfo[] = [
  {
    name: "reframe_bias",
    label: "Reframe bias",
    description: "Rewrite with a political framing; facts unchanged.",
    variables: [
      { key: "direction", label: "Direction", options: ["left-leaning", "right-leaning", "neutral"] },
    ],
  },
  { name: "add_rebuttal", label: "Add rebuttal", description: "Append a labeled fact-check section.", variables: [] },
  {
    name: "simplify_language",
    label: "Simplify language",
    description: "Rewrite at a chosen reading level.",
    variables: [{ key: "level", label: "Reading level", options: ["elementary", "middle school", "general public"] }],
  },
  { name: "custom", label: "Custom prompt", description: "Your own instruction.", variables: [] },
];

function SideBySide({ item, onDone }: { item: PendingItem; onDone: () => void }) {
  const [original, setOriginal] = useState<Item | null>(null);
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [provenance, setProvenance] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`/api/admin/content/${item.id}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setOriginal(data.item.sourceItem);
        const log = data.item.generationLog;
        if (log) {
          setProvenance(
            `${log.llmProvider} · ${log.llmModel} · temp ${log.llmTemperature} · template ${log.templateName} · ${new Date(log.createdAt).toLocaleString()}`
          );
        }
        setError(null);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError("Variant details could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [item.id]);

  const act = async (payload: Record<string, unknown> | null, method = "PATCH") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/content/${item.id}`, {
        method,
        headers: { "content-type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      setError("The review action could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50 p-4 text-xs">
      {error && <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1 font-semibold text-gray-500">Original</p>
          <p className="font-bold">{original?.title ?? item.sourceItem?.title ?? "…"}</p>
          <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-gray-200 bg-white p-3">
            {loading ? "Loading..." : original?.body ?? "Original unavailable."}
          </div>
        </div>
        <div>
          <p className="mb-1 font-semibold text-gray-500">
            Generated <span className="text-purple-600">[{item.variantType}]</span> — editable
          </p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputCls} font-bold`} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`mt-2 ${inputCls} max-h-64 min-h-64 font-mono text-[11px]`}
          />
        </div>
      </div>
      {provenance && <p className="mt-2 text-gray-400">{provenance}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white"
          disabled={busy}
          onClick={() => act({ title, body, approved: true })}
        >
          {busy ? "Saving..." : "Approve"}
        </button>
        <button type="button" disabled={busy} className={btnGhostCls} onClick={() => act({ title, body })}>
          Save edits (keep pending)
        </button>
        {confirmDiscard ? (
          <>
            <button
              type="button"
              className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white"
              disabled={busy}
              onClick={() => void act(null, "DELETE")}
            >
              Confirm discard
            </button>
            <button type="button" className={btnGhostCls} disabled={busy} onClick={() => setConfirmDiscard(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600"
            disabled={busy}
            onClick={() => setConfirmDiscard(true)}
          >
            Discard
          </button>
        )}
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const [status, setStatus] = useState<{ provider: string; model: string; demo: boolean } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState("reframe_bias");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [customPrompt, setCustomPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPending = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/admin/content?approved=false&type=variant", {
      signal,
    });
    if (!res.ok) throw new Error("pending");
    setPending((await res.json()).items);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [statusRes, itemsRes] = await Promise.all([
          fetch("/api/admin/generate", { signal: controller.signal }),
          fetch("/api/admin/content?type=original", { signal: controller.signal }),
        ]);
        if (!statusRes.ok || !itemsRes.ok) throw new Error();
        setStatus(await statusRes.json());
        setItems((await itemsRes.json()).items);
        await loadPending(controller.signal);
        setError(null);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setError("Generation data could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [loadPending]);

  const tpl = TEMPLATES.find((t) => t.name === template)!;

  const run = async () => {
    setBusy(true);
    setLog([`Generating ${selected.size} variant(s)…`]);
    try {
      const templateVariables = Object.fromEntries(
        tpl.variables.map((variable) => [
          variable.key,
          vars[variable.key] ?? variable.options[0],
        ])
      );
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source_item_ids: [...selected],
          template_name: template,
          variables:
            template === "custom"
              ? { custom_prompt: customPrompt }
              : templateVariables,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setLog(
        data.results.map(
          (result: { source_item_id: string; variant_item_id?: string; error?: string }) => {
            const source = items.find((item) => item.id === result.source_item_id);
            return result.error
              ? `Failed: ${source?.title ?? result.source_item_id}: ${result.error}`
              : `Created: ${source?.title ?? result.source_item_id}`;
          }
        )
      );
      setSelected(new Set());
      await loadPending();
    } catch (caught) {
      setLog([`Failed: ${(caught as Error).message}`]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="text-xl font-bold">Generate variants</h1>

      {loading && <p className="text-sm text-gray-500">Loading generation tools...</p>}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error} Reload the page to retry.
        </p>
      )}

      {status?.demo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Demo mode</strong> — no API key configured; output is placeholder text.
          Set <code>LLM_PROVIDER=anthropic</code> (or <code>openai</code>) and the matching
          API key in <code>.env</code> for real generation.
        </div>
      )}
      {status && !status.demo && (
        <p className="text-xs text-gray-500">
          Provider: {status.provider} · model: {status.model}
        </p>
      )}

      <Card title="1 · Pick source articles">
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {items.map((i) => (
            <label key={i.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(i.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(i.id);
                  else next.delete(i.id);
                  setSelected(next);
                }}
              />
              <span className="truncate">{i.title}</span>
              <span className="text-xs text-gray-400">({i.sourceName})</span>
            </label>
          ))}
          {!loading && items.length === 0 && (
            <p className="text-sm text-gray-400">No original articles available.</p>
          )}
        </div>
      </Card>

      <Card title="2 · Pick a transformation">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => {
                setTemplate(t.name);
                setVars({});
              }}
              className={`rounded-lg border p-3 text-left text-xs ${
                template === t.name
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <p className="font-semibold">{t.label}</p>
              <p className={`mt-1 ${template === t.name ? "text-gray-300" : "text-gray-500"}`}>
                {t.description}
              </p>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {tpl.variables.map((v) => (
            <label key={v.key} className="block text-xs text-gray-600">
              {v.label}
              <select
                value={vars[v.key] ?? v.options[0]}
                onChange={(e) => setVars({ ...vars, [v.key]: e.target.value })}
                className={`mt-1 ${inputCls}`}
              >
                {v.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          {template === "custom" && (
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Rewrite this article as if written 50 years in the future…"
              className={`${inputCls} w-full`}
            />
          )}
        </div>
      </Card>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          disabled={busy || selected.size === 0 || (template === "custom" && !customPrompt.trim())}
          className={btnCls}
          onClick={run}
        >
          {busy ? "Generating…" : `Generate (${selected.size})`}
        </button>
        <div className="text-xs text-gray-600" role="status">
          {log.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </div>

      <Card title={`Review queue (${pending.length})`}>
        {pending.length === 0 && (
          <p className="text-sm text-gray-400">Nothing pending review.</p>
        )}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          {pending.map((p) => (
            <div key={p.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 border-t border-gray-100 px-3 py-2 text-left text-sm first:border-0 hover:bg-gray-50"
                onClick={() => setOpenId(openId === p.id ? null : p.id)}
              >
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-800">
                  {p.variantType}
                </span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="hidden text-xs text-gray-400 sm:inline">
                  from: {p.sourceItem?.title?.slice(0, 40) ?? "?"}
                </span>
              </button>
              {openId === p.id && (
                <SideBySide
                  item={p}
                  onDone={() => {
                    setOpenId(null);
                    void loadPending().catch(() =>
                      setError("The review queue could not be refreshed.")
                    );
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
