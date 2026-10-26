"use client";

import { AlertTriangle } from "lucide-react";
import { inText, tokenize } from "@/lib/cite";
import type { Source } from "@/lib/types";

export function CitedProse({
  paragraphs,
  sources,
  style,
  activeSourceId,
  onSelectSource,
}: {
  paragraphs: string[];
  sources: Source[];
  style: string;
  activeSourceId?: string | null;
  onSelectSource?: (id: string) => void;
}) {
  const byId = new Map(sources.map((s) => [s.id, s]));
  return (
    <div className="thesis-prose">
      {paragraphs.map((para, i) => (
        <p key={i}>
          {tokenize(para).map((t, j) => {
            if (t.type === "text") return <span key={j}>{t.value}</span>;
            if (t.type === "unsupported") {
              return (
                <span
                  key={j}
                  className="ml-1 inline-flex translate-y-[-1px] indent-0 items-center gap-1 rounded-md bg-warn-bg px-1.5 py-0.5 align-middle font-sans text-[0.75rem] font-medium text-warn"
                  title="No retrieved source supports this sentence. Add a source or rewrite the claim."
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  Needs a source
                </span>
              );
            }
            const src = byId.get(t.sourceId);
            if (!src) {
              return (
                <span key={j} className="ml-1 rounded bg-warn-bg px-1 font-sans text-xs text-warn">
                  Missing source
                </span>
              );
            }
            const active = activeSourceId === src.id;
            return (
              <button
                key={j}
                type="button"
                onClick={() => onSelectSource?.(src.id)}
                aria-pressed={active}
                className={`ml-1 rounded-sm px-0.5 indent-0 underline decoration-2 underline-offset-[5px] transition-colors ${
                  active
                    ? "bg-sprout decoration-leaf"
                    : "decoration-sprout hover:bg-mint hover:decoration-leaf"
                }`}
              >
                {inText(src, style)}
              </button>
            );
          })}
        </p>
      ))}
    </div>
  );
}
