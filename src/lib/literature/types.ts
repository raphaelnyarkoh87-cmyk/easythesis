/** A paper returned by a database search, before it is checked or saved. */
export interface Candidate {
  title: string;
  authors: string[]; // "Surname, I." format
  year: number | null;
  venue: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi: string | null; // bare DOI, lower-case, no https://doi.org/
  abstract: string | null;
  citedBy: number | null;
  openAccessUrl: string | null;
  retrievedFrom: "OpenAlex" | "Semantic Scholar";
}

/** Normalises any DOI form to bare lower-case, or null. */
export function normaliseDoi(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/10\.\d{4,9}\/\S+/i);
  return m ? m[0].replace(/[.,;)\]]+$/, "").toLowerCase() : null;
}

/**
 * "Tavneet Suri" -> "Suri, T."; "Davis, Fred D." stays APA-style.
 * Single-word names (organisations) are kept as they are.
 */
export function toCitationName(full: string): string {
  const name = full.replace(/\s+/g, " ").trim();
  if (!name) return name;
  if (name.includes(",")) {
    const [family, given = ""] = name.split(",", 2).map((s) => s.trim());
    return given ? `${family}, ${initials(given)}` : family;
  }
  const parts = name.split(" ");
  if (parts.length === 1) return name;
  const particles = new Set(["van", "von", "de", "der", "da", "di", "le", "la", "du", "dos", "das"]);
  let i = parts.length - 1;
  while (i > 1 && particles.has(parts[i - 1].toLowerCase())) i -= 1;
  const family = parts.slice(i).join(" ");
  const given = parts.slice(0, i).join(" ");
  return `${family}, ${initials(given)}`;
}

export function initials(given: string): string {
  return given
    .split(/[\s]+/)
    .filter(Boolean)
    .map((g) =>
      g
        .split("-")
        .map((p) => (p.replace(/\./g, "")[0] ?? "").toUpperCase() + ".")
        .join("-"),
    )
    .join(" ");
}

export function cleanText(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return t || null;
}
