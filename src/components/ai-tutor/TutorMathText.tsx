"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  latexToBoardText,
  looksLikeLatex,
  normalizeKatexSource,
} from "@/lib/math/latexToBoardText";
import { cn } from "@/lib/utils";

type Part =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

const MATH_CHUNK =
  /\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function splitMath(input: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  MATH_CHUNK.lastIndex = 0;
  while ((match = MATH_CHUNK.exec(input)) !== null) {
    if (match.index > last) {
      parts.push({ type: "text", value: input.slice(last, match.index) });
    }
    if (match[1] != null) {
      parts.push({ type: "math", value: match[1], display: true });
    } else if (match[2] != null) {
      parts.push({ type: "math", value: match[2], display: false });
    } else if (match[3] != null) {
      parts.push({ type: "math", value: match[3], display: true });
    } else if (match[4] != null) {
      parts.push({ type: "math", value: match[4], display: false });
    }
    last = match.index + match[0].length;
  }
  if (last < input.length) {
    parts.push({ type: "text", value: input.slice(last) });
  }
  return parts.length ? parts : [{ type: "text", value: input }];
}

function renderMath(source: string, display: boolean): string | null {
  try {
    return katex.renderToString(normalizeKatexSource(source), {
      throwOnError: false,
      displayMode: display,
      strict: "ignore",
    });
  } catch {
    return null;
  }
}

export function TutorMathText({
  text,
  className,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  const parts = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return [] as Part[];
    const split = splitMath(trimmed);
    const hasMath = split.some((part) => part.type === "math");
    if (hasMath) return split;
    if (looksLikeLatex(trimmed)) {
      return [{ type: "text", value: latexToBoardText(trimmed) } satisfies Part];
    }
    return split;
  }, [text]);

  if (!parts.length) return null;

  return (
    <Tag className={cn(className)}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.value}</span>;
        }
        const html = renderMath(part.value, part.display);
        if (!html) {
          return <span key={index}>{latexToBoardText(part.value)}</span>;
        }
        return (
          <span
            key={index}
            className={
              part.display
                ? "my-1 block overflow-x-auto text-[0.95em]"
                : "mx-0.5 inline-block align-middle text-[0.95em]"
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </Tag>
  );
}
