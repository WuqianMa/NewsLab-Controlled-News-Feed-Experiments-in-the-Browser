import test from "node:test";
import assert from "node:assert/strict";
import { csvEscape, toCsv } from "../src/lib/csv";
import { getAppSecret } from "../src/lib/env";
import { isSessionExpired, sessionDeadlineMs } from "../src/lib/sessionTiming";
import { safeMarkdownHref } from "../src/lib/markdown";

test("CSV output quotes commas, quotes, and newlines", () => {
  assert.equal(csvEscape('a,"b"'), '"a,""b"""');
  assert.equal(toCsv(["name"], [["line1\nline2"]]), 'name\r\n"line1\nline2"\r\n');
});

test("session deadlines remain anchored to the server start time", () => {
  const start = "2024-01-01T00:00:00.000Z";
  assert.equal(sessionDeadlineMs(start, 60), Date.parse(start) + 60_000);
  assert.equal(sessionDeadlineMs(start, null), null);
});

test("abandonment uses the most recent activity and resume window", () => {
  const start = Date.parse("2024-01-01T00:00:00.000Z");
  const recent = start + 30 * 60_000;
  assert.equal(isSessionExpired(start, recent, 1, start + 89 * 60_000), false);
  assert.equal(isSessionExpired(start, recent, 1, start + 91 * 60_000), true);
});

test("Markdown links allow safe schemes and reject executable URLs", () => {
  assert.equal(safeMarkdownHref("https://example.com"), "https://example.com");
  assert.equal(safeMarkdownHref("mailto:dpo@example.com"), "mailto:dpo@example.com");
  assert.equal(safeMarkdownHref("/privacy"), "/privacy");
  assert.equal(safeMarkdownHref("javascript:alert(1)"), null);
  assert.equal(safeMarkdownHref("//example.com"), null);
});

test("production rejects weak application secrets", () => {
  const previousEnv = process.env.NODE_ENV;
  const previousSecret = process.env.APP_SECRET;
  Reflect.set(process.env, "NODE_ENV", "production");
  Reflect.set(process.env, "APP_SECRET", "short");
  try {
    assert.throws(() => getAppSecret(), /at least 32 characters/);
  } finally {
    if (previousEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousEnv);
    if (previousSecret === undefined) Reflect.deleteProperty(process.env, "APP_SECRET");
    else Reflect.set(process.env, "APP_SECRET", previousSecret);
  }
});
