"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

export function TextField({
  label,
  name,
  error,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="relative flex items-center">
        <input
          name={name}
          type={isPassword && showPassword ? "text" : type}
          className={`w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-text placeholder:text-text-secondary focus:border-accent focus:outline-none ${isPassword ? "pr-11" : ""}`}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 text-text-secondary hover:text-text"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {error ? <span className="text-status-bad-text text-xs">{error}</span> : null}
    </label>
  );
}
