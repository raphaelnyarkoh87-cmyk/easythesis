import "server-only";
import { cleanText, initials, normaliseDoi } from "./types";

export interface CrossrefRecord {
  doi: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  abstract: string | null;
}

export type CrossrefResult =
  | { status: "found"; record: CrossrefRecord }
  | { status: "not_found" }
  | { status: "unavailable" };

interface CrossrefMessage {
  DOI?: string;
  title?: string[];
  author?: { family?: string; given?: string; name?: string }[];
  editor?: { family?: string; given?: string; name?: string }[];
  "container-title"?: string[];
  publisher?: string;
  volume?: string;
  issue?: string;
  page?: string;
  abstract?: string;
  type?: string;
  published?: { "date-parts"?: number[][] };
  issued?: { "date-parts"?: number[][] };
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
}

export function mapCrossref(m: CrossrefMessage): CrossrefRecord | null {
  const title = cleanText(m.title?.[0]);
  const doi = normaliseDoi(m.DOI);
  if (!title || !doi) return null;
  const people = m.author?.length ? m.author : (m.editor ?? []);
  const year =
    m.issued?.["date-parts"]?.[0]?.[0] ??
    m["published-print"]?.["date-parts"]?.[0]?.[0] ??
    m.published?.["date-parts"]?.[0]?.[0] ??
    m["published-online"]?.["date-parts"]?.[0]?.[0] ??
    null;
  const isBook = m.type === "book" || m.type === "monograph" || m.type === "edited-book";
  return {
    doi,
    title,
    authors: people
      .map((a) => (a.family ? (a.given ? `${a.family}, ${initials(a.given)}` : a.family) : a.name))
      .filter((n): n is string => !!n),
    year: typeof year === "number" ? year : null,
    venue: cleanText(m["container-title"]?.[0]) ?? (isBook ? (cleanText(m.publisher) ?? null) : null),
    volume: m.volume ?? null,
    issue: m.issue ?? null,
    pages: m.page ? m.page.replace(/-+/g, "–") : null,
    abstract: cleanText(m.abstract),
  };
}

/** Looks a DOI up in Crossref, the official DOI registry. */
export async function checkDoi(rawDoi: string): Promise<CrossrefResult> {
  const doi = normaliseDoi(rawDoi);
  if (!doi) return { status: "not_found" };
  const mail = process.env.CONTACT_EMAIL ? `?mailto=${encodeURIComponent(process.env.CONTACT_EMAIL)}` : "";
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}${mail}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": `EasyThesis/1.0 (https://easythesis.vercel.app${
          process.env.CONTACT_EMAIL ? `; mailto:${process.env.CONTACT_EMAIL}` : ""
        })`,
      },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "unavailable" };
    const json = (await res.json()) as { message?: CrossrefMessage };
    const record = json.message ? mapCrossref(json.message) : null;
    return record ? { status: "found", record } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}
