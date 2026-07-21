import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eventBatchSchema, checkpointSchema } from "@/lib/schemas";
import type { Prisma } from "@prisma/client";

// Naive in-memory rate limit: 30 batches/min per session. Resets per process —
// fine for the prototype, replace for a public deployment (docs/DEPLOYMENT.md).
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function rateLimited(sessionId: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(sessionId);
  if (!b || now - b.windowStart > 60_000) {
    rateBuckets.set(sessionId, { count: 1, windowStart: now });
    return false;
  }
  b.count++;
  return b.count > 30;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // sendBeacon may deliver text/plain — always parse from raw text.
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = eventBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 });
  }
  const { session_id, events } = parsed.data;

  if (rateLimited(session_id)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const session = await prisma.session.findUnique({
    where: { id: session_id },
    include: { participant: { include: { experiment: true } } },
  });
  if (!session || session.participant.experiment.slug !== slug) {
    return NextResponse.json({ error: "unknown_session" }, { status: 404 });
  }
  if (session.status === "abandoned") {
    return NextResponse.json({ error: "session_expired" }, { status: 409 });
  }

  const ids = events.map((e) => e.id);

  const result = await prisma.$transaction(async (tx) => {
    // Idempotent ingestion (fable/04): insert only ids we haven't seen.
    // createMany({skipDuplicates}) isn't available on SQLite; this two-step
    // form is portable to Postgres unchanged.
    const existing = await tx.event.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const seen = new Set(existing.map((e) => e.id));
    const fresh = events.filter((e) => !seen.has(e.id));

    if (fresh.length > 0) {
      await tx.event.createMany({
        data: fresh.map((e) => ({
          id: e.id,
          sessionId: session.id,
          tabId: e.tab_id,
          eventType: e.event_type,
          payload: (e.payload ?? undefined) as Prisma.InputJsonValue,
          clientTimestamp: BigInt(Math.round(e.client_timestamp)),
        })),
      });

      // Side effects ride on fresh events only.
      if (
        session.participant.status === "consented" ||
        (session.participant.status === "abandoned" && session.status === "active")
      ) {
        await tx.participant.update({
          where: { id: session.participant.id },
          data: { status: "active" },
        });
      }
      const ended = fresh.find((e) => e.event_type === "session_ended");
      if (ended && session.endedAt === null) {
        await tx.session.update({
          where: { id: session.id },
          data: { status: "completed", endedAt: new Date() },
        });
        await tx.participant.update({
          where: { id: session.participant.id },
          data: { status: "completed" },
        });
      }
      // Latest checkpoint piggybacked on any event's payload.checkpoint.
      const withCheckpoint = [...fresh]
        .reverse()
        .find((e) => e.payload && (e.payload as never)["checkpoint"]);
      if (withCheckpoint) {
        const cp = checkpointSchema.safeParse(
          (withCheckpoint.payload as Record<string, unknown>)["checkpoint"]
        );
        if (cp.success) {
          await tx.session.update({
            where: { id: session.id },
            data: { lastCheckpoint: cp.data },
          });
        }
      }
    }
    return { accepted: fresh.length, duplicates: events.length - fresh.length };
  });

  return NextResponse.json(result, { status: 202 });
}
