import "server-only";
import { cleanText, normaliseDoi, toCitationName, type Candidate } from "./types";

interface S2Paper {
  title?: string | null;
  year?: number | null;
  authors?: { name?: string | null }[];
  venue?: string | null;
  journal?: { name?: string | null; volume?: string | null; pages?: string | null } | null;
  externalIds?: { DOI?: string | null } | null;
  abstract?: string | null;
  citationCount?: number | null;
  openAccessPdf?: { url?: string | null } | null;
}

export function mapS2Paper(p: S2Paper): Candidate | null {
  const title = cleanText(p.title);
  if (!title) return null;
  return {
    title,
    authors: (p.authors ?? [])
      .map((a) => a.name)
      .filter((n): n is string => !!n)
      .map(toCitationName),
    year: p.year ?? null,
    venue: cleanText(p.journal?.name || p.venue) ?? null,
    volume: p.journal?.volume?.trim() || null,
    issue: null,
    pages: p.journal?.pages?.trim().replace(/-+/g, "–") || null,
    doi: normaliseDoi(p.externalIds?.DOI),
    abstract: cleanText(p.abstract),
    citedBy: p.citationCount ?? null,
    openAccessUrl: p.openAccessPdf?.url || null,
    retrievedFrom: "Semantic Scholar",
  };
}

export async function searchSemanticScholar(
  query: string,
  opts: { fromYear?: number; limit?: number } = {},
): Promise<Candidate[]> {
  const params = new URLSearchParams({
    query,
    limit: String(opts.limit ?? 15),
    fields: "title,year,authors,venue,journal,externalIds,abstract,citationCount,openAccessPdf",
  });
  if (opts.fromYear) params.set("year", `${opts.fromYear}-`);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;

  const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, {
    headers,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Semantic Scholar ${res.status}`);
  const json = (await res.json()) as { data?: S2Paper[] };
  return (json.data ?? []).map(mapS2Paper).filter((c): c is Candidate => c !== null);
}
