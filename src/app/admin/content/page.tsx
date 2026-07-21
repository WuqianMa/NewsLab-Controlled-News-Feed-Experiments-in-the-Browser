"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { inputCls, btnCls, btnGhostCls, Card } from "@/components/admin/ui";

interface Item {
  id: string;
  title: string;
  body: string;
  snippet: string;
  sourceName: string;
  thumbnailUrl: string | null;
  category: string;
  publishedAt: string;
  isFiller: boolean;
  sourceItemId: string | null;
  variantType: string | null;
  approved: boolean;
  fakeLikes: number | null;
  fakeComments: number | null;
  fakeViews: number | null;
  setItems: { contentSet: { name: string } }[];
  sourceItem: { title: string } | null;
  _count: { variants: number };
}

interface SetData {
  id: string;
  name: string;
  experiment: { id: string; name: string; slug: string };
  conditions: { id: string; label: string }[];
  items: {
    position: number;
    contentItem: {
      id: string;
      title: string;
      sourceName: string;
      variantType: string | null;
      isFiller: boolean;
      approved: boolean;
    };
  }[];
}

const IMPORT_EXAMPLE = `{"items": [
  {"title": "Headline", "body": "Full text…", "sourceName": "The Meridian Post",
   "snippet": "Preview…", "category": "politics", "isFiller": false,
   "fakeLikes": 120, "thumbnailUrl": null}
]}`;

