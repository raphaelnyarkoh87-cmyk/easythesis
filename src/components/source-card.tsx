import { BadgeCheck, CircleHelp, XCircle } from "lucide-react";
import { referenceEntry } from "@/lib/cite";
import type { Source } from "@/lib/types";

const STATUS = {
  verified: {
    icon: BadgeCheck,
    label: "DOI matched in Crossref",
    className: "text-leaf",
  },
  unverified: {
    icon: CircleHelp,
    label: "Not yet checked",
    className: "text-muted",
  },
  not_found: {
    icon: XCircle,
    label: "DOI not found. Excluded from drafts",
    className: "text-danger",
  },
} as const;

export function SourceCard({
  source,
  style,
  active = false,
}: {
  source: Source;
  style: string;
  active?: boolean;
}) {
  const s = STATUS[source.verification];
  const Icon = s.icon;
  return (
    <article
      className={`rounded-xl border bg-white p-4 transition-colors ${
        active ? "border-leaf ring-2 ring-sprout" : "border-line"
      }`}
    >
      <p className="font-serif text-[0.95rem] leading-snug text-ink">{referenceEntry(source, style)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem]">
        <span className={`inline-flex items-center gap-1 font-medium ${s.className}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
          {s.label}
        </span>
        <span className="text-muted">Found via {source.retrievedFrom}</span>
      </div>
    </article>
  );
}
