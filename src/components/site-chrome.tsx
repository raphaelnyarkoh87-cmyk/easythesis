import Link from "next/link";
import { Logo } from "./brand";
import { ButtonLink } from "./ui";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/#how-it-works"
            className="hidden rounded-lg px-3 py-2 text-[0.95rem] text-forest hover:bg-mint sm:block"
          >
            How it works
          </Link>
          <Link
            href="/pricing"
            className="hidden rounded-lg px-3 py-2 text-[0.95rem] text-forest hover:bg-mint sm:block"
          >
            Pricing
          </Link>
          <Link
            href="/signin"
            className="rounded-lg px-3 py-2 text-[0.95rem] text-forest hover:bg-mint"
          >
            Sign in
          </Link>
          <ButtonLink href="/signup" size="sm">
            Start free
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-mint">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            Thesis and dissertation drafting for the social sciences and humanities, built on
            literature you can check.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-forest">Product</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/#how-it-works" className="hover:text-forest">How it works</Link></li>
            <li><Link href="/pricing" className="hover:text-forest">Pricing</Link></li>
            <li><Link href="/app/thesis/example" className="hover:text-forest">Example chapter</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-forest">Policies</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/responsible-use" className="hover:text-forest">Responsible use</Link></li>
            <li><span>Terms of service (coming soon)</span></li>
            <li><span>Privacy policy (coming soon)</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} EasyThesis. Drafts are a starting point. You remain the
          author of your thesis.
        </p>
      </div>
    </footer>
  );
}
