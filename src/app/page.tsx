import { BadgeCheck, BookOpenCheck, FileWarning, Lock } from "lucide-react";
import { HeroDemo } from "@/components/hero-demo";
import { PricingTable } from "@/components/pricing-table";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ButtonLink } from "@/components/ui";
import { CHAPTERS } from "@/lib/academic";

const STEPS = [
  {
    title: "Describe your study",
    body: "Give your topic, discipline, level and objectives. Upload your approved proposal if you have one.",
  },
  {
    title: "Collect the literature",
    body: "EasyThesis searches OpenAlex, Semantic Scholar and Crossref for published work on your topic. You keep the papers you want and remove the rest.",
  },
  {
    title: "Approve the outline",
    body: "Each chapter starts as an outline that follows the structure your department expects. Change it before anything is written.",
  },
  {
    title: "Draft and revise",
    body: "Draft one section or a whole chapter. Every citation links to its source, and sentences without one are flagged for you to fix.",
  },
  {
    title: "Add your own data",
    body: "Chapters 4 and 5 open once you upload your results, transcripts or survey output. EasyThesis writes about your findings and never makes them up.",
  },
  {
    title: "Export to Word",
    body: "Download a formatted .docx with your reference list in APA 7th edition or Harvard style.",
  },
];

const SAFEGUARDS = [
  {
    icon: BookOpenCheck,
    title: "Cites only what it retrieved",
    body: "Drafts can cite only papers in your source list. If a paper is not there, it cannot appear in your thesis.",
  },
  {
    icon: BadgeCheck,
    title: "Checks every DOI",
    body: "Each source is matched against Crossref before it is used. Sources that fail the check are left out.",
  },
  {
    icon: FileWarning,
    title: "Flags unsupported sentences",
    body: "When a sentence makes a claim no source supports, it is marked so you can add a source or rewrite it.",
  },
  {
    icon: Lock,
    title: "Never invents findings",
    body: "Results chapters stay locked until you provide your data. Reported numbers and quotations come from your files.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h1 className="font-serif text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-forest sm:text-[3.4rem]">
                Draft your thesis from sources you can check.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                EasyThesis finds published literature on your topic, drafts Chapters 1 to 5 in
                the structure your department expects, and shows the source behind every
                citation. You review, edit and remain the author.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup">Start free</ButtonLink>
                <ButtonLink href="/app/thesis/example" variant="secondary">
                  Open the example thesis
                </ButtonLink>
              </div>
              <p className="mt-6 text-sm text-muted">
                For the social sciences and humanities. Pay with MoMo, Telecel Cash, AirtelTigo
                Money, card or bank.
              </p>
            </div>
            <HeroDemo />
          </div>
        </section>

        {/* Steps */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 className="max-w-2xl font-serif text-3xl font-semibold tracking-tight text-forest sm:text-4xl">
              From topic to five chapters
            </h2>
            <ol className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {STEPS.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[2.75rem_1fr] gap-4">
                  <span
                    className="font-serif text-4xl font-semibold leading-none text-sprout"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-forest">{step.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Chapters */}
        <section className="bg-mint">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 className="max-w-2xl font-serif text-3xl font-semibold tracking-tight text-forest sm:text-4xl">
              What each chapter covers
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              The structure follows common practice in Ghanaian and other African universities.
              You can rename, add or remove sections to match your department&apos;s guide.
            </p>
            <ol className="mt-12 divide-y divide-line border-y border-line">
              {CHAPTERS.map((c) => (
                <li key={c.number} className="grid gap-3 py-6 md:grid-cols-[12rem_1fr]">
                  <div>
                    <p className="text-sm text-muted">Chapter {c.number}</p>
                    <h3 className="font-serif text-xl font-semibold text-forest">{c.title}</h3>
                    {c.needsUserData ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-leaf">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        Uses your data
                      </p>
                    ) : null}
                  </div>
                  <p className="leading-relaxed text-muted">
                    <span className="text-ink">{c.purpose}</span> {c.sections.join("; ")}.
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Safeguards */}
        <section>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
            <h2 className="max-w-2xl font-serif text-3xl font-semibold tracking-tight text-forest sm:text-4xl">
              How drafts stay honest
            </h2>
            <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
              {SAFEGUARDS.map((s) => (
                <div key={s.title} className="flex gap-4">
                  <s.icon className="mt-1 h-6 w-6 shrink-0 text-leaf" aria-hidden="true" />
                  <div>
                    <h3 className="text-lg font-semibold text-forest">{s.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-muted">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="border-t border-line bg-mint">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-forest sm:text-4xl">
              Start free, upgrade when you need every chapter
            </h2>
            <div className="mt-10">
              <PricingTable />
            </div>
          </div>
        </section>

        {/* Responsible use */}
        <section>
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <h2 className="font-serif text-2xl font-semibold text-forest">Use it the way your university allows</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Universities set their own rules on AI assistance. Read your institution&apos;s
              policy, discuss EasyThesis with your supervisor, and disclose its use where
              required. Every export includes an optional disclosure statement you can adapt.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
