import type { InputHTMLAttributes } from "react";

export function TextField({
  label,
  name,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <input
        name={name}
        className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-text placeholder:text-text-secondary focus:border-accent focus:outline-none"
        {...props}
      />
      {error ? <span className="text-status-bad-text text-xs">{error}</span> : null}
    </label>
  );
}
