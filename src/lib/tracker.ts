// Browser-side event capture (fable/04). Singleton buffer + flush loop.
// Rules that must not be simplified:
//  - every event gets a client-generated UUID (server dedups on it — retries safe)
//  - tab_id from sessionStorage (per-tab, survives refresh)
//  - flush on: 50 events | 5s tick | visibilitychange->hidden (beacon)
//  - failed flushes go back on the buffer AND mirror to sessionStorage
//  - tracking must never throw into the UI

export interface TrackedEvent {
  id: string;
  tab_id: string;
  event_type: string;
  payload?: Record<string, unknown>;
  client_timestamp: number;
}

export interface Checkpoint {
  scroll_position: number;
  last_card_index: number;
  elapsed_ms: number;
}

const LEGACY_PENDING_KEY = "nl_pending";
const TAB_KEY = "nl_tab";
const MAX_BUFFER = 500;

export const pendingStorageKey = (sessionId: string) =>
  `nl_pending_${sessionId}`;

export class Tracker {
  private buffer: TrackedEvent[] = [];
  private endpoint = "";
  private sessionId = "";
  private timer: number | null = null;
  private flushPromise: Promise<boolean> | null = null;
  private listenersBound = false;
  private checkpointProvider: (() => Checkpoint) | null = null;

  init(opts: { endpoint: string; sessionId: string }) {
    if (typeof window === "undefined") return;
    const sessionChanged = this.sessionId !== opts.sessionId;
    if (this.sessionId && this.sessionId !== opts.sessionId && this.buffer.length) {
      this.persist(this.sessionId);
      this.buffer = [];
    }
    this.endpoint = opts.endpoint;
    this.sessionId = opts.sessionId;
    try {
      sessionStorage.removeItem(LEGACY_PENDING_KEY);
      if (sessionChanged) {
        const key = pendingStorageKey(this.sessionId);
        const pending = sessionStorage.getItem(key);
        if (pending) {
          const events = JSON.parse(pending) as TrackedEvent[];
          if (Array.isArray(events)) this.buffer.push(...events.slice(0, 100));
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      /* tracking must never throw */
    }
    if (this.timer === null) {
      this.timer = window.setInterval(() => {
        if (this.buffer.length > 0) void this.flush();
      }, 5000);
    }
    if (!this.listenersBound) {
      this.listenersBound = true;
      document.addEventListener("visibilitychange", () => {
        const visible = document.visibilityState === "visible";
        const payload: Record<string, unknown> = { visible };
        if (!visible && this.checkpointProvider) {
          try {
            payload.checkpoint = this.checkpointProvider();
          } catch {
            /* ignore */
          }
        }
        this.track("page_visibility_changed", payload);
        if (!visible) this.flush({ useBeacon: true });
      });
      window.addEventListener("pagehide", () => {
        this.flush({ useBeacon: true });
      });
    }
  }

  get ready() {
    return this.endpoint !== "" && this.sessionId !== "";
  }

  get currentSessionId() {
    return this.sessionId;
  }

  getTabId(): string {
    try {
      let t = sessionStorage.getItem(TAB_KEY);
      if (!t) {
        t = crypto.randomUUID();
        sessionStorage.setItem(TAB_KEY, t);
      }
      return t;
    } catch {
      return "";
    }
  }

  registerCheckpointProvider(fn: (() => Checkpoint) | null) {
    this.checkpointProvider = fn;
  }

  track(
    eventType: string,
    payload?: Record<string, unknown>,
    eventId = crypto.randomUUID()
  ): string | null {
    try {
      if (typeof window === "undefined" || !this.ready) return null;
      this.buffer.push({
        id: eventId,
        tab_id: this.getTabId(),
        event_type: eventType,
        payload,
        client_timestamp: Date.now(),
      });
      if (this.buffer.length > MAX_BUFFER) {
        this.buffer.splice(0, this.buffer.length - MAX_BUFFER);
      }
      if (this.buffer.length >= 50) void this.flush();
      return eventId;
    } catch {
      /* tracking must never throw */
      return null;
    }
  }

  hasBufferedEvent(eventId: string) {
    return this.buffer.some((event) => event.id === eventId);
  }

  async flush(opts: { useBeacon?: boolean } = {}): Promise<boolean> {
    try {
      if (!this.ready) return false;
      if (this.flushPromise) {
        const previous = await this.flushPromise;
        if (!previous) return false;
        return this.flush(opts);
      }
      if (this.buffer.length === 0) return true;
      const batch = this.buffer.splice(0, this.buffer.length);
      const json = JSON.stringify({ session_id: this.sessionId, events: batch });

      const send = async () => {
        if (opts.useBeacon) {
          let queued = false;
          try {
            queued = navigator.sendBeacon(
              this.endpoint,
              new Blob([json], { type: "application/json" })
            );
          } catch {
            queued = false;
          }
          if (queued) {
            this.clearPersisted();
            return true;
          }
        }
        try {
          const response = await fetch(this.endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: json,
            keepalive: opts.useBeacon,
          });
          if (response.ok) {
            this.clearPersisted();
            return true;
          }
        } catch {
          /* restore below */
        }
        this.restore(batch);
        return false;
      };

      this.flushPromise = send().finally(() => {
        this.flushPromise = null;
      });
      return await this.flushPromise;
    } catch {
      return false;
    }
  }

  private persist(sessionId = this.sessionId) {
    if (!sessionId || this.buffer.length === 0) return;
    try {
      sessionStorage.setItem(
        pendingStorageKey(sessionId),
        JSON.stringify(this.buffer.slice(0, 100))
      );
    } catch {
      /* ignore */
    }
  }

  private clearPersisted(sessionId = this.sessionId) {
    if (!sessionId) return;
    try {
      sessionStorage.removeItem(pendingStorageKey(sessionId));
    } catch {
      /* ignore */
    }
  }

  // Retry is safe: event ids make server ingestion idempotent (fable/04).
  private restore(batch: TrackedEvent[]) {
    this.buffer.unshift(...batch);
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer.splice(0, this.buffer.length - MAX_BUFFER);
    }
    this.persist();
  }
}

export const tracker = new Tracker();
