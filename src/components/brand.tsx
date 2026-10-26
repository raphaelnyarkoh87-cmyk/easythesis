import Link from "next/link";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--color-forest)" />
      {/* A page with a folded corner and a check: a verified draft */}
      <path d="M10 7h9l5 5v13H10z" fill="#fff" />
      <path d="M19 7v5h5" fill="var(--color-sprout)" />
      <path
        d="M13.2 18.2l2.3 2.3 4.4-4.6"
        fill="none"
        stroke="var(--color-leaf)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="EasyThesis home">
      <LogoMark />
      <span className="font-serif text-[1.35rem] font-semibold tracking-tight text-forest">
        EasyThesis
      </span>
    </Link>
  );
}
