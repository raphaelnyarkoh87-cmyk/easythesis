import { BadgeCheck, CircleHelp, Trash2, XCircle } from "lucide-react";
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
    label: "No DOI to check. Confirm it yourself before citing",
    className: "text-warn",
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
  onSelect,
  onRemove,
}: {
  source: Source;
  style: string;
  active?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
}) {
  const s = STATUS[source.verification];
  const Icon = s.icon;
  return (
    <article
      className={`rounded-xl border bg-white p-4 transition-colors ${
        active ? "border-leaf ring-2 ring-sprout" : "border-line"
      }`}
    >
      {onSelect ? (
        <button type="button" onClick={onSelect} className="block w-full text-left">
          <p className="font-serif text-[0.95rem] leading-snug text-ink">{referenceEntry(source, style)}</p>
        </button>
      ) : (
        <p className="font-serif text-[0.95rem] leading-snug text-ink">{referenceEntry(source, style)}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem]">
        <span className={`inline-flex items-center gap-1 font-medium ${s.className}`}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {s.label}
        </span>
        <span className="text-muted">Found via {source.retrievedFrom}</span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-1 text-muted hover:bg-mint hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        ) : null}
      </div>
    </article>
  );
}
