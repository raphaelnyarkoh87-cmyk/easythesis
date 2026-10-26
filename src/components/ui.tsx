import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const sizes = {
  md: "h-11 px-5 text-[0.95rem]",
  sm: "h-9 px-3.5 text-sm",
};
const variants: Record<Variant, string> = {
  primary: "bg-leaf text-white hover:bg-leaf-hover",
  secondary: "border border-line bg-white text-forest hover:border-leaf hover:bg-mint",
  quiet: "text-forest hover:bg-mint",
};

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "md") {
  return `${base} ${sizes[size]} ${variants[variant]}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-forest">
        {label}
      </label>
      {children}
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export const inputClass =
  "block w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-muted/70 focus:border-leaf focus:outline-none focus:ring-2 focus:ring-sprout";
