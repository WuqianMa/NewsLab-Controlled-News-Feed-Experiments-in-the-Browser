const DEVELOPMENT_SECRET = "dev-secret-change-me";
const INSECURE_SECRETS = new Set([
  DEVELOPMENT_SECRET,
  "change-me-to-a-long-random-string-in-production",
]);

export function getAppSecret(): string {
  const value = process.env.APP_SECRET;
  if (
    process.env.NODE_ENV === "production" &&
    (!value || INSECURE_SECRETS.has(value) || value.length < 32)
  ) {
    throw new Error("APP_SECRET must be set to at least 32 characters in production");
  }
  return value || DEVELOPMENT_SECRET;
}

export function validateProductionEnvironment() {
  getAppSecret();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.TRUSTED_RATE_LIMIT_PROXY !== "true"
  ) {
    throw new Error(
      "TRUSTED_RATE_LIMIT_PROXY=true is required after configuring shared rate limiting"
    );
  }
}
