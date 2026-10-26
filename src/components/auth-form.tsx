"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "./brand";
import { Button, Field, inputClass } from "./ui";
import { signIn } from "@/lib/demo-store";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signup = mode === "signup";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use a password of at least 8 characters.");
    if (signup && name.trim().length < 2) return setError("Enter your full name.");
    setError(null);
    // Stage 3: replace with Supabase auth.
    signIn(signup ? name.trim() : email.split("@")[0], email.trim().toLowerCase());
    router.push(params.get("plan") === "premium" ? "/app/upgrade" : "/app");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
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
            <Field
              label="Password"
              htmlFor="password"
              hint={signup ? "At least 8 characters." : undefined}
            >
              <input
                id="password"
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={signup ? "new-password" : "current-password"}
              />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full">
              {signup ? "Create account" : "Sign in"}
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
          <p className="mt-10 rounded-lg bg-mint px-4 py-3 text-xs leading-relaxed text-muted">
            Preview build: accounts are stored in this browser only until the database is
            connected.
          </p>
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
