import type { Source } from "./types";

function surname(author: string) {
  return author.split(",")[0].trim();
}

/** In-text citation, e.g. (Jack & Suri, 2014) in APA or (Jack and Suri, 2014) in Harvard. */
export function inText(source: Source, style: string) {
  const joiner = style.startsWith("Harvard") ? " and " : " & ";
  const names = source.authors.map(surname);
  let who: string;
  if (names.length === 1) who = names[0];
  else if (names.length === 2) who = `${names[0]}${joiner}${names[1]}`;
  else who = `${names[0]} et al.`;
  return `(${who}, ${source.year})`;
}

/** Reference-list entry. APA 7th and Harvard differ mainly in punctuation. */
export function referenceEntry(source: Source, style: string) {
  const harvard = style.startsWith("Harvard");
  const authors =
    source.authors.length > 1
      ? `${source.authors.slice(0, -1).join(", ")}${harvard ? " and " : ", & "}${source.authors.at(-1)}`
      : source.authors[0];
  const volume = source.volume
    ? `${source.volume}${source.issue ? `(${source.issue})` : ""}`
    : "";
  const pages = source.pages ? `, ${harvard ? "pp. " : ""}${source.pages}` : "";
  const doi = source.doi ? ` https://doi.org/${source.doi}` : "";
  if (harvard) {
    return `${authors} (${source.year}) '${source.title}', ${source.venue}${volume ? `, ${volume}` : ""}${pages}.${doi}`;
  }
  return `${authors} (${source.year}). ${source.title}. ${source.venue}${volume ? `, ${volume}` : ""}${pages}.${doi}`;
}

export type ProseToken =
  | { type: "text"; value: string }
  | { type: "cite"; sourceId: string }
  | { type: "unsupported" }
  | { type: "data" }
  | { type: "add"; what: string };

/** Splits draft text on [[source-id]], [[?]], [[data]] and [[add:...]] markers. */
export function tokenize(paragraph: string): ProseToken[] {
  const tokens: ProseToken[] = [];
  const re = /\s*\[\[([^\]]+)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(paragraph))) {
    if (m.index > last) tokens.push({ type: "text", value: paragraph.slice(last, m.index) });
    const v = m[1];
    if (v === "?") tokens.push({ type: "unsupported" });
    else if (v === "data") tokens.push({ type: "data" });
    else if (v.startsWith("add:")) tokens.push({ type: "add", what: v.slice(4) });
    else tokens.push({ type: "cite", sourceId: v });
    last = m.index + m[0].length;
  }
  if (last < paragraph.length) tokens.push({ type: "text", value: paragraph.slice(last) });
  return tokens;
}
