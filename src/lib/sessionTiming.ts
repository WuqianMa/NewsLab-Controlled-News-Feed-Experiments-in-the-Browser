export function sessionDeadlineMs(
  startedAt: string | Date | number,
  timeLimitSeconds: number | null
): number | null {
  if (!timeLimitSeconds) return null;
  const started =
    typeof startedAt === "number" ? startedAt : new Date(startedAt).getTime();
  return started + timeLimitSeconds * 1000;
}

export function isSessionExpired(
  startedAt: string | Date | number,
  lastEventAt: string | Date | number | null,
  resumeWindowHours: number,
  nowMs = Date.now()
): boolean {
  const started =
    typeof startedAt === "number" ? startedAt : new Date(startedAt).getTime();
  const lastEvent =
    lastEventAt === null
      ? started
      : typeof lastEventAt === "number"
        ? lastEventAt
        : new Date(lastEventAt).getTime();
  return nowMs - Math.max(started, lastEvent) >= resumeWindowHours * 3600_000;
}
