import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSchema } from "@/lib/schemas";
import { getTemplate, parseGenerated } from "@/lib/templates";
import { generateVariant, llmStatus } from "@/lib/llm";

export async function GET() {
  return NextResponse.json(llmStatus());
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const template = getTemplate(parsed.data.template_name);
  if (!template) {
    return NextResponse.json({ error: "unknown_template" }, { status: 400 });
  }

  const sources = await prisma.contentItem.findMany({
    where: { id: { in: parsed.data.source_item_ids } },
  });
  const byId = new Map(sources.map((s) => [s.id, s]));

  const results: {
    source_item_id: string;
    variant_item_id?: string;
    error?: string;
  }[] = [];

  // Sequential on purpose: kind to rate limits; the UI shows progress.
  for (const sourceId of parsed.data.source_item_ids) {
    const source = byId.get(sourceId);
    if (!source) {
      results.push({ source_item_id: sourceId, error: "not_found" });
      continue;
    }
    try {
      const prompt = template.buildPrompt(
        source.title,
        source.body,
        parsed.data.variables
      );
      const gen = await generateVariant(prompt);
      const { title, body: variantBody } = parseGenerated(
        gen.text,
        source.title
      );

      const created = await prisma.$transaction(async (tx) => {
        // Immutable audit trail (description/04): raw request/response are
        // frozen here; researcher edits only ever touch the ContentItem.
        const log = await tx.generationLog.create({
          data: {
            sourceItemId: source.id,
            templateName: template.name,
            templateVariables: parsed.data.variables,
            llmProvider: gen.provider,
            llmModel: gen.model,
            llmTemperature: gen.temperature,
            rawRequest: gen.rawRequest,
            rawResponse: gen.rawResponse,
          },
        });
        return tx.contentItem.create({
          data: {
            title,
            body: variantBody,
            snippet: variantBody.replace(/[#*_\n]/g, " ").slice(0, 200).trim(),
            sourceName: source.sourceName,
            sourceLogoUrl: source.sourceLogoUrl,
            thumbnailUrl: source.thumbnailUrl,
            category: source.category,
            publishedAt: source.publishedAt,
            isFiller: source.isFiller,
            fakeLikes: source.fakeLikes,
            fakeComments: source.fakeComments,
            fakeViews: source.fakeViews,
            sourceItemId: source.id,
            variantType: template.variantType(parsed.data.variables),
            generationLogId: log.id,
            approved: false, // review queue until a researcher approves
          },
        });
      });
      results.push({ source_item_id: sourceId, variant_item_id: created.id });
    } catch (err) {
      results.push({
        source_item_id: sourceId,
        error: err instanceof Error ? err.message.slice(0, 300) : "generation_failed",
      });
    }
  }

  return NextResponse.json({ results });
}
