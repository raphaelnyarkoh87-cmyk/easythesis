import { NextResponse, type NextRequest } from "next/server";
import { checkDoi } from "@/lib/literature/crossref";
import { cleanText, normaliseDoi } from "@/lib/literature/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { jsonError, requireOwnedProject } from "@/lib/server/guard";

export const runtime = "nodejs";
export const maxDuration = 20;

const MAX_SOURCES_PER_PROJECT = 300;

function str(v: unknown, max: number): string | null {
  return typeof v === "string" ? (cleanText(v)?.slice(0, max) ?? null) : null;
}

/**
 * Adds a paper to a thesis's sources. Papers with a DOI are checked
 * against Crossref, and Crossref's details replace the search result's.
 * A DOI that Crossref does not know is refused.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const owned = await requireOwnedProject(body.projectId);
  if ("error" in owned) return owned.error;
  const { project, sb } = owned;

  const c = (body.candidate ?? {}) as Record<string, unknown>;
  const retrievedFrom = c.retrievedFrom === "Semantic Scholar" ? "Semantic Scholar" : "OpenAlex";
  const title = str(c.title, 500);
  if (!title) return jsonError(400, "That result has no title, so it cannot be added.");
  const doi = normaliseDoi(typeof c.doi === "string" ? c.doi : null);

  const { count } = await sb
    .from("sources")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);
  if ((count ?? 0) >= MAX_SOURCES_PER_PROJECT)
    return jsonError(400, `A thesis can hold up to ${MAX_SOURCES_PER_PROJECT} sources. Remove some first.`);

  let row: Record<string, unknown> = {
    project_id: project.id,
    title,
    authors: Array.isArray(c.authors)
      ? (c.authors as unknown[]).map((a) => str(a, 120)).filter(Boolean).slice(0, 50)
      : [],
    year: typeof c.year === "number" ? c.year : null,
    venue: str(c.venue, 300),
    volume: str(c.volume, 30),
    issue: str(c.issue, 30),
    pages: str(c.pages, 30),
    doi,
    abstract: str(c.abstract, 6000),
    retrieved_from: retrievedFrom,
    verification: "unverified",
  };

  if (doi) {
    const check = await checkDoi(doi);
    if (check.status === "not_found") {
      return jsonError(
        422,
        "Crossref has no record of this paper's DOI, so EasyThesis will not cite it. Choose another paper.",
      );
    }
    if (check.status === "found") {
      const r = check.record;
      row = {
        ...row,
        title: r.title,
        authors: r.authors.length ? r.authors : row.authors,
        year: r.year ?? row.year,
        venue: r.venue ?? row.venue,
        volume: r.volume ?? row.volume,
        issue: r.issue ?? row.issue,
        pages: r.pages ?? row.pages,
        doi: r.doi,
        abstract: row.abstract ?? r.abstract,
        verification: "verified",
      };
    }
    // "unavailable": Crossref is down. Save as unverified; it can be checked again later.
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return jsonError(503, "Saving sources is not set up yet. The site owner needs to add the server key.");
  }
  const { data, error } = await admin.from("sources").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") return jsonError(409, "This paper is already in your sources.");
    return jsonError(500, "The source could not be saved. Try again.");
  }
  return NextResponse.json({ source: data, verification: data.verification });
}
