import { NextResponse, type NextRequest } from "next/server";
import { CHAPTERS } from "@/lib/academic";
import { buildPrompt, checkDraft, parseModelJson, type DraftSource } from "@/lib/ai/draft";
import { configuredProviders, generate, ProviderError } from "@/lib/ai/provider";
import { loadDocumentTexts } from "@/lib/server/documents";
import { checkAllowance, jsonError, requireOwnedProject } from "@/lib/server/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const RUN_HOURS = 2;
const MIN_SOURCES: Record<number, number> = { 1: 3, 2: 5 };

/**
 * Drafts one section of a chapter.
 * The first section starts a drafting session that counts once against
 * the plan; the remaining sections of that chapter reuse the session.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const owned = await requireOwnedProject(body.projectId);
  if ("error" in owned) return owned.error;
  const { user, project } = owned;

  const chapter = CHAPTERS.find((c) => c.number === body.chapter);
  if (!chapter) return jsonError(400, "Choose a chapter from 1 to 5.");
  const section = typeof body.section === "string" ? body.section : "";
  if (!chapter.sections.includes(section)) return jsonError(400, "That section is not part of this chapter.");

  if (configuredProviders().length === 0) {
    return jsonError(503, "The writing engine is not set up yet. The site owner needs to add an AI key.");
  }

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return jsonError(503, "Drafting is not set up yet. The site owner needs to add the server key.");
  }

  // Plan: which chapters this user may draft.
  const allowance = await checkAllowance(user.id, "chapter_draft");
  const { data: limits } = await admin.from("plan_limits").select("chapters").eq("plan", allowance.plan).single();
  if (!(limits?.chapters as number[] | undefined)?.includes(chapter.number)) {
    return jsonError(402, `Chapter ${chapter.number} is part of Premium. Get Premium to draft Chapters 2 to 5.`, {
      upgrade: true,
    });
  }

  // Inputs the chapter needs.
  const { data: sourceRows } = await admin
    .from("sources")
    .select("id, authors, year, title, venue, abstract, verification")
    .eq("project_id", project.id)
    .eq("verification", "verified")
    .order("created_at");
  const sources: DraftSource[] = (sourceRows ?? []).map((s) => ({
    id: s.id,
    authors: s.authors ?? [],
    year: s.year,
    title: s.title,
    venue: s.venue,
    abstract: s.abstract,
  }));
  const needed = MIN_SOURCES[chapter.number] ?? 0;
  if (sources.length < needed) {
    return jsonError(
      400,
      `Chapter ${chapter.number} needs at least ${needed} verified sources. You have ${sources.length}. Search the literature and add more first.`,
    );
  }

  const dataDocs = chapter.needsUserData ? await loadDocumentTexts(project.id, ["data"]) : [];
  const readableData = dataDocs.filter((d) => d.text.length > 50);
  if (chapter.needsUserData && readableData.length === 0) {
    const notes = dataDocs.map((d) => d.note).filter(Boolean);
    return jsonError(
      400,
      notes.length
        ? `Your data could not be read. ${notes[0]}`
        : `Chapter ${chapter.number} is written from your data. Upload your results first.`,
    );
  }
  const allProposalDocs = await loadDocumentTexts(project.id, ["proposal", "literature", "other"]);
  const proposalDocs = allProposalDocs.filter((d) => d.text.length > 50);

  // Drafting session: reuse a recent one for this chapter, or start (and count) a new one.
  let runId = typeof body.runId === "number" ? body.runId : null;
  if (runId !== null) {
    const { data: run } = await admin
      .from("usage_events")
      .select("id, created_at")
      .eq("id", runId)
      .eq("user_id", user.id)
      .eq("project_id", project.id)
      .eq("kind", "chapter_draft")
      .eq("chapter", chapter.number)
      .maybeSingle();
    if (!run || Date.now() - new Date(run.created_at).getTime() > RUN_HOURS * 3_600_000) runId = null;
  }
  if (runId === null) {
    if (!allowance.allowed) return jsonError(402, allowance.reason ?? "Limit reached.", { upgrade: true });
  }

  // Continuity: sections already drafted in this chapter, and Chapter 4 when writing Chapter 5.
  const { data: chapterRows } = await admin
    .from("chapters")
    .select("number, sections")
    .eq("project_id", project.id)
    .in("number", chapter.number === 5 ? [4, 5] : [chapter.number]);
  const context: { heading: string; text: string }[] = [];
  for (const row of chapterRows ?? []) {
    const sections = (row.sections ?? {}) as Record<string, string[]>;
    for (const [heading, paras] of Object.entries(sections)) {
      if (row.number === chapter.number && heading === section) continue;
      context.push({
        heading: `Chapter ${row.number}, ${heading}`,
        text: paras.join(" ").replace(/\[\[[^\]]+\]\]/g, ""),
      });
    }
  }

  const { system, prompt, labels } = buildPrompt({
    project: {
      title: project.title,
      discipline: project.discipline,
      level: project.level,
      approach: project.approach,
      referencing: project.referencing,
      objectives: project.objectives,
    },
    chapter,
    section,
    sources,
    proposalTexts: proposalDocs,
    dataTexts: readableData,
    context: context.slice(-6),
  });

  let generated;
  try {
    generated = await generate({ system, prompt, maxTokens: 4000, temperature: 0.3 });
  } catch (e) {
    const msg = e instanceof ProviderError ? e.message : "unknown error";
    console.error("[draft] generation failed:", msg);
    return jsonError(502, "The writing engine is busy or unavailable. Wait a minute and try again. You were not charged for this attempt.");
  }

  const result = checkDraft(parseModelJson(generated.text), labels, { allowData: chapter.needsUserData });
  if (result.paragraphs.length === 0) {
    return jsonError(502, "The writing engine returned an unusable draft. Try again.");
  }

  // Count the session only once a draft actually succeeded.
  if (runId === null) {
    const { data: ev } = await admin
      .from("usage_events")
      .insert({ user_id: user.id, kind: "chapter_draft", project_id: project.id, chapter: chapter.number })
      .select("id")
      .single();
    runId = (ev?.id as number) ?? null;
  }

  // Save into the chapter.
  const { data: current } = await admin
    .from("chapters")
    .select("sections")
    .eq("project_id", project.id)
    .eq("number", chapter.number)
    .single();
  const sections = { ...((current?.sections ?? {}) as Record<string, string[]>), [section]: result.paragraphs };
  await admin
    .from("chapters")
    .update({ sections, status: "drafted", drafted_with: generated.provider })
    .eq("project_id", project.id)
    .eq("number", chapter.number);

  return NextResponse.json({
    paragraphs: result.paragraphs,
    notes: result.notes,
    stats: result.stats,
    runId,
    engine: generated.provider,
    skippedFiles: [...dataDocs, ...allProposalDocs].filter((d) => d.note).map((d) => `${d.name}: ${d.note}`),
  });
}
