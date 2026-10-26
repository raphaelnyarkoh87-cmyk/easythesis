"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "./brand";
import { ButtonLink, buttonClass } from "./ui";
import { signOut, useAccount } from "@/lib/store";

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-24 text-muted">
      <Loader2 className="h-5 w-5 animate-spin text-leaf" aria-hidden="true" />
      {label}…
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const account = useAccount();
  const pathname = usePathname();
  const router = useRouter();
  const publicPath = pathname === "/app/thesis/example";

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Logo href={account ? "/app" : "/"} />
          {account ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {account.plan === "premium" ? (
                <span className="hidden rounded-full bg-mint px-3 py-1 text-sm font-medium text-leaf sm:inline">
                  Premium
                </span>
              ) : (
                <ButtonLink href="/app/upgrade" size="sm" variant="secondary">
                  <span className="sm:hidden">Premium</span>
                  <span className="hidden sm:inline">Get Premium</span>
                </ButtonLink>
              )}
              <Link
                href="/app"
                className="hidden rounded-lg px-3 py-2 text-sm text-forest hover:bg-mint sm:block"
              >
                My theses
              </Link>
              <button
                type="button"
                className={buttonClass("quiet", "sm")}
                onClick={async () => {
                  await signOut();
                  router.replace("/");
                  router.refresh();
                }}
              >
                Sign out
              </button>
            </div>
          ) : account === null ? (
            <div className="flex items-center gap-2">
              <Link href="/signin" className="rounded-lg px-3 py-2 text-sm text-forest hover:bg-mint">
                Sign in
              </Link>
              <ButtonLink href="/signup" size="sm">
                Start free
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </header>
      {account === undefined && !publicPath ? (
        <Loading />
      ) : account || publicPath ? (
        children
      ) : (
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-serif text-3xl font-semibold text-forest">Sign in to continue</h1>
          <p className="mt-3 text-muted">Your thesis projects are kept in your account.</p>
          <div className="mt-8 flex justify-center gap-3">
            <ButtonLink href={`/signin?next=${encodeURIComponent(pathname)}`}>Sign in</ButtonLink>
            <ButtonLink href="/signup" variant="secondary">
              Create account
            </ButtonLink>
          </div>
        </main>
      )}
    </div>
  );
}
