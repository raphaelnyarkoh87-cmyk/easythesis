"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { confirmPremiumPayment, type PaymentOutcome } from "@/lib/store";

const AUTO_CHECKS = 6;
const CHECK_EVERY_MS = 5000;

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function Complete() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? params.get("trxref") ?? "";
  const [outcome, setOutcome] = useState<PaymentOutcome | { state: "checking" } | { state: "error"; message: string }>(
    { state: "checking" },
  );
  const checks = useRef(0);

  const check = useCallback(async () => {
    if (!reference) {
      setOutcome({ state: "error", message: "No payment reference was found. Open Get Premium and try again." });
      return;
    }
    setOutcome({ state: "checking" });
    const res = await confirmPremiumPayment(reference);
    checks.current += 1;
    if (res.error || !res.data) setOutcome({ state: "error", message: res.error ?? "Could not confirm the payment." });
    else setOutcome(res.data);
  }, [reference]);

  useEffect(() => {
    check();
  }, [check]);

  // Mobile money approvals can take a moment: check again a few times.
  useEffect(() => {
    if (outcome.state !== "pending" || checks.current >= AUTO_CHECKS) return;
    const t = setTimeout(check, CHECK_EVERY_MS);
    return () => clearTimeout(t);
  }, [outcome, check]);

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      {outcome.state === "checking" ? (
        <div role="status">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-leaf" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-2xl font-semibold text-forest">Confirming your payment</h1>
          <p className="mt-2 text-muted">This usually takes a few seconds.</p>
        </div>
      ) : outcome.state === "paid" ? (
        <div>
          <CheckCircle2 className="mx-auto h-10 w-10 text-leaf" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-3xl font-semibold text-forest">Premium is active</h1>
          <p className="mt-3 text-muted">
            Every chapter is open, with no drafting or search limits, until{" "}
            <span className="font-medium text-ink">{longDate(outcome.premiumUntil)}</span>.
          </p>
          <ButtonLink href="/app" className="mt-8">
            Go to my theses
          </ButtonLink>
        </div>
      ) : outcome.state === "pending" ? (
        <div>
          <Clock className="mx-auto h-10 w-10 text-leaf" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-2xl font-semibold text-forest">Waiting for confirmation</h1>
          <p className="mt-3 text-muted">{outcome.message}</p>
          <p className="mt-2 text-sm text-muted">
            You can leave this page. Premium switches on automatically once Paystack confirms.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button onClick={check}>Check again</Button>
            <ButtonLink href="/app" variant="secondary">
              Go to my theses
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div>
          <XCircle className="mx-auto h-10 w-10 text-danger" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-2xl font-semibold text-forest">
            {outcome.state === "unknown" ? "Payment not found" : "Payment not completed"}
          </h1>
          <p className="mt-3 text-muted">
            {"message" in outcome
              ? outcome.message
              : "We could not find this payment. Start again from Get Premium."}
          </p>
          {reference ? <p className="mt-2 text-xs text-muted">Reference: {reference}</p> : null}
          <div className="mt-8 flex justify-center gap-3">
            <ButtonLink href="/app/upgrade">Try again</ButtonLink>
            {outcome.state === "error" ? (
              <Button variant="secondary" onClick={check}>
                Check again
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense>
      <Complete />
    </Suspense>
  );
}
