import "server-only";
import { cleanText, normaliseDoi, toCitationName, type Candidate } from "./types";

type InvertedIndex = Record<string, number[]>;

/** OpenAlex stores abstracts as word -> positions; rebuild the text. */
export function rebuildAbstract(index: InvertedIndex | null | undefined): string | null {
  if (!index) return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const p of positions) words[p] = word;
  }
  return cleanText(words.filter((w) => w !== undefined).join(" "));
}

interface OpenAlexWork {
  doi?: string | null;
  display_name?: string | null;
  title?: string | null;
  publication_year?: number | null;
  authorships?: { author?: { display_name?: string | null } }[];
  primary_location?: { source?: { display_name?: string | null } | null } | null;
  biblio?: { volume?: string | null; issue?: string | null; first_page?: string | null; last_page?: string | null };
  abstract_inverted_index?: InvertedIndex | null;
  cited_by_count?: number | null;
  open_access?: { oa_url?: string | null } | null;
  type?: string | null;
  is_retracted?: boolean | null;
}

export function mapOpenAlexWork(w: OpenAlexWork): Candidate | null {
  const title = cleanText(w.display_name ?? w.title);
  if (!title || w.is_retracted) return null;
  const first = w.biblio?.first_page;
  const last = w.biblio?.last_page;
  return {
    title,
    authors: (w.authorships ?? [])
      .map((a) => a.author?.display_name)
      .filter((n): n is string => !!n)
      .map(toCitationName),
    year: w.publication_year ?? null,
    venue: cleanText(w.primary_location?.source?.display_name) ?? null,
    volume: w.biblio?.volume ?? null,
    issue: w.biblio?.issue ?? null,
    pages: first ? (last && last !== first ? `${first}–${last}` : first) : null,
    doi: normaliseDoi(w.doi),
    abstract: rebuildAbstract(w.abstract_inverted_index),
    citedBy: w.cited_by_count ?? null,
    openAccessUrl: w.open_access?.oa_url ?? null,
    retrievedFrom: "OpenAlex",
  };
}

export async function searchOpenAlex(
  query: string,
  opts: { fromYear?: number; limit?: number } = {},
): Promise<Candidate[]> {
  const params = new URLSearchParams({
    search: query,
    per_page: String(opts.limit ?? 15),
    // Scholarly outputs only: articles, books, chapters, reviews, dissertations.
    filter: [
      "type:article|book|book-chapter|review|dissertation",
      "is_retracted:false",
      opts.fromYear ? `from_publication_date:${opts.fromYear}-01-01` : "",
    ]
      .filter(Boolean)
      .join(","),
    select:
      "doi,display_name,publication_year,authorships,primary_location,biblio,abstract_inverted_index,cited_by_count,open_access,type,is_retracted",
  });
  const key = process.env.OPENALEX_API_KEY;
  if (key) params.set("api_key", key);
  if (process.env.CONTACT_EMAIL) params.set("mailto", process.env.CONTACT_EMAIL);

  const res = await fetch(`https://api.openalex.org/works?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const json = (await res.json()) as { results?: OpenAlexWork[] };
  return (json.results ?? []).map(mapOpenAlexWork).filter((c): c is Candidate => c !== null);
}
