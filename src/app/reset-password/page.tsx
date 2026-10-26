"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-form";
import { Button, Field, inputClass } from "@/components/ui";
import { setNewPassword } from "@/lib/store";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    const res = await setNewPassword(password);
    setBusy(false);
    if (res.error)
      return setError(
        /session|auth/i.test(res.error)
          ? "This reset link has expired. Request a new one from the sign-in page."
          : res.error,
      );
    router.replace("/app");
  }

  return (
    <AuthLayout>
      <h1 className="font-serif text-3xl font-semibold text-forest">Choose a new password</h1>
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <Field label="New password" htmlFor="password" hint="At least 8 characters.">
          <input
            id="password"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm">
          <input
            id="confirm"
            type="password"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
