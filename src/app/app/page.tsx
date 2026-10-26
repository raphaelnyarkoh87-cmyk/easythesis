"use client";

import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { CHAPTERS } from "@/lib/academic";
import { Loading } from "@/components/app-shell";
import { exampleProject, useAccount, useProjects } from "@/lib/store";
import { PLANS } from "@/lib/plans";
import type { Project } from "@/lib/types";

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-forest">{label}</span>
        <span className="text-muted">{limit === null ? "Unlimited" : `${used} of ${limit}`}</span>
      </div>
      {limit !== null ? (
        <div className="mt-1.5 h-1.5 rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const drafted = project.chapters.filter((c) => c.status === "drafted").length;
  return (
    <li>
      <Link
        href={`/app/thesis/${project.id}`}
        className="grid gap-4 rounded-xl border border-line bg-white p-5 hover:border-leaf sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-semibold leading-snug text-forest">
            {project.title}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {project.discipline}, {project.level}
            {project.isExample ? <span className="ml-2 rounded bg-mint px-1.5 py-0.5 text-leaf">Example</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-1.5" aria-label={`${drafted} of 5 chapters drafted`}>
          {CHAPTERS.map((c) => {
            const status = project.chapters.find((x) => x.number === c.number)?.status;
            return (
              <span
                key={c.number}
                className={`grid h-8 w-8 place-items-center rounded-md text-sm font-medium ${
                  status === "drafted"
                    ? "bg-leaf text-white"
                    : status === "outlined"
                      ? "bg-sprout text-forest"
                      : "border border-line text-muted"
                }`}
              >
                {c.number}
              </span>
            );
          })}
        </div>
      </Link>
    </li>
  );
}

export default function Dashboard() {
  const account = useAccount();
  const projects = useProjects();
  if (!account || projects === undefined) return <Loading />;
  const plan = PLANS[account.plan];
  const atProjectLimit = plan.limits.projects !== null && projects.length >= plan.limits.projects;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-forest">My theses</h1>
          <p className="mt-1 text-muted">Signed in as {account.name}</p>
        </div>
        <ButtonLink href={atProjectLimit ? "/app/upgrade" : "/app/new"}>
          <FilePlus2 className="h-4 w-4" aria-hidden="true" />
          New thesis
        </ButtonLink>
      </div>

      {atProjectLimit ? (
        <p className="mt-6 rounded-lg bg-mint px-4 py-3 text-sm text-forest">
          The Free plan includes one thesis project.{" "}
          <Link href="/app/upgrade" className="font-medium text-leaf underline underline-offset-4">
            Get Premium
          </Link>{" "}
          to start another.
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="sr-only">
            Projects
          </h2>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
              <p className="font-serif text-xl text-forest">Start your first thesis</p>
              <p className="mx-auto mt-2 max-w-sm text-muted">
                Describe your study and EasyThesis will gather literature and outline Chapter 1.
              </p>
              <ButtonLink href="/app/new" className="mt-6">
                New thesis
              </ButtonLink>
            </div>
          ) : (
            <ul className="space-y-3">
              {projects.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </ul>
          )}
          <h2 className="mt-10 text-sm font-medium text-muted">Example to explore</h2>
          <ul className="mt-3">
            <ProjectRow project={exampleProject} />
          </ul>
        </section>

        <aside className="h-fit space-y-5 rounded-xl bg-mint p-5">
          <div>
            <h2 className="font-semibold text-forest">{plan.name} plan</h2>
            {account.plan === "premium" && account.premiumUntil ? (
              <p className="text-sm text-muted">
                Active until {new Date(account.premiumUntil).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            ) : (
              <p className="text-sm text-muted">Usage this month</p>
            )}
          </div>
          <Meter label="Thesis projects" used={projects.length} limit={plan.limits.projects} />
          <Meter label="Chapter drafts" used={account.usage.chapterDrafts} limit={plan.limits.chapterDraftsPerMonth} />
          <Meter
            label="Literature searches"
            used={account.usage.literatureSearches}
            limit={plan.limits.literatureSearchesPerMonth}
          />
          <Meter label="Document uploads" used={account.usage.uploads} limit={plan.limits.uploads} />
          {account.plan === "free" ? (
            <ButtonLink href="/app/upgrade" className="w-full">
              Get Premium
            </ButtonLink>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
