"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileDrop } from "@/components/file-drop";
import { Button, ButtonLink, Field, inputClass } from "@/components/ui";
import { APPROACHES, DISCIPLINES, LEVELS, REFERENCING_STYLES } from "@/lib/academic";
import { createProject, useAccount } from "@/lib/demo-store";
import { PLANS } from "@/lib/plans";
import type { UploadedDocument } from "@/lib/types";

export default function NewThesisPage() {
  const router = useRouter();
  const account = useAccount();
  const [title, setTitle] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [level, setLevel] = useState<string>(LEVELS[1]);
  const [approach, setApproach] = useState<string>(APPROACHES[0]);
  const [referencing, setReferencing] = useState<string>(REFERENCING_STYLES[0]);
  const [institution, setInstitution] = useState("");
  const [objectives, setObjectives] = useState("");
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!account) return null;
  const uploadLimit = PLANS[account.plan].limits.uploads;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 10) return setError("Enter your working title. It needs at least 10 characters.");
    if (!discipline) return setError("Choose your discipline.");
    if (objectives.trim().length < 20)
      return setError("Add your research objectives. They guide the literature search and every chapter.");
    setError(null);
    const project = createProject(
      {
        title: title.trim(),
        discipline,
        level,
        approach,
        referencing,
        institution: institution.trim() || undefined,
        objectives: objectives.trim(),
      },
      documents,
    );
    router.push(`/app/thesis/${project.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-forest">New thesis</h1>
      <p className="mt-2 text-muted">
        These details shape the literature search and every chapter. You can change them later.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-7" noValidate>
        <Field
          label="Working title"
          htmlFor="title"
          hint="For example: Teacher motivation and pupil performance in public basic schools in the Effutu Municipality"
        >
          <textarea
            id="title"
            rows={2}
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <div className="grid gap-7 sm:grid-cols-2">
          <Field label="Discipline" htmlFor="discipline">
            <select
              id="discipline"
              className={inputClass}
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
            >
              <option value="">Choose a discipline</option>
              {Object.entries(DISCIPLINES).map(([group, list]) => (
                <optgroup key={group} label={group}>
                  {list.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Level" htmlFor="level">
            <select id="level" className={inputClass} value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Research approach" htmlFor="approach">
            <select
              id="approach"
              className={inputClass}
              value={approach}
              onChange={(e) => setApproach(e.target.value)}
            >
              {APPROACHES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Referencing style" htmlFor="referencing">
            <select
              id="referencing"
              className={inputClass}
              value={referencing}
              onChange={(e) => setReferencing(e.target.value)}
            >
              {REFERENCING_STYLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="University (optional)" htmlFor="institution" hint="Used to follow your institution's chapter conventions.">
          <input
            id="institution"
            className={inputClass}
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />
        </Field>

        <Field
          label="Research objectives or questions"
          htmlFor="objectives"
          hint="One per line. Copy them from your approved proposal if you have one."
        >
          <textarea
            id="objectives"
            rows={5}
            className={inputClass}
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
          />
        </Field>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-forest">Proposal or supporting documents (optional)</p>
          <p className="text-sm text-muted">
            Your proposal, supervisor comments or papers you already have. EasyThesis reads them
            before drafting.
          </p>
          <div className="pt-1">
            <FileDrop
              kind="proposal"
              accept=".pdf,.docx,.doc,.txt"
              acceptLabel="PDF, Word or text"
              files={documents}
              onChange={setDocuments}
              maxFiles={uploadLimit}
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-line pt-7">
          <Button type="submit">Create thesis</Button>
          <ButtonLink href="/app" variant="quiet">
            Cancel
          </ButtonLink>
        </div>
      </form>
    </main>
  );
}