function useDebouncedValue<T>(value: T, delayMs = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

function ItemEditor({
  item,
  onDone,
}: {
  item: Item;
  onDone: () => void;
}) {
  const [d, setD] = useState({ ...item });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k: string, v: unknown) => setD((p) => ({ ...p, [k]: v }));

  const save = async (extra?: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/content/${item.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: d.title,
          snippet: d.snippet,
          body: d.body,
          sourceName: d.sourceName,
          category: d.category,
          thumbnailUrl: d.thumbnailUrl || null,
          isFiller: d.isFiller,
          fakeLikes: d.fakeLikes,
          fakeComments: d.fakeComments,
          fakeViews: d.fakeViews,
          ...extra,
        }),
      });
      if (!res.ok) throw new Error();
      onDone();
    } catch {
      setMsg("The item could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-gray-100 bg-gray-50 p-4 text-xs">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-gray-600 sm:col-span-2">
          Title
          <input value={d.title} onChange={(e) => set("title", e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-gray-600">
          Source name
          <input value={d.sourceName} onChange={(e) => set("sourceName", e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-gray-600">
          Category
          <input value={d.category} onChange={(e) => set("category", e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-gray-600 sm:col-span-2">
          Snippet
          <input value={d.snippet} onChange={(e) => set("snippet", e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-gray-600 sm:col-span-2">
          Body (Markdown)
          <textarea value={d.body} onChange={(e) => set("body", e.target.value)} rows={8} className={`mt-1 ${inputCls} font-mono text-[11px]`} />
        </label>
        <label className="block text-gray-600">
          Thumbnail URL (or data URI; empty = text-only card)
          <input value={d.thumbnailUrl ?? ""} onChange={(e) => set("thumbnailUrl", e.target.value)} className={`mt-1 ${inputCls}`} />
        </label>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-1.5 text-gray-600">
            <input type="checkbox" checked={d.isFiller} onChange={(e) => set("isFiller", e.target.checked)} />
            Filler (not measured)
          </label>
        </div>
        {(["fakeLikes", "fakeComments", "fakeViews"] as const).map((k) => (
          <label key={k} className="block text-gray-600">
            {k.replace("fake", "Fake ")}
            <input
              type="number"
              min={0}
              max={1000000000}
              value={(d[k] as number | null) ?? ""}
              onChange={(e) => set(k, e.target.value ? parseInt(e.target.value, 10) : null)}
              className={`mt-1 ${inputCls}`}
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} className={btnCls} onClick={() => save()}>
          {busy ? "Saving..." : "Save"}
        </button>
        {!item.approved && (
          <button
            type="button"
            disabled={busy}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white"
            onClick={() => save({ approved: true })}
          >
            Save & approve
          </button>
        )}
        {confirmDelete ? (
          <>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-red-700 px-3 py-2 text-white"
              onClick={async () => {
                setBusy(true);
                setMsg(null);
                try {
                  const res = await fetch(`/api/admin/content/${item.id}`, { method: "DELETE" });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.detail ?? data.error);
                  onDone();
                } catch (caught) {
                  setMsg((caught as Error).message || "The item could not be deleted.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirm delete
            </button>
            <button type="button" disabled={busy} className={btnGhostCls} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="text-red-600 hover:underline"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        )}
        {msg && <span className="text-gray-500">{msg}</span>}
      </div>
    </div>
  );
}

function Library({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ title: "", body: "", sourceName: "", category: "general", snippet: "" });
  const debouncedQ = useDebouncedValue(q);

  const load = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set("q", debouncedQ);
    if (type) params.set("type", type);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/content?${params}`, { signal });
      if (!res.ok) throw new Error();
      setItems((await res.json()).items);
      setError(null);
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") setError("Content could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [debouncedQ, type]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refreshKey]);

  return (
    <Card
      title={`Library (${items.length})`}
      right={
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhostCls} onClick={() => setShowImport((s) => !s)}>
            Import JSON
          </button>
          <button type="button" className={btnCls} onClick={() => setShowNew((s) => !s)}>
            New article
          </button>
        </div>
      }
    >
      {showNew && (
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 text-xs sm:grid-cols-2">
          <input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={`sm:col-span-2 ${inputCls}`} />
          <input placeholder="Source name" value={draft.sourceName} onChange={(e) => setDraft({ ...draft, sourceName: e.target.value })} className={inputCls} />
          <input placeholder="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={inputCls} />
          <input placeholder="Snippet" value={draft.snippet} onChange={(e) => setDraft({ ...draft, snippet: e.target.value })} className={`sm:col-span-2 ${inputCls}`} />
          <textarea placeholder="Body (Markdown)" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6} className={`sm:col-span-2 ${inputCls} font-mono text-[11px]`} />
          <div>
            <button
              type="button"
              className={btnCls}
              disabled={creating || !draft.title.trim() || !draft.body.trim() || !draft.sourceName.trim()}
              onClick={async () => {
                setCreating(true);
                try {
                  const res = await fetch("/api/admin/content", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(draft),
                  });
                  if (!res.ok) throw new Error();
                  setShowNew(false);
                  setDraft({ title: "", body: "", sourceName: "", category: "general", snippet: "" });
                  void load();
                  onChanged();
                } catch {
                  setError("Check the required article fields and try again.");
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <div className="mb-4 rounded-lg border border-gray-200 p-4 text-xs">
          <details className="mb-2 text-gray-500">
            <summary className="cursor-pointer">Expected JSON shape</summary>
            <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2">{IMPORT_EXAMPLE}</pre>
          </details>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            placeholder='{"items": [...]}'
            className={`${inputCls} font-mono text-[11px]`}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className={btnCls}
              disabled={importing || !importText.trim()}
              onClick={async () => {
                let parsed: unknown;
                try {
                  parsed = JSON.parse(importText);
                } catch {
                  setImportResult("Invalid JSON.");
                  return;
                }
                setImporting(true);
                try {
                  const res = await fetch("/api/admin/content/import", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(parsed),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error ?? "Import failed");
                  setImportResult(
                    `Created ${data.created}. ${data.errors.length ? `Errors: ${data.errors.map((entry: { index: number; message: string }) => `row ${entry.index}: ${entry.message}`).join(" | ")}` : ""}`
                  );
                  await load();
                  onChanged();
                } catch (caught) {
                  setImportResult(`Failed: ${(caught as Error).message}`);
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? "Importing..." : "Import"}
            </button>
            {importResult && <span className="text-gray-600">{importResult}</span>}
          </div>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          placeholder="Search titles…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={`${inputCls} max-w-xs`}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} max-w-[160px]`}>
          <option value="">All items</option>
          <option value="original">Originals</option>
          <option value="variant">Variants</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-[680px] w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Sets</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  Loading content...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No matching content.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <Fragment key={item.id}>
                <tr
                  className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                  onClick={() => setOpenId(openId === item.id ? null : item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setOpenId(openId === item.id ? null : item.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td className="max-w-md truncate px-3 py-2">
                    {item.title}
                    {item.isFiller && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">filler</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{item.sourceName}</td>
                  <td className="px-3 py-2 text-xs">
                    {!item.approved ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">⏳ pending review</span>
                    ) : item.variantType ? (
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-800">{item.variantType}</span>
                    ) : (
                      <span className="text-gray-400">original{item._count.variants > 0 ? ` (+${item._count.variants} var.)` : ""}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">
                    {item.setItems.map((s) => s.contentSet.name).join(", ") || "—"}
                  </td>
                </tr>
                {openId === item.id && (
                  <tr key={`${item.id}-editor`}>
                    <td colSpan={4}>
                      <ItemEditor
                        item={item}
                        onDone={() => {
                          setOpenId(null);
                          void load();
                          onChanged();
                        }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SetsManager({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [sets, setSets] = useState<SetData[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [order, setOrder] = useState<SetData["items"][number]["contentItem"][]>([]);
  const [dirty, setDirty] = useState(false);
  const [library, setLibrary] = useState<Item[]>([]);
  const [libQ, setLibQ] = useState("");
  const [experiments, setExperiments] = useState<{ id: string; name: string }[]>([]);
  const [showNewSet, setShowNewSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetExperiment, setNewSetExperiment] = useState("");
  const [setBusy, setSetBusy] = useState(false);
  const [setMsg, setSetMsg] = useState<string | null>(null);
  const debouncedLibQ = useDebouncedValue(libQ);

  const load = useCallback(async () => {
    try {
      const [res, exps] = await Promise.all([
        fetch("/api/admin/sets"),
        fetch("/api/admin/experiments"),
      ]);
      if (!res.ok || !exps.ok) throw new Error();
      setSets((await res.json()).sets);
      const loaded = (await exps.json()).experiments;
      setExperiments(loaded);
      setNewSetExperiment((current) => current || loaded[0]?.id || "");
    } catch {
      setSetMsg("Content sets could not be loaded.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    const s = sets.find((x) => x.id === selected);
    setOrder(s ? s.items.map((i) => i.contentItem) : []);
    setDirty(false);
  }, [selected, sets]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const params = new URLSearchParams({ approved: "true" });
      if (debouncedLibQ) params.set("q", debouncedLibQ);
      try {
        const res = await fetch(`/api/admin/content?${params}`, {
          signal: controller.signal,
        });
        if (res.ok) setLibrary((await res.json()).items);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setSetMsg("Approved content could not be loaded.");
        }
      }
    })();
    return () => controller.abort();
  }, [debouncedLibQ, refreshKey]);

  const current = sets.find((s) => s.id === selected);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    setDirty(true);
  };

  return (
    <Card
      title="Content sets"
      right={
        <button
          type="button"
          className={btnGhostCls}
          onClick={() => setShowNewSet((shown) => !shown)}
        >
          New set
        </button>
      }
    >
      {showNewSet && (
        <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs text-gray-600">
            Set name
            <input
              value={newSetName}
              onChange={(event) => setNewSetName(event.target.value)}
              className={`mt-1 ${inputCls}`}
            />
          </label>
          <label className="text-xs text-gray-600">
            Experiment
            <select
              value={newSetExperiment}
              onChange={(event) => setNewSetExperiment(event.target.value)}
              className={`mt-1 ${inputCls}`}
            >
              {experiments.map((experiment) => (
                <option key={experiment.id} value={experiment.id}>
                  {experiment.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`${btnCls} self-end`}
            disabled={setBusy || !newSetName.trim() || !newSetExperiment}
            onClick={async () => {
              setSetBusy(true);
              setSetMsg(null);
              try {
                const res = await fetch("/api/admin/sets", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    name: newSetName,
                    experiment_id: newSetExperiment,
                  }),
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                setNewSetName("");
                setShowNewSet(false);
                setSetMsg("Set created.");
                await load();
                setSelected(data.id);
              } catch {
                setSetMsg("Set could not be created.");
              } finally {
                setSetBusy(false);
              }
            }}
          >
            {setBusy ? "Creating..." : "Create"}
          </button>
        </div>
      )}
      {setMsg && <p className="mb-3 text-xs text-gray-600">{setMsg}</p>}
      <select
        value={selected ?? ""}
        onChange={(e) => setSelected(e.target.value || null)}
        className={`${inputCls} max-w-sm`}
      >
        <option value="">— choose a set —</option>
        {sets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.experiment.name} / {s.name} ({s.items.length})
          </option>
        ))}
      </select>

      {current && (
        <>
          <p className="mt-2 text-xs text-gray-500">
            Used by: {current.conditions.map((c) => c.label).join(", ") || "no conditions"} ·
            edits affect only future participants
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-600">In set (ordered)</p>
              <div className="space-y-1">
                {order.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5 text-xs"
                  >
                    <span className="w-5 text-gray-400">{i + 1}</span>
                    <span className="flex-1 truncate">
                      {item.title}
                      {item.variantType && (
                        <span className="ml-1 text-purple-600">[{item.variantType}]</span>
                      )}
                      {item.isFiller && <span className="ml-1 text-gray-400">[filler]</span>}
                    </span>
                    <button
                      type="button"
                      aria-label={`Move ${item.title} up`}
                      title="Move up"
                      disabled={i === 0}
                      className="disabled:opacity-30"
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.title} down`}
                      title="Move down"
                      disabled={i === order.length - 1}
                      className="disabled:opacity-30"
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-red-500"
                      aria-label={`Remove ${item.title} from set`}
                      title="Remove from set"
                      onClick={() => {
                        setOrder(order.filter((_, j) => j !== i));
                        setDirty(true);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {order.length === 0 && <p className="text-xs text-gray-400">Empty set.</p>}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-600">Add from library (approved only)</p>
              <input
                placeholder="Search…"
                value={libQ}
                onChange={(e) => setLibQ(e.target.value)}
                className={`${inputCls} mb-2`}
              />
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {library
                  .filter((l) => !order.some((o) => o.id === l.id))
                  .map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center gap-2 rounded border border-gray-100 px-2 py-1.5 text-xs"
                    >
                      <span className="flex-1 truncate">
                        {l.title}
                        {l.variantType && <span className="ml-1 text-purple-600">[{l.variantType}]</span>}
                      </span>
                      <button
                        type="button"
                        className="text-blue-700"
                        onClick={() => {
                          setOrder([
                            ...order,
                            {
                              id: l.id,
                              title: l.title,
                              sourceName: l.sourceName,
                              variantType: l.variantType,
                              isFiller: l.isFiller,
                              approved: l.approved,
                            },
                          ]);
                          setDirty(true);
                        }}
                      >
                        ← add
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          {dirty && (
            <div className="sticky bottom-2 mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">
              Unsaved order changes
              <button
                type="button"
                disabled={setBusy}
                className="rounded bg-white px-3 py-1 text-xs font-medium text-gray-900"
                onClick={async () => {
                  setSetBusy(true);
                  setSetMsg(null);
                  try {
                    const res = await fetch(`/api/admin/sets/${current.id}/items`, {
                      method: "PUT",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ item_ids: order.map((item) => item.id) }),
                    });
                    if (!res.ok) throw new Error();
                    setDirty(false);
                    setSetMsg("Set order saved.");
                    await load();
                    onChanged();
                  } catch {
                    setSetMsg("Set order could not be saved. Check that every item is approved.");
                  } finally {
                    setSetBusy(false);
                  }
                }}
              >
                {setBusy ? "Saving..." : "Save order"}
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function ContentPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);
  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="text-xl font-bold">Content</h1>
      <Library refreshKey={refreshKey} onChanged={bump} />
      <SetsManager refreshKey={refreshKey} onChanged={bump} />
    </div>
  );
}
