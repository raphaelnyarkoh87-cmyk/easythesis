"use client";

import { useState } from "react";
import { EXAMPLE_BACKGROUND, EXAMPLE_SOURCES } from "@/lib/example";
import { CitedProse } from "./cited-prose";
import { SourceCard } from "./source-card";

export function HeroDemo() {
  const [active, setActive] = useState<string>("jack2014");
  const source = EXAMPLE_SOURCES.find((s) => s.id === active)!;
  return (
    <figure className="relative">
      <div className="rounded-2xl border border-line bg-white shadow-[0_1px_0_var(--color-line),0_24px_48px_-24px_rgba(15,61,46,0.28)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="text-sm font-medium text-forest">Chapter 1, Background to the study</p>
          <p className="text-xs text-muted">Example draft</p>
        </div>
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <CitedProse
            paragraphs={EXAMPLE_BACKGROUND}
            sources={EXAMPLE_SOURCES}
            style="APA 7th edition"
            activeSourceId={active}
            onSelectSource={setActive}
          />
        </div>
        <div className="border-t border-line bg-mint/60 px-5 py-4 sm:px-7">
          <p className="mb-2 text-xs text-muted">Select any citation to see its source.</p>
          <SourceCard source={source} style="APA 7th edition" active />
        </div>
      </div>
      <figcaption className="sr-only">
        An example paragraph from Chapter 1 with citations that link to verified sources, and
        one sentence flagged because no source supports it.
      </figcaption>
    </figure>
  );
}
