import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Responsible use" };

const POINTS = [
  {
    title: "Check your university's rules first",
    body: "Institutions differ on whether and how AI tools may be used in assessed work. Read your university's policy and your department's thesis guide before using EasyThesis.",
  },
  {
    title: "Talk to your supervisor",
    body: "Tell your supervisor how you are using EasyThesis. Many supervisors welcome help with structure and literature searching but expect the argument and analysis to be yours.",
  },
  {
    title: "Disclose where required",
    body: "Every Word export can include a disclosure statement describing how EasyThesis was used. Edit it to match what you actually did.",
  },
  {
    title: "Read every source you cite",
    body: "EasyThesis drafts from abstracts and metadata, plus any full texts you upload. Open each paper and confirm it says what your thesis says it does.",
  },
  {
    title: "How your work is processed",
    body: "EasyThesis uses Google's Gemini service to draft text. The details of your thesis, your sources and the files you upload are sent to Google for each draft. On the free Gemini service that EasyThesis currently uses, Google may use this text to improve its products, and Google staff may read it. Do not upload anything you are not willing to share on those terms.",
  },
  {
    title: "Protect your research participants",
    body: "Remove names, phone numbers, addresses and any other details that could identify a participant before you upload transcripts or data. Your ethics approval may require this.",
  },
  {
    title: "Your data, your findings",
    body: "Chapters 4 and 5 describe the data you provide. Never ask EasyThesis to produce results you did not collect. Fabricating data is research misconduct.",
  },
];

export default function ResponsibleUsePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 md:py-20">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-forest">
          Responsible use
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          EasyThesis produces drafts to help you write. You remain the author and are
          responsible for what you submit.
        </p>
        <dl className="mt-10 space-y-8">
          {POINTS.map((p) => (
            <div key={p.title}>
              <dt className="text-lg font-semibold text-forest">{p.title}</dt>
              <dd className="mt-1.5 leading-relaxed text-muted">{p.body}</dd>
            </div>
          ))}
        </dl>
      </main>
      <SiteFooter />
    </>
  );
}
