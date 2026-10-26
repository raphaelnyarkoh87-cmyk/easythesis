"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Info, Loader2, Lock, RefreshCw, Sparkles } from "lucide-react";
import { CitedProse } from "@/components/cited-prose";
import { FileDrop } from "@/components/file-drop";
import { SourceCard } from "@/components/source-card";
import { Button, ButtonLink } from "@/components/ui";
import { CHAPTERS } from "@/lib/academic";
import { Loading } from "@/components/app-shell";
import { LiteratureSearch } from "@/components/literature-search";
import {
  deleteDocument,
  draftSection,
  removeSource,
  uploadDocuments,
  useAccount,
  useProject,
} from "@/lib/store";
import { PLANS } from "@/lib/plans";
import type { UploadedDocument } from "@/lib/types";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex gap-2 rounded-lg bg-mint px-4 py-3 text-sm text-forest">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export default function ThesisWorkspace() {
  const { id } = useParams<{ id: string }>();
  const project = useProject(id);
  const account = useAccount();
  const [chapterNo, setChapterNo] = useState(1);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<{ text: string; upgrade?: boolean } | null>(null);
  // A ref, so every section in a whole-chapter run sees the session id at once.
  const runs = useRef<Record<number, number>>({});
  const [drafting, setDrafting] = useState<{ chapter: number; section: string; index: number; total: number } | null>(null);
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>({});
  const params = useSearchParams();
  const [uploading, setUploading] = useState<UploadedDocument["kind"] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(
    params.get("upload") === "failed"
      ? "Your thesis was created, but some files did not upload. Add them again below."
      : null,
  );

  if (project === undefined) return <Loading label="Opening your thesis" />;

  if (!project) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-serif text-2xl font-semibold text-forest">Thesis not found</h1>
        <p className="mt-2 text-muted">It may have been deleted, or it belongs to another account.</p>
        <ButtonLink href="/app" className="mt-6">
          Back to my theses
        </ButtonLink>
      </main>
    );
  }

  const readOnly = !!project.isExample;
  const spec = CHAPTERS.find((c) => c.number === chapterNo)!;
  const draft = project.chapters.find((c) => c.number === chapterNo);
  const plan = PLANS[account?.plan ?? "free"];
  const planLocked = !readOnly && !plan.limits.chaptersAvailable.includes(chapterNo);
  const dataFiles = project.documents.filter((d) => d.kind === "data");
  const dataLocked = spec.needsUserData && dataFiles.length === 0;
  const verified = project.sources.filter((s) => s.verification === "verified").length;

  function chapterState(n: number) {
    const s = CHAPTERS.find((c) => c.number === n)!;
    if (!readOnly && !plan.limits.chaptersAvailable.includes(n)) return "Premium";
    if (s.needsUserData && dataFiles.length === 0) return "Needs your data";
    const st = project!.chapters.find((c) => c.number === n)?.status;
    return st === "drafted" ? "Drafted" : st === "outlined" ? "Outlined" : "Not started";
  }

  const suggestion = project.title.split(/\s+/).slice(0, 8).join(" ");
  const otherFiles = project.documents.filter((d) => d.kind !== "data");
  const uploadsLeft =
    plan.limits.uploads === null
      ? null
      : Math.max(0, plan.limits.uploads - (account?.usage.uploads ?? 0));

  async function addFiles(files: File[], kind: UploadedDocument["kind"]) {
    setUploading(kind);
    setUploadError(null);
    const res = await uploadDocuments(project!.id, files, kind);
    setUploading(null);
    if (res.errors.length) setUploadError(res.errors.join(" "));
  }

  async function removeFile(id: string) {
    const doc = project!.documents.find((d) => d.id === id);
    if (!doc) return;
    if (!window.confirm(`Remove ${doc.name}? This deletes the file from EasyThesis.`)) return;
    const res = await deleteDocument(doc);
    if (res.error) setUploadError(res.error);
  }

  async function draftOne(section: string, index = 1, total = 1): Promise<boolean> {
    setDrafting({ chapter: spec.number, section, index, total });
    setDraftError(null);
    const res = await draftSection(project!.id, spec.number, section, runs.current[spec.number] ?? null);
    setDrafting(null);
    if (res.error || !res.data) {
      setDraftError({ text: res.error ?? "Drafting failed. Try again.", upgrade: res.upgrade });
      return false;
    }
    const d = res.data;
    if (d.runId !== null) runs.current[spec.number] = d.runId;
    const parts = [d.notes, ...d.skippedFiles].filter(Boolean);
    if (d.stats.removedCitations > 0)
      parts.push(
        `${d.stats.removedCitations} citation${d.stats.removedCitations === 1 ? "" : "s"} to papers outside your source list ${d.stats.removedCitations === 1 ? "was" : "were"} removed and flagged.`,
      );
    setSectionNotes((n) => ({ ...n, [`${spec.number}:${section}`]: parts.join(" ") }));
    return true;
  }

  async function draftChapter() {
    const missing = spec.sections.filter((s) => !draft?.sections[s]?.length);
    const targets = missing.length ? missing : spec.sections;
    if (!missing.length && !window.confirm("Every section already has a draft. Redraft the whole chapter?")) return;
    for (let i = 0; i < targets.length; i++) {
      const ok = await draftOne(targets[i], i + 1, targets.length);
      if (!ok) break;
    }
  }

  const busy = drafting !== null;

  const listed = (docs: UploadedDocument[]) =>
    docs.map((d) => ({ id: d.id, name: d.name, sizeBytes: d.sizeBytes }));

  return (
    <main>
      {readOnly ? (
        <div className="border-b border-line bg-mint">
          <p className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm text-forest sm:px-6">
            This is an example thesis. It is read-only.
            <Link href={account ? "/app/new" : "/signup"} className="font-medium text-leaf underline underline-offset-4">
              Start your own
            </Link>
          </p>
        </div>
      ) : null}

      <div className="border-b border-line">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <p className="text-sm text-muted">
            {project.discipline}, {project.level}, {project.approach.toLowerCase()}, {project.referencing}
          </p>
          <h1 className="mt-1 max-w-4xl font-serif text-2xl font-semibold leading-snug text-forest sm:text-[1.75rem]">
            {project.title}
          </h1>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)_21rem]">
        {/* Chapter navigation */}
        <nav aria-label="Chapters" className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
          <ol className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
            {CHAPTERS.map((c) => {
              const active = c.number === chapterNo;
              const state = chapterState(c.number);
              return (
                <li key={c.number} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setChapterNo(c.number);
                      setNotice(null);
                    }}
                    aria-current={active ? "step" : undefined}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      active ? "bg-forest text-white" : "hover:bg-mint"
                    }`}
                  >
                    <span className={`block text-xs ${active ? "text-sprout" : "text-muted"}`}>
                      Chapter {c.number}, {state.toLowerCase()}
                    </span>
                    <span className="block whitespace-nowrap text-sm font-medium lg:whitespace-normal">
                      {c.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Chapter body */}
        <section aria-labelledby="chapter-heading" className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="chapter-heading" className="font-serif text-2xl font-semibold text-forest">
                Chapter {spec.number}: {spec.title}
              </h2>
              <p className="mt-1 text-muted">{spec.purpose}</p>
            </div>
            {!readOnly && !planLocked && !dataLocked ? (
              <Button size="sm" onClick={draftChapter} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                {busy && drafting?.total && drafting.total > 1
                  ? `Drafting ${drafting.index} of ${drafting.total}…`
                  : "Draft chapter"}
              </Button>
            ) : null}
          </div>

          {notice ? <div className="mt-4">{<Notice>{notice}</Notice>}</div> : null}
          {draftError ? (
            <p role="alert" className="mt-4 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">
              {draftError.text}{" "}
              {draftError.upgrade ? (
                <Link href="/app/upgrade" className="font-medium underline underline-offset-2">
                  Get Premium
                </Link>
              ) : null}
            </p>
          ) : null}
          {!readOnly && !planLocked && !dataLocked && spec.needsUserData ? (
            <details className="mt-4 rounded-lg border border-line px-4 py-3 text-sm">
              <summary className="cursor-pointer text-forest">
                Written from your data: {dataFiles.map((f) => f.name).join(", ")}
              </summary>
              <div className="mt-3">
                <FileDrop
                  accept=".xlsx,.csv,.pdf,.docx,.txt"
                  acceptLabel="Excel, CSV, PDF, Word or text"
                  files={listed(dataFiles)}
                  onAdd={(files) => addFiles(files, "data")}
                  onRemove={removeFile}
                  remaining={uploadsLeft}
                  busy={uploading === "data"}
                  error={uploadError}
                  label="Add more data"
                />
              </div>
            </details>
          ) : null}

          {planLocked ? (
            <div className="mt-8 rounded-xl border border-line p-6">
              <Lock className="h-5 w-5 text-leaf" aria-hidden="true" />
              <h3 className="mt-3 font-serif text-xl font-semibold text-forest">
                Chapter {spec.number} is part of Premium
              </h3>
              <p className="mt-2 max-w-prose text-muted">
                The Free plan covers Chapter 1. Premium opens Chapters 2 to 5 with unlimited
                drafts and literature searches for 30 days.
              </p>
              <ButtonLink href="/app/upgrade" className="mt-5">
                Get Premium
              </ButtonLink>
            </div>
          ) : dataLocked ? (
            <div className="mt-8 rounded-xl border border-line p-6">
              <Lock className="h-5 w-5 text-leaf" aria-hidden="true" />
              <h3 className="mt-3 font-serif text-xl font-semibold text-forest">
                Add your data to open Chapter {spec.number}
              </h3>
              <p className="mt-2 max-w-prose text-muted">
                This chapter reports and interprets your findings, so it is written only from the
                data you collected. Upload your SPSS, Stata or Excel output, coded interview
                transcripts, or a summary of your results.
              </p>
              {readOnly ? null : (
                <div className="mt-5">
                  <FileDrop
                    accept=".xlsx,.xls,.csv,.sav,.dta,.pdf,.docx,.txt"
                    acceptLabel="Excel, CSV, SPSS, Stata, PDF, Word or text"
                    files={listed(dataFiles)}
                    onAdd={(files) => addFiles(files, "data")}
                    onRemove={removeFile}
                    remaining={uploadsLeft}
                    busy={uploading === "data"}
                    error={uploadError}
                    label="Upload your data"
                  />
                </div>
              )}
            </div>
          ) : (
            <ol className="mt-8 space-y-8">
              {spec.sections.map((section, i) => {
                const paragraphs = draft?.sections[section];
                const isDrafting = drafting?.section === section && drafting.chapter === spec.number;
                const note = sectionNotes[`${spec.number}:${section}`];
                return (
                  <li key={section} aria-busy={isDrafting}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-serif text-lg font-semibold text-forest">
                        {spec.number}.{i + 1} {section}
                      </h3>
                      {paragraphs?.length && !readOnly ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => draftOne(section)}
                          className="inline-flex items-center gap-1 text-sm text-muted hover:text-forest disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                          Redraft
                        </button>
                      ) : null}
                    </div>
                    {isDrafting ? (
                      <p role="status" className="mt-3 inline-flex items-center gap-2 text-sm text-leaf">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Drafting from your sources…
                      </p>
                    ) : paragraphs?.length ? (
                      <div className="mt-3">
                        <CitedProse
                          paragraphs={paragraphs}
                          sources={project.sources}
                          style={project.referencing}
                          activeSourceId={activeSource}
                          onSelectSource={setActiveSource}
                        />
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <p className="text-sm text-muted">Not drafted yet.</p>
                        {readOnly ? null : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => draftOne(section)}
                            className="text-sm font-medium text-leaf underline underline-offset-4 disabled:opacity-50"
                          >
                            Draft this section
                          </button>
                        )}
                      </div>
                    )}
                    {note && !isDrafting ? (
                      <p className="mt-3 flex max-w-prose gap-2 rounded-lg bg-mint px-3 py-2 text-sm text-forest">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden="true" />
                        <span>{note}</span>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Sources */}
        <aside aria-labelledby="sources-heading" className="min-w-0">
          <div className="flex items-baseline justify-between">
            <h2 id="sources-heading" className="font-semibold text-forest">
              Literature
            </h2>
            <p className="text-sm text-muted">
              {verified} of {project.sources.length} verified
            </p>
          </div>
          {readOnly ? null : (
            <div className="mt-3">
              <LiteratureSearch
                projectId={project.id}
                suggestion={suggestion}
                remainingSearches={
                  plan.limits.literatureSearchesPerMonth === null
                    ? null
                    : Math.max(
                        0,
                        plan.limits.literatureSearchesPerMonth - (account?.usage.literatureSearches ?? 0),
                      )
                }
              />
            </div>
          )}
          {project.sources.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted">
              No sources yet. Search above and add the papers you want to use. Drafts can cite
              only papers in this list.
            </p>
          ) : (
            <ul className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {project.sources.map((s) => (
                <li key={s.id}>
                  <SourceCard
                    source={s}
                    style={project.referencing}
                    active={activeSource === s.id}
                    onSelect={() => setActiveSource(s.id)}
                    onRemove={
                      readOnly
                        ? undefined
                        : async () => {
                            if (!window.confirm("Remove this paper from your sources?")) return;
                            const res = await removeSource(s.id);
                            if (res.error) setNotice(res.error);
                          }
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          {readOnly ? null : (
            <section aria-labelledby="files-heading" className="mt-10">
              <h2 id="files-heading" className="font-semibold text-forest">
                Your files
              </h2>
              <p className="mt-1 text-sm text-muted">
                Your proposal, supervisor comments or papers you already have. EasyThesis reads
                them before drafting.
              </p>
              <div className="mt-3">
                <FileDrop
                  accept=".pdf,.docx,.doc,.txt"
                  acceptLabel="PDF, Word or text"
                  files={listed(otherFiles)}
                  onAdd={(files) => addFiles(files, "proposal")}
                  onRemove={removeFile}
                  remaining={uploadsLeft}
                  busy={uploading === "proposal"}
                  error={dataLocked ? null : uploadError}
                  label="Add files"
                />
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
