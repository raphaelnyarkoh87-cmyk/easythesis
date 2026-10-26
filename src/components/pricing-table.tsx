import { Check, Minus } from "lucide-react";
import { formatGhs, PLANS, PAYMENT_METHODS } from "@/lib/plans";
import { ButtonLink } from "./ui";

function count(value: number | null, singular: string, plural: string, suffix = "") {
  if (value === null) return `Unlimited ${plural}`;
  return `${value} ${value === 1 ? singular : plural}${suffix}`;
}

export function PricingTable({ upgradeHref = "/signup?plan=premium" }: { upgradeHref?: string }) {
  const free = PLANS.free;
  const premium = PLANS.premium;
  const f = free.limits;
  const p = premium.limits;

  const freeRows = [
    { text: count(f.projects, "thesis project", "thesis projects"), on: true },
    { text: f.chaptersAvailable.length === 1 ? "Chapter 1 only" : "Chapters 1 to 5", on: true },
    { text: count(f.chapterDraftsPerMonth, "chapter draft", "chapter drafts", " a month"), on: true },
    { text: count(f.literatureSearchesPerMonth, "literature search", "literature searches", " a month"), on: true },
    { text: count(f.uploads, "document upload", "document uploads"), on: true },
    { text: f.exportDocx ? "Export to Word" : "No Word export", on: f.exportDocx },
  ];
  const premiumRows = [
    count(p.projects, "thesis project", "thesis projects"),
    "Chapters 1 to 5",
    count(p.chapterDraftsPerMonth, "chapter draft", "chapter drafts"),
    count(p.literatureSearchesPerMonth, "literature search", "literature searches"),
    count(p.uploads, "document upload", "document uploads"),
    "Export to Word",
  ];
  const methods = PAYMENT_METHODS.map((m) => m.label);
  const methodText = `${methods.slice(0, -1).join(", ")} or ${methods.at(-1)}`;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.15fr]">
      <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        <h3 className="font-serif text-2xl font-semibold text-forest">{free.name}</h3>
        <p className="mt-1 text-muted">{free.summary}</p>
        <p className="mt-6 font-serif text-4xl font-semibold text-ink">{formatGhs(0)}</p>
        <ButtonLink href="/signup" variant="secondary" className="mt-6 w-full">
          Start free
        </ButtonLink>
        <ul className="mt-8 space-y-3 text-[0.95rem]">
          {freeRows.map((r) => (
            <li key={r.text} className="flex items-start gap-3">
              {r.on ? (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-leaf" aria-hidden="true" />
              ) : (
                <Minus className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
              )}
              <span className={r.on ? "" : "text-muted"}>{r.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-forest p-6 text-white sm:p-8">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-serif text-2xl font-semibold">{premium.name}</h3>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
            {premium.periodDays}-day pass
          </span>
        </div>
        <p className="mt-1 text-sprout">{premium.summary}</p>
        <p className="mt-6 font-serif text-4xl font-semibold">
          {formatGhs(premium.priceGhs)}
          <span className="ml-2 font-sans text-base font-normal text-sprout">
            for {premium.periodDays} days
          </span>
        </p>
        <ButtonLink
          href={upgradeHref}
          className="mt-6 w-full !bg-white !text-forest hover:!bg-mint"
        >
          Get Premium
        </ButtonLink>
        <ul className="mt-8 space-y-3 text-[0.95rem]">
          {premiumRows.map((text) => (
            <li key={text} className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-sprout" aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 border-t border-white/15 pt-5 text-sm text-sprout">
          Pay with {methodText}. The pass does not renew by itself, so you are never charged
          without asking.
        </p>
      </section>
    </div>
  );
}
