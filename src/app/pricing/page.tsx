import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing-table";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Pricing" };

const QUESTIONS = [
  {
    q: "Why doesn't Premium renew automatically?",
    a: "Mobile money wallets cannot be charged on a schedule, so Premium is a prepaid pass. EasyThesis reminds you when you sign in during the last three days, and you renew with one payment. Renewing early adds 30 days to the time you have left.",
  },
  {
    q: "Which payment methods can I use?",
    a: "MTN MoMo, Telecel Cash, AirtelTigo Money, Visa or Mastercard, and bank payment. Payments are processed by Paystack, a licensed payment provider. EasyThesis never sees your PIN or card details.",
  },
  {
    q: "What happens to my work if Premium ends?",
    a: "Nothing is deleted. You keep reading and editing everything you drafted, and you can draft again once you renew.",
  },
  {
    q: "Can I get a refund?",
    a: "If you have not drafted any chapter since paying, contact us within 7 days for a full refund.",
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 md:py-20">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-forest sm:text-5xl">
          Pricing
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Free covers one project and Chapter 1. Premium opens every chapter with no usage
          limits for 30 days.
        </p>
        <div className="mt-10">
          <PricingTable upgradeHref="/app/upgrade" />
        </div>
        <section className="mt-20 max-w-3xl">
          <h2 className="font-serif text-2xl font-semibold text-forest">Questions about paying</h2>
          <dl className="mt-6 divide-y divide-line border-y border-line">
            {QUESTIONS.map((item) => (
              <div key={item.q} className="py-5">
                <dt className="font-semibold text-forest">{item.q}</dt>
                <dd className="mt-1.5 leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
