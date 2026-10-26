"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Logo } from "./brand";
import { Button, Field, inputClass } from "./ui";
import { signIn, signUp } from "@/lib/store";

function safeNext(next: string | null, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {children}
        </div>
      </div>
      <aside className="hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <blockquote className="max-w-md">
          <p className="font-serif text-2xl leading-snug">
            Every citation in your draft links to a paper you can open, and every finding comes
            from your own data.
          </p>
          <footer className="mt-4 text-sprout">How EasyThesis works</footer>
        </blockquote>
      </aside>
    </main>
  );
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "link"
      ? "That link has expired or was already used. Sign in, or request a new link."
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const signup = mode === "signup";
  const next = safeNext(
    params.get("next"),
    params.get("plan") === "premium" ? "/app/upgrade" : "/app",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (signup && name.trim().length < 2) return setError("Enter your full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    setError(null);
    setBusy(true);
    if (signup) {
      const res = await signUp(name.trim(), cleanEmail, password);
      setBusy(false);
      if (res.error) return setError(res.error);
      if (res.needsConfirmation) return setSentTo(cleanEmail);
      router.replace(next);
      router.refresh();
    } else {
      const res = await signIn(cleanEmail, password);
      setBusy(false);
      if (res.error) return setError(res.error);
      router.replace(next);
      router.refresh();
    }
  }

  if (sentTo) {
    return (
      <AuthLayout>
        <MailCheck className="h-8 w-8 text-leaf" aria-hidden="true" />
        <h1 className="mt-4 font-serif text-3xl font-semibold text-forest">Check your email</h1>
        <p className="mt-3 leading-relaxed text-muted">
          We sent a confirmation link to <span className="font-medium text-ink">{sentTo}</span>.
          Open it on this device to finish creating your account. Check your spam folder if it
          has not arrived within a few minutes.
        </p>
        <Link href="/signin" className="mt-8 font-medium text-leaf underline underline-offset-4">
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="font-serif text-3xl font-semibold text-forest">
        {signup ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-2 text-muted">
        {signup
          ? "Start with one free thesis project. No payment needed."
          : "Welcome back. Pick up where you left off."}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        {signup ? (
          <Field label="Full name" htmlFor="name">
            <input
              id="name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </Field>
        ) : null}
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
        <Field label="Password" htmlFor="password" hint={signup ? "At least 8 characters." : undefined}>
          <input
            id="password"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </Field>
        {!signup ? (
          <p className="-mt-2 text-sm">
            <Link href="/forgot-password" className="text-leaf underline underline-offset-4">
              Forgot your password?
            </Link>
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        {signup ? "Already have an account? " : "New to EasyThesis? "}
        <Link
          href={signup ? "/signin" : "/signup"}
          className="font-medium text-leaf underline underline-offset-4"
        >
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
      {signup ? (
        <p className="mt-8 text-xs leading-relaxed text-muted">
          By creating an account you agree to use EasyThesis in line with your university&apos;s
          rules. Read our{" "}
          <Link href="/responsible-use" className="underline underline-offset-2">
            responsible use guide
          </Link>
          .
        </p>
      ) : null}
    </AuthLayout>
  );
}
