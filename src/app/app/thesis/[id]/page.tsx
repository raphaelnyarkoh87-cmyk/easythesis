"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Info, Lock, Search, Sparkles } from "lucide-react";
import { CitedProse } from "@/components/cited-prose";
import { FileDrop } from "@/components/file-drop";
import { SourceCard } from "@/components/source-card";
import { Button, ButtonLink, inputClass } from "@/components/ui";
import { CHAPTERS } from "@/lib/academic";
import { Loading } from "@/components/app-shell";
import { deleteDocument, uploadDocuments, useAccount, useProject } from "@/lib/store";
import { PLANS } from "@/lib/plans";
import type { UploadedDocument } from "@/lib/types";

const PENDING = {
  draft:
    "Drafting switches on in Stage 5, when the writing engine is connected. The layout and controls here are final.",
  search:
    "Literature search switches on in Stage 4, when OpenAlex, Semantic Scholar and Crossref are connected.",
};

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
  const [query, setQuery] = useState("");
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
              <Button size="sm" onClick={() => setNotice(PENDING.draft)}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Draft chapter
              </Button>
            ) : null}
          </div>

          {notice ? <div className="mt-4">{<Notice>{notice}</Notice>}</div> : null}

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
                return (
                  <li key={section}>
                    <h3 className="font-serif text-lg font-semibold text-forest">
                      {spec.number}.{i + 1} {section}
                    </h3>
                    {paragraphs?.length ? (
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
                            onClick={() => setNotice(PENDING.draft)}
                            className="text-sm font-medium text-leaf underline underline-offset-4"
                          >
                            Draft this section
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Sources */}
        <aside aria-labelledby="sources-heading" className="lg:sticky lg:top-24 lg:h-fit">
          <div className="flex items-baseline justify-between">
            <h2 id="sources-heading" className="font-semibold text-forest">
              Sources
            </h2>
            <p className="text-sm text-muted">
              {verified} of {project.sources.length} verified
            </p>
          </div>
          {readOnly ? null : (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setNotice(PENDING.search);
              }}
            >
              <label htmlFor="lit-search" className="sr-only">
                Search for literature
              </label>
              <input
                id="lit-search"
                className={`${inputClass} py-2 text-sm`}
                placeholder="Search published literature"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button size="sm" type="submit" aria-label="Search">
                <Search className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          )}
          {project.sources.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted">
              No sources yet. Search above, and the papers you keep appear here. Drafts can cite
              only these papers.
            </p>
          ) : (
            <ul className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {project.sources.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSource(s.id)}
                    className="block w-full text-left"
                  >
                    <SourceCard source={s} style={project.referencing} active={activeSource === s.id} />
                  </button>
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
