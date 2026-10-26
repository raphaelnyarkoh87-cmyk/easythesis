import "server-only";
import { searchOpenAlex } from "./openalex";
import { searchSemanticScholar } from "./semanticscholar";
import type { Candidate } from "./types";

export interface SearchOutcome {
  results: Candidate[];
  /** Databases that answered, for honest reporting in the interface. */
  answered: Candidate["retrievedFrom"][];
  failed: Candidate["retrievedFrom"][];
}

function titleKey(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);
}

/** Merges results, preferring OpenAlex metadata and filling gaps from Semantic Scholar. */
export function mergeCandidates(primary: Candidate[], secondary: Candidate[]): Candidate[] {
  const out: Candidate[] = [];
  const byDoi = new Map<string, Candidate>();
  const byTitle = new Map<string, Candidate>();
  for (const c of [...primary, ...secondary]) {
    const existing = (c.doi && byDoi.get(c.doi)) || byTitle.get(titleKey(c.title));
    if (existing) {
      existing.abstract ??= c.abstract;
      existing.doi ??= c.doi;
      existing.venue ??= c.venue;
      existing.openAccessUrl ??= c.openAccessUrl;
      existing.citedBy = Math.max(existing.citedBy ?? 0, c.citedBy ?? 0) || existing.citedBy;
      if (existing.doi) byDoi.set(existing.doi, existing);
      continue;
    }
    const copy = { ...c };
    out.push(copy);
    if (copy.doi) byDoi.set(copy.doi, copy);
    byTitle.set(titleKey(copy.title), copy);
  }
  // Papers with a DOI first (they can be verified), then by citations.
  return out.sort((a, b) => {
    if (!!a.doi !== !!b.doi) return a.doi ? -1 : 1;
    return (b.citedBy ?? 0) - (a.citedBy ?? 0);
  });
}

export async function searchLiterature(
  query: string,
  opts: { fromYear?: number } = {},
): Promise<SearchOutcome> {
  const [oa, s2] = await Promise.allSettled([
    searchOpenAlex(query, { fromYear: opts.fromYear, limit: 15 }),
    searchSemanticScholar(query, { fromYear: opts.fromYear, limit: 15 }),
  ]);
  const answered: SearchOutcome["answered"] = [];
  const failed: SearchOutcome["failed"] = [];
  if (oa.status === "fulfilled") answered.push("OpenAlex");
  else failed.push("OpenAlex");
  if (s2.status === "fulfilled") answered.push("Semantic Scholar");
  else failed.push("Semantic Scholar");
  const results = mergeCandidates(
    oa.status === "fulfilled" ? oa.value : [],
    s2.status === "fulfilled" ? s2.value : [],
  ).slice(0, 20);
  return { results, answered, failed };
}
