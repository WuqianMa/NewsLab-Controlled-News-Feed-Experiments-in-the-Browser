// Quick DB sanity check: npx tsx scripts/check-events.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const experiments = await prisma.experiment.findMany({
    include: {
      conditions: true,
      participants: { include: { sessions: true, surveyResponses: true } },
    },
  });
  for (const exp of experiments) {
    console.log(`\n=== ${exp.name} (${exp.slug}) — ${exp.status} ===`);
    for (const cond of exp.conditions) {
      const ps = exp.participants.filter((p) => p.conditionId === cond.id);
      console.log(
        `  condition "${cond.label}": ${ps.filter((p) => !p.isPreview).length} participants` +
          ` (+${ps.filter((p) => p.isPreview).length} previews)`
      );
    }
    for (const p of exp.participants) {
      const flags = [
        p.isPreview && "preview",
        p.isPilot && "pilot",
        p.externalId && `ext:${p.externalId}`,
      ]
        .filter(Boolean)
        .join(",");
      console.log(
        `  ${p.id.slice(0, 8)} [${p.status}${flags ? " " + flags : ""}] ` +
          `${p.sessions.length} session(s), ${p.surveyResponses.length} survey answer(s)`
      );
      for (const s of p.sessions) {
        const counts = await prisma.event.groupBy({
          by: ["eventType"],
          where: { sessionId: s.id },
          _count: { _all: true },
        });
        const summary = counts
          .sort((a, b) => b._count._all - a._count._all)
          .map((c) => `${c.eventType}:${c._count._all}`)
          .join(" ");
        console.log(`    session ${s.id.slice(0, 8)} (${s.status}): ${summary || "no events"}`);
      }
    }
  }
  console.log(`\nTotal events: ${await prisma.event.count()}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
