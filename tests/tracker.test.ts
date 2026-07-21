import test from "node:test";
import assert from "node:assert/strict";
import { pendingStorageKey, Tracker } from "../src/lib/tracker";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function installBrowserMocks(storage: Storage) {
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      setInterval: () => 1,
      addEventListener: () => undefined,
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      visibilityState: "visible",
      addEventListener: () => undefined,
    },
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => new Response(null, { status: 503 }),
  });
}

test("failed events remain scoped to their original session", async () => {
  const storage = new MemoryStorage();
  installBrowserMocks(storage);
  const tracker = new Tracker();
  tracker.init({ endpoint: "/events", sessionId: "session-a" });
  tracker.track("feed_loaded", {}, "event-a");
  assert.equal(await tracker.flush(), false);
  assert.ok(storage.getItem(pendingStorageKey("session-a"))?.includes("event-a"));

  tracker.init({ endpoint: "/events", sessionId: "session-b" });
  assert.equal(tracker.hasBufferedEvent("event-a"), false);
  assert.ok(storage.getItem(pendingStorageKey("session-a"))?.includes("event-a"));

  const restored = new Tracker();
  restored.init({ endpoint: "/events", sessionId: "session-a" });
  assert.equal(restored.hasBufferedEvent("event-a"), true);
});
