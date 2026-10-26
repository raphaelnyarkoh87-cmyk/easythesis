"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-form";
import { Button, Field, inputClass } from "@/components/ui";
import { sendPasswordReset } from "@/lib/store";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setError("Enter a valid email address.");
    setBusy(true);
    const res = await sendPasswordReset(clean);
    setBusy(false);
    if (res.error) return setError(res.error);
    setSent(true);
  }

  return (
    <AuthLayout>
      <h1 className="font-serif text-3xl font-semibold text-forest">Reset your password</h1>
      {sent ? (
        <p className="mt-3 leading-relaxed text-muted">
          If an account exists for that email, a reset link is on its way. Open it on this device
          to choose a new password.
        </p>
      ) : (
        <>
          <p className="mt-2 text-muted">We will email you a link to choose a new password.</p>
          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
      <Link href="/signin" className="mt-8 text-sm font-medium text-leaf underline underline-offset-4">
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
