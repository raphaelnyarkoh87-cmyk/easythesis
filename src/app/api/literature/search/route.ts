import { NextResponse, type NextRequest } from "next/server";
import { searchLiterature } from "@/lib/literature/search";
import { checkAllowance, jsonError, recordUsage, requireOwnedProject } from "@/lib/server/guard";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    projectId?: unknown;
    query?: unknown;
    fromYear?: unknown;
  };

  const query = typeof body.query === "string" ? body.query.replace(/\s+/g, " ").trim() : "";
  if (query.length < 3) return jsonError(400, "Type at least 3 characters to search.");
  if (query.length > 300) return jsonError(400, "Shorten your search to 300 characters or fewer.");
  const fromYear =
    typeof body.fromYear === "number" && body.fromYear >= 1900 && body.fromYear <= new Date().getFullYear()
      ? Math.floor(body.fromYear)
      : undefined;

  const owned = await requireOwnedProject(body.projectId);
  if ("error" in owned) return owned.error;
  const { user, project, sb } = owned;

  let allowance;
  try {
    allowance = await checkAllowance(user.id, "literature_search");
  } catch {
    return jsonError(503, "Literature search is not set up yet. The site owner needs to add the server key.");
  }
  if (!allowance.allowed) return jsonError(402, allowance.reason ?? "Limit reached.", { upgrade: true });

  const outcome = await searchLiterature(query, { fromYear });
  if (outcome.answered.length === 0) {
    // Not counted against the user's allowance.
    return jsonError(
      502,
      "The literature databases did not respond. Try again in a minute.",
    );
  }

  await recordUsage(user.id, "literature_search", project.id);

  // Mark papers already in this thesis's sources.
  const { data: existing } = await sb.from("sources").select("doi").eq("project_id", project.id);
  const have = new Set((existing ?? []).map((s) => s.doi).filter(Boolean));

  return NextResponse.json({
    results: outcome.results.map((r) => ({ ...r, alreadyAdded: !!r.doi && have.has(r.doi) })),
    searched: outcome.answered,
    unavailable: outcome.failed,
    remaining: allowance.remaining === null ? null : allowance.remaining - 1,
  });
}
