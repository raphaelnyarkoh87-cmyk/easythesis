"use client";

import { useState } from "react";
import { Building2, CreditCard, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui";
import { Loading } from "@/components/app-shell";
import { startPremiumPayment, useAccount } from "@/lib/store";
import { formatGhs, PLANS } from "@/lib/plans";

type Method = "mobile_money" | "card" | "bank";

const METHODS: { id: Method; label: string; detail: string; icon: typeof Smartphone }[] = [
  {
    id: "mobile_money",
    label: "Mobile money",
    detail: "MTN MoMo, Telecel Cash or AirtelTigo Money. Approve the prompt on your phone.",
    icon: Smartphone,
  },
  { id: "card", label: "Visa or Mastercard", detail: "Debit or credit card.", icon: CreditCard },
  { id: "bank", label: "Bank account", detail: "Pay from your bank account or by bank transfer.", icon: Building2 },
];

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function UpgradePage() {
  const account = useAccount();
  const premium = PLANS.premium;
  const [method, setMethod] = useState<Method>("mobile_money");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!account) return <Loading />;
  const active = account.plan === "premium" && account.premiumUntil;

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await startPremiumPayment(method);
    if (res.error || !res.data) {
      setBusy(false);
      setError(res.error ?? "The payment could not be started. Try again.");
      return;
    }
    // Paystack's secure checkout page.
    window.location.assign(res.data.authorizationUrl);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-forest">
        {active ? "Extend Premium" : "Get Premium"}
      </h1>
      <p className="mt-2 text-muted">
        {premium.summary} The pass does not renew by itself, so you are never charged without
        asking.
      </p>

      {active ? (
        <p className="mt-6 rounded-lg bg-mint px-4 py-3 text-sm text-forest">
          Premium is active until {longDate(account.premiumUntil!)}. Paying now adds{" "}
          {premium.periodDays} days to that date.
        </p>
      ) : null}

      <form onSubmit={pay} className="mt-8 grid gap-8 md:grid-cols-[1fr_15rem]" noValidate>
        <fieldset>
          <legend className="text-sm font-medium text-forest">How would you like to pay?</legend>
          <div className="mt-3 grid gap-2">
            {METHODS.map((m) => {
              const checked = m.id === method;
              return (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    checked ? "border-leaf bg-mint" : "border-line hover:border-leaf"
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.id}
                    checked={checked}
                    onChange={() => setMethod(m.id)}
                    className="mt-1 accent-[var(--color-leaf)]"
                  />
                  <m.icon className="mt-0.5 h-5 w-5 shrink-0 text-leaf" aria-hidden="true" />
                  <span>
                    <span className="block font-medium text-ink">{m.label}</span>
                    <span className="block text-sm text-muted">{m.detail}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted">
            Next, Paystack&apos;s secure page asks for your number or card details. EasyThesis
            never sees your PIN or card number.
          </p>
          {error ? (
            <p role="alert" className="mt-4 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">
              {error}
            </p>
          ) : null}
        </fieldset>

        <aside className="h-fit rounded-xl bg-forest p-5 text-white">
          <h2 className="font-semibold">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-sprout">Premium pass</dt>
              <dd>{premium.periodDays} days</dd>
            </div>
            <div className="flex justify-between border-t border-white/15 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatGhs(premium.priceGhs)}</dd>
            </div>
          </dl>
          <Button
            type="submit"
            disabled={busy}
            className="mt-5 w-full !bg-white !text-forest hover:!bg-mint"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Opening Paystack…
              </>
            ) : (
              `Pay ${formatGhs(premium.priceGhs)}`
            )}
          </Button>
          <p className="mt-4 flex gap-2 text-xs text-sprout">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            Processed securely by Paystack.
          </p>
        </aside>
      </form>
    </main>
  );
}
