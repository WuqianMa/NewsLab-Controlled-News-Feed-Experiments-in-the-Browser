const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const DEMO_WRITE_EXCEPTIONS = [
  "/api/admin/auth/login",
  "/api/admin/auth/logout",
];

export function isPublicDemoMode(): boolean {
  return process.env.PUBLIC_DEMO_MODE === "true";
}

export function isBlockedDemoAdminMutation(
  pathname: string,
  method: string,
  enabled = isPublicDemoMode()
): boolean {
  if (!enabled || !pathname.startsWith("/api/admin/")) return false;
  if (DEMO_WRITE_EXCEPTIONS.some((path) => pathname.startsWith(path))) return false;
  return MUTATING_METHODS.has(method.toUpperCase());
}
