// LLM provider abstraction (fable/02: direct SDKs, no meta-framework).
// Demo mode is the DEFAULT: with no API key, a deterministic transformer
// exercises the full generate→review→approve workflow offline.

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export interface GenerationResult {
  text: string;
  provider: string;
  model: string;
  temperature: number;
  rawRequest: string;
  rawResponse: string;
}

const env = () => ({
  provider: process.env.LLM_PROVIDER || "demo",
  model: process.env.LLM_MODEL || "claude-opus-4-8",
  temperature: parseFloat(process.env.LLM_TEMPERATURE || "0.3"),
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || "4096", 10),
});

function demoTransform(prompt: string): string {
  // Pull the embedded article back out of the prompt.
  const headlineMatch = prompt.match(/Original headline: (.*)\n/);
  const bodyMatch = prompt.match(/---\n([\s\S]*?)\n---/);
  const title = headlineMatch?.[1] ?? "Untitled";
  const body = bodyMatch?.[1] ?? "";

  if (prompt.includes("rebuttal section")) {
    return `${title}\n\n${body}\n\n---\n\n**FACT CHECK:**\n\n[DEMO MODE] This placeholder fact-check was generated without an LLM. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY and set LLM_PROVIDER to enable real generation. The main claims above would be examined against independent sources here.`;
  }
  const label = prompt.includes("left-leaning")
    ? "left-reframed"
    : prompt.includes("right-leaning")
      ? "right-reframed"
      : prompt.includes("reading level")
        ? "simplified"
        : "transformed";
  const paragraphs = body.split("\n\n");
  return `[DEMO — ${label}] ${title}\n\n[DEMO MODE — placeholder ${label} lede. Real generation requires an API key; see README.] ${paragraphs[0] ?? ""}\n\n${paragraphs.slice(1).join("\n\n")}`;
}

// Sampling params were removed on newer Anthropic models — sending
// temperature to these 400s (claude-api reference, 2026).
const SAMPLING_REMOVED = /opus-4-[78]|fable/;

export async function generateVariant(
  prompt: string
): Promise<GenerationResult> {
  const cfg = env();

  if (cfg.provider === "demo") {
    const text = demoTransform(prompt);
    return {
      text,
      provider: "demo",
      model: "demo-transformer-v1",
      temperature: 0,
      rawRequest: JSON.stringify({ provider: "demo", prompt }),
      rawResponse: JSON.stringify({ text }),
    };
  }

  if (cfg.provider === "anthropic") {
    const client = new Anthropic();
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      messages: [{ role: "user", content: prompt }],
    };
    if (!SAMPLING_REMOVED.test(cfg.model)) {
      params.temperature = cfg.temperature;
    }
    const res = await client.messages.create(params);
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return {
      text,
      provider: "anthropic",
      model: cfg.model,
      temperature: SAMPLING_REMOVED.test(cfg.model) ? -1 : cfg.temperature,
      rawRequest: JSON.stringify(params),
      rawResponse: JSON.stringify(res),
    };
  }

  if (cfg.provider === "openai") {
    const client = new OpenAI();
    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      temperature: cfg.temperature,
      messages: [{ role: "user", content: prompt }],
    };
    const res = await client.chat.completions.create(params);
    return {
      text: res.choices[0]?.message?.content ?? "",
      provider: "openai",
      model: cfg.model,
      temperature: cfg.temperature,
      rawRequest: JSON.stringify(params),
      rawResponse: JSON.stringify(res),
    };
  }

  throw new Error(`Unknown LLM_PROVIDER: ${cfg.provider}`);
}

export function llmStatus() {
  const cfg = env();
  return {
    provider: cfg.provider,
    model: cfg.provider === "demo" ? "demo-transformer-v1" : cfg.model,
    demo: cfg.provider === "demo",
  };
}
