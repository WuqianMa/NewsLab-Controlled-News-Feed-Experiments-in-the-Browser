import test from "node:test";
import assert from "node:assert/strict";
import { assignCondition, materializeFeedOrder } from "../src/lib/assignment";

const conditions = [
  { id: "a", weight: 1, createdAt: new Date("2024-01-01") },
  { id: "b", weight: 1, createdAt: new Date("2024-01-02") },
];

test("sequential assignment follows stable creation order", () => {
  assert.equal(assignCondition("sequential", conditions, new Map(), 0).id, "a");
  assert.equal(assignCondition("sequential", conditions, new Map(), 3).id, "b");
});

test("balanced assignment selects the underrepresented condition", () => {
  const counts = new Map([
    ["a", 5],
    ["b", 1],
  ]);
  assert.equal(assignCondition("balanced", conditions, counts, 6).id, "b");
});

test("assignment rejects experiments without conditions", () => {
  assert.throws(() => assignCondition("random", [], new Map(), 0));
});

test("feed order excludes unapproved items and respects limits", () => {
  const items = [
    { id: "old", approved: true, publishedAt: new Date("2024-01-01") },
    { id: "hidden", approved: false, publishedAt: new Date("2024-03-01") },
    { id: "new", approved: true, publishedAt: new Date("2024-02-01") },
  ];
  assert.deepEqual(materializeFeedOrder("fixed", 1, items), ["old"]);
  assert.deepEqual(materializeFeedOrder("reverse_chronological", null, items), [
    "new",
    "old",
  ]);
});
