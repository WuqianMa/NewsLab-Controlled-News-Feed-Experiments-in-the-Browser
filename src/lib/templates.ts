// Transformation templates (description/04). Prompts end with a strict output
// contract: first line = rewritten headline, blank line, then the body — so a
// single completion yields both fields.

export interface Template {
  name: string;
  label: string;
  description: string;
  variables: { key: string; label: string; options: string[] }[];
  variantType: (vars: Record<string, string>) => string;
  buildPrompt: (
    title: string,
    body: string,
    vars: Record<string, string>
  ) => string;
}

const OUTPUT_CONTRACT = `Output format (strict):
- First line: the rewritten headline only
- Then one blank line
- Then the full article body
Do not add any commentary, preamble, or labels.`;

export const TEMPLATES: Template[] = [
  {
    name: "reframe_bias",
    label: "Reframe bias",
    description:
      "Rewrite the article with a political framing while keeping all factual claims identical.",
    variables: [
      {
        key: "direction",
        label: "Direction",
        options: ["left-leaning", "right-leaning", "neutral"],
      },
    ],
    variantType: (v) =>
      v.direction === "left-leaning"
        ? "reframed_left"
        : v.direction === "right-leaning"
          ? "reframed_right"
          : "reframed_neutral",
    buildPrompt: (title, body, v) => `Given the following news article, rewrite it with a ${v.direction ?? "neutral"} framing while keeping all factual claims identical.

Original headline: ${title}

Original article:
---
${body}
---

${OUTPUT_CONTRACT}`,
  },
  {
    name: "add_rebuttal",
    label: "Add rebuttal",
    description:
      "Append a clearly labeled fact-check section addressing the main claims with counter-evidence.",
    variables: [],
    variantType: () => "with_rebuttal",
    buildPrompt: (title, body) => `Given the following news article, reproduce it in full and add a clearly labeled rebuttal section at the end that addresses the main claims with counter-evidence. Label the section exactly "**FACT CHECK:**" preceded by a horizontal rule (---).

Original headline: ${title}

Original article:
---
${body}
---

${OUTPUT_CONTRACT}`,
  },
  {
    name: "simplify_language",
    label: "Simplify language",
    description:
      "Rewrite at a chosen reading level, preserving all factual content and key quotes.",
    variables: [
      {
        key: "level",
        label: "Reading level",
        options: ["elementary", "middle school", "general public"],
      },
    ],
    variantType: () => "simplified",
    buildPrompt: (title, body, v) => `Rewrite the following news article at a ${v.level ?? "general public"} reading level while preserving all factual content and key quotes.

Original headline: ${title}

Original article:
---
${body}
---

${OUTPUT_CONTRACT}`,
  },
  {
    name: "custom",
    label: "Custom prompt",
    description:
      "Write your own transformation instruction; the article is appended automatically.",
    variables: [],
    variantType: () => "custom",
    buildPrompt: (title, body, v) => `${v.custom_prompt ?? "Rewrite the following article."}

Original headline: ${title}

Original article:
---
${body}
---

${OUTPUT_CONTRACT}`,
  },
];

export const getTemplate = (name: string) =>
  TEMPLATES.find((t) => t.name === name);

// Parse the completion per the output contract; fall back to the source title.
export function parseGenerated(text: string, fallbackTitle: string) {
  const trimmed = text.trim();
  const nl = trimmed.indexOf("\n");
  if (nl === -1) return { title: fallbackTitle, body: trimmed };
  const first = trimmed.slice(0, nl).trim().replace(/^#+\s*/, "");
  const rest = trimmed.slice(nl).trim();
  if (first.length === 0 || first.length > 300) {
    return { title: fallbackTitle, body: trimmed };
  }
  return { title: first, body: rest };
}
