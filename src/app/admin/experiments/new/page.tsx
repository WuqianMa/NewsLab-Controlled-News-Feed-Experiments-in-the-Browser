"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, btnCls } from "@/components/admin/ui";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export default function NewExperimentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/experiments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      router.push(`/admin/experiments/${data.id}`);
    } catch (caught) {
      setError(
        (caught as Error).message === "slug_taken"
          ? "That slug is already in use."
          : "Could not create the experiment. Check the fields and try again."
      );
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold">New experiment</h1>
      <form onSubmit={submit} className="mt-4 space-y-4 rounded-lg bg-white p-4 shadow-sm sm:p-6">
        <label className="block text-xs font-medium text-gray-600">
          Name
          <input
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className={`mt-1 ${inputCls}`}
          />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Slug (participant URL: /exp/&lt;slug&gt;/welcome)
          <input
            required
            value={slug}
            pattern="[a-z0-9][a-z0-9-]{1,80}"
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className={`mt-1 ${inputCls} font-mono`}
          />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Description (internal)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`mt-1 ${inputCls}`}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? "Creating…" : "Create draft"}
        </button>
      </form>
    </div>
  );
}
