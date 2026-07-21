import test from "node:test";
import assert from "node:assert/strict";
import { isBlockedDemoAdminMutation } from "../src/lib/demoMode";

test("public demo blocks admin mutations but permits reads", () => {
  assert.equal(isBlockedDemoAdminMutation("/api/admin/content/item", "DELETE", true), true);
  assert.equal(isBlockedDemoAdminMutation("/api/admin/experiments", "POST", true), true);
  assert.equal(isBlockedDemoAdminMutation("/api/admin/participants", "GET", true), false);
});

test("public demo keeps login and logout available", () => {
  assert.equal(isBlockedDemoAdminMutation("/api/admin/auth/login", "POST", true), false);
  assert.equal(isBlockedDemoAdminMutation("/api/admin/auth/logout", "POST", true), false);
});

test("normal deployments keep admin mutations available", () => {
  assert.equal(isBlockedDemoAdminMutation("/api/admin/content/item", "PATCH", false), false);
});
