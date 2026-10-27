import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const base = "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "accent-gradient font-semibold hover:brightness-110",
  secondary: "surface text-text hover:border-accent/60",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
