"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, CreditCard, Info, ShieldCheck, Smartphone } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { activatePremium, useAccount } from "@/lib/demo-store";
import { formatGhs, PAYMENT_METHODS, PLANS, type PaymentMethodId } from "@/lib/plans";

const ICONS = { mobile_money: Smartphone, card: CreditCard, bank: Building2 } as const;

function validGhanaNumber(raw: string) {
  const digits = raw.replace(/[\s-]/g, "");
  return /^0\d{9}$/.test(digits) || /^\+?233\d{9}$/.test(digits);
}

export default function UpgradePage() {
  const router = useRouter();
  const account = useAccount();
  const premium = PLANS.premium;
  const [method, setMethod] = useState<PaymentMethodId>("mtn");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!account) return null;
  const selected = PAYMENT_METHODS.find((m) => m.id === method)!;
  const mobile = selected.kind === "mobile_money";

  function pay(e: React.FormEvent) {
    e.preventDefault();
    if (mobile && !validGhanaNumber(phone)) {
      setError("Enter the 10-digit mobile money number, for example 024 123 4567.");
      return;
    }
    setError(null);
    // Stage 6: start a Paystack transaction on the server and open its checkout.
    setPending(true);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-3xl font-semibold text-forest">Get Premium</h1>
      <p className="mt-2 text-muted">
        {premium.summary} The pass does not renew by itself.
      </p>

      {account.plan === "premium" && account.premiumUntil ? (
        <p className="mt-6 rounded-lg bg-mint px-4 py-3 text-sm text-forest">
          Premium is active until{" "}
          {new Date(account.premiumUntil).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Paying again adds {premium.periodDays} days.
        </p>
      ) : null}

      <form onSubmit={pay} className="mt-8 grid gap-8 md:grid-cols-[1fr_15rem]" noValidate>
        <div className="space-y-7">
          <fieldset>
            <legend className="text-sm font-medium text-forest">How would you like to pay?</legend>
            <div className="mt-3 grid gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = ICONS[m.kind];
                const checked = m.id === method;
                return (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      checked ? "border-leaf bg-mint" : "border-line hover:border-leaf"
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={m.id}
                      checked={checked}
                      onChange={() => {
                        setMethod(m.id);
                        setError(null);
                        setPending(false);
                      }}
                      className="accent-[var(--color-leaf)]"
                    />
                    <Icon className="h-5 w-5 text-leaf" aria-hidden="true" />
                    <span className="font-medium text-ink">{m.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {mobile ? (
            <Field
              label={`${selected.label} number`}
              htmlFor="phone"
              hint="You will get a prompt on this phone to approve the payment with your PIN."
            >
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={inputClass}
                placeholder="024 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          ) : (
            <p className="text-sm text-muted">
              You will enter your {selected.kind === "card" ? "card" : "bank"} details on
              Paystack&apos;s secure page. EasyThesis never sees them.
            </p>
          )}

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}

          {pending ? (
            <div className="space-y-3">
              <p role="status" className="flex gap-2 rounded-lg bg-mint px-4 py-3 text-sm text-forest">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden="true" />
                Payments switch on in Stage 6, when Paystack is connected. No money was taken.
              </p>
              <button
                type="button"
                className="text-sm font-medium text-leaf underline underline-offset-4"
                onClick={() => {
                  activatePremium(premium.periodDays ?? 30);
                  router.push("/app");
                }}
              >
                Preview only: unlock Premium in this browser
              </button>
            </div>
          ) : null}
        </div>

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
          <Button type="submit" className="mt-5 w-full !bg-white !text-forest hover:!bg-mint">
            Pay {formatGhs(premium.priceGhs)}
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
