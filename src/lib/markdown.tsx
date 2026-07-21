import React from "react";

// Deliberately tiny Markdown renderer (headings, bold, italic, lists, links,
// hr) — no dependency.
export function safeMarkdownHref(url: string): string | null {
  const value = url.trim();
  if (
    (value.startsWith("/") && !value.startsWith("//")) ||
    value.startsWith("#") ||
    /^https:\/\//i.test(value) ||
    /^mailto:/i.test(value)
  ) {
    return value;
  }
  return null;
}

function inline(
  text: string,
  onLinkClick?: (url: string, label: string) => void
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // links first, then bold, then italic
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  const pushStyled = (chunk: string) => {
    // **bold** and *italic*
    const tokens = chunk.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    for (const t of tokens) {
      if (t.startsWith("**") && t.endsWith("**")) {
        parts.push(<strong key={`s${key++}`}>{t.slice(2, -2)}</strong>);
      } else if (t.startsWith("*") && t.endsWith("*") && t.length > 2) {
        parts.push(<em key={`s${key++}`}>{t.slice(1, -1)}</em>);
      } else if (t) {
        parts.push(t);
      }
    }
  };
  while ((m = linkRe.exec(text)) !== null) {
    pushStyled(text.slice(last, m.index));
    const [, label, url] = m;
    const href = safeMarkdownHref(url);
    parts.push(
      href ? (
        <a
          key={`l${key++}`}
          href={href}
          className="text-blue-700 underline"
          target={href.startsWith("https://") ? "_blank" : undefined}
          rel={href.startsWith("https://") ? "noopener noreferrer" : undefined}
          onClick={() => onLinkClick?.(href, label)}
        >
          {label}
        </a>
      ) : (
        <span key={`l${key++}`}>{label}</span>
      )
    );
    last = m.index + m[0].length;
  }
  pushStyled(text.slice(last));
  return parts;
}

export function Markdown({
  text,
  onLinkClick,
  className = "",
}: {
  text: string;
  onLinkClick?: (url: string, label: string) => void;
  className?: string;
}) {
  const blocks = text.split(/\n\s*\n/);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const b = block.trim();
        if (!b) return null;
        if (b === "---") return <hr key={i} className="my-5 border-gray-200" />;
        if (b.startsWith("### "))
          return (
            <h3 key={i} className="mb-2 mt-5 text-base font-bold">
              {inline(b.slice(4), onLinkClick)}
            </h3>
          );
        if (b.startsWith("## "))
          return (
            <h2 key={i} className="mb-3 mt-5 text-lg font-bold">
              {inline(b.slice(3), onLinkClick)}
            </h2>
          );
        if (b.startsWith("# "))
          return (
            <h1 key={i} className="mb-3 mt-5 text-xl font-bold">
              {inline(b.slice(2), onLinkClick)}
            </h1>
          );
        const lines = b.split("\n");
        if (lines.every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i} className="mb-4 list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.trim().slice(2), onLinkClick)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mb-4 leading-relaxed">
            {inline(b, onLinkClick)}
          </p>
        );
      })}
    </div>
  );
}
