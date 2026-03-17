"use client";

import { useMemo } from "react";
import { CodeHighlight } from "@/components/CodeHighlight";

interface PatternContentProps {
  readonly html: string;
}

interface ContentBlock {
  readonly content: string;
  readonly key: string;
  readonly language: string | null;
  readonly type: "html" | "code";
}

/**
 * Renders pattern HTML content with syntax-highlighted code blocks.
 *
 * Splits the raw HTML at `<pre><code>` boundaries, renders prose sections
 * via dangerouslySetInnerHTML, and code sections via CodeHighlight (sugar-high).
 */
export function PatternContent({ html }: PatternContentProps) {
  const blocks = useMemo(() => parseBlocks(html), [html]);

  return (
    <article className="prose prose-neutral dark:prose-invert prose-h2:mt-8 prose-h2:mb-3 max-w-none prose-h2:font-semibold prose-h3:font-semibold prose-h2:text-lg prose-h3:text-base">
      {blocks.map((block) => {
        if (block.type === "code") {
          return (
            <div
              className="not-prose my-4 overflow-hidden rounded-lg border bg-muted/50"
              key={block.key}
            >
              <CodeHighlight
                className="p-4 text-[13px] leading-relaxed"
                code={block.content}
                language={block.language}
              />
            </div>
          );
        }
        return (
          <div
            dangerouslySetInnerHTML={{ __html: block.content }}
            key={block.key}
          />
        );
      })}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Parser: split HTML into prose + code blocks
// ---------------------------------------------------------------------------

const CODE_BLOCK_RE =
  /<pre><code(?: class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g;

function parseBlocks(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let lastIndex = 0;
  let blockIndex = 0;

  for (const match of html.matchAll(CODE_BLOCK_RE)) {
    const matchStart = match.index ?? 0;

    // Prose before this code block
    if (matchStart > lastIndex) {
      const prose = html.slice(lastIndex, matchStart).trim();
      if (prose) {
        blocks.push({
          key: `prose-${blockIndex++}`,
          type: "html",
          content: prose,
          language: null,
        });
      }
    }

    // Decode HTML entities back to plain text for the highlighter
    const rawCode = (match[2] ?? "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    blocks.push({
      key: `code-${blockIndex++}`,
      type: "code",
      content: rawCode,
      language: match[1] ?? null,
    });

    lastIndex = matchStart + match[0].length;
  }

  // Trailing prose after last code block
  if (lastIndex < html.length) {
    const prose = html.slice(lastIndex).trim();
    if (prose) {
      blocks.push({
        key: `prose-${blockIndex++}`,
        type: "html",
        content: prose,
        language: null,
      });
    }
  }

  return blocks;
}
