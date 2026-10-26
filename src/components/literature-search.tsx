"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Check, ExternalLink, Loader2, Plus, Search } from "lucide-react";
import { Button, inputClass } from "./ui";
import { addSource, searchLiterature, type SearchResult } from "@/lib/store";

const SINCE = [
  { label: "Any year", value: "" },
  { label: "Since 2021", value: "2021" },
  { label: "Since 2016", value: "2016" },
  { label: "Since 2011", value: "2011" },
];

type AddState = "adding" | "added" | { error: string };

function shortAuthors(authors: string[]) {
  if (authors.length === 0) return "Unknown author";
  const surname = (a: string) => a.split(",")[0];
  if (authors.length === 1) return surname(authors[0]);
  if (authors.length === 2) return `${surname(authors[0])} and ${surname(authors[1])}`;
  return `${surname(authors[0])} et al.`;
}

export function LiteratureSearch({
  projectId,
  suggestion,
  remainingSearches,
}: {
  projectId: string;
  suggestion: string;
  remainingSearches: number | null;
}) {
  const [query, setQuery] = useState("");
  const [since, setSince] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; upgrade?: boolean } | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [meta, setMeta] = useState<{ searched: string[]; unavailable: string[] } | null>(null);
  const [adds, setAdds] = useState<Record<string, AddState>>({});
  const [remaining, setRemaining] = useState<number | null>(remainingSearches);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 3) return setError({ text: "Type at least 3 characters to search." });
    setBusy(true);
    setError(null);
    const res = await searchLiterature(projectId, q, since ? Number(since) : undefined);
    setBusy(false);
    if (res.error || !res.data) {
      setError({ text: res.error ?? "Search failed.", upgrade: res.upgrade });
      return;
    }
    setResults(res.data.results);
    setMeta({ searched: res.data.searched, unavailable: res.data.unavailable });
    setRemaining(res.data.remaining);
    setAdds({});
  }

  async function add(r: SearchResult, key: string) {
    setAdds((s) => ({ ...s, [key]: "adding" }));
    const res = await addSource(projectId, r);
    setAdds((s) => ({ ...s, [key]: res.error ? { error: res.error } : "added" }));
  }

  return (
    <div>
      <form onSubmit={run} className="space-y-2" role="search">
        <label htmlFor="lit-search" className="sr-only">
          Search published literature
        </label>
        <div className="flex gap-2">
          <input
            id="lit-search"
            className={`${inputClass} py-2 text-sm`}
            placeholder="Search published literature"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button size="sm" type="submit" aria-label="Search" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="lit-since" className="sr-only">
            Publication year
          </label>
          <select
            id="lit-since"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="rounded-md border border-line bg-white px-2 py-1 text-xs text-forest"
          >
            {SINCE.map((s) => (
              <option key={s.label} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {remaining !== null ? (
            <span className="text-xs text-muted">
              {remaining} {remaining === 1 ? "search" : "searches"} left this month
            </span>
          ) : null}
        </div>
        {!query && !results ? (
          <button
            type="button"
            onClick={() => setQuery(suggestion)}
            className="text-left text-xs text-leaf underline underline-offset-2"
          >
            Try: {suggestion}
          </button>
        ) : null}
      </form>

      {error ? (
        <p role="alert" className="mt-3 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">
          {error.text}{" "}
          {error.upgrade ? (
            <Link href="/app/upgrade" className="font-medium underline underline-offset-2">
              Get Premium
            </Link>
          ) : null}
        </p>
      ) : null}

      {results ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-forest">
              {results.length === 0 ? "No papers found" : `${results.length} papers found`}
            </p>
            <button
              type="button"
              onClick={() => {
                setResults(null);
                setMeta(null);
              }}
              className="text-xs text-muted underline underline-offset-2 hover:text-forest"
            >
              Close results
            </button>
          </div>
          {meta?.unavailable.length ? (
            <p className="mt-1 text-xs text-muted">
              {meta.unavailable.join(" and ")} did not respond, so results come from{" "}
              {meta.searched.join(" and ")} only.
            </p>
          ) : null}
          {results.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Try fewer or broader words, for example the key concept and your country.
            </p>
          ) : (
            <ul className="mt-3 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {results.map((r, i) => {
                const key = r.doi ?? `${r.title}-${i}`;
                const state = r.alreadyAdded ? "added" : adds[key];
                return (
                  <li key={key} className="rounded-xl border border-line bg-white p-3">
                    <p className="font-serif text-[0.95rem] leading-snug text-ink">{r.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {shortAuthors(r.authors)}
                      {r.year ? `, ${r.year}` : ""}
                      {r.venue ? `. ${r.venue}` : ""}
                    </p>
                    {r.abstract ? (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-leaf">Abstract</summary>
                        <p className="mt-1 leading-relaxed text-ink">{r.abstract}</p>
                      </details>
                    ) : (
                      <p className="mt-2 text-xs text-muted">No abstract available.</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {state === "added" ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-leaf">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          In your sources
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={state === "adding"}
                          onClick={() => add(r, key)}
                        >
                          {state === "adding" ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              Checking DOI…
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" aria-hidden="true" />
                              Add to sources
                            </>
                          )}
                        </Button>
                      )}
                      {r.doi ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Has DOI
                        </span>
                      ) : (
                        <span className="text-xs text-warn">No DOI</span>
                      )}
                      {r.openAccessUrl ? (
                        <a
                          href={r.openAccessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-leaf underline underline-offset-2"
                        >
                          Free full text
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                    {typeof state === "object" ? (
                      <p role="alert" className="mt-2 text-xs text-danger">
                        {state.error}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
