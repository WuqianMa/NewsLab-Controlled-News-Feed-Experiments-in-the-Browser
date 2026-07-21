import test from "node:test";
import assert from "node:assert/strict";
import {
  endParticipantSession,
  readParticipantState,
  writeParticipantState,
} from "../src/lib/participantState";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function installBrowserMocks() {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: new MemoryStorage(),
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
}

test("terminal delivery retries one idempotent event before marking ended", async () => {
  installBrowserMocks();
  const requestBodies: string[] = [];
  let online = false;
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async (_url: string, init?: RequestInit) => {
      requestBodies.push(String(init?.body));
      if (!online) throw new Error("offline");
      return new Response(null, { status: 202 });
    },
  });

  writeParticipantState("study", {
    participant_id: "participant",
    session_id: "session",
    has_survey: false,
    session_started_at: "2024-01-01T00:00:00.000Z",
    deadline_at: null,
  });

  assert.equal(await endParticipantSession("study", { reason: "continue" }), false);
  const failed = readParticipantState("study");
  assert.equal(failed?.ended, undefined);
  assert.ok(failed?.end_event_id);

  online = true;
  assert.equal(await endParticipantSession("study", { reason: "retry" }), true);
  assert.equal(readParticipantState("study")?.ended, true);

  const firstId = JSON.parse(requestBodies[0]).events[0].id;
  const retryId = JSON.parse(requestBodies[1]).events[0].id;
  assert.equal(firstId, retryId);
  assert.equal(JSON.parse(requestBodies[1]).events.length, 1);
});
