"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

/** Botón de envío que pide confirmación antes de mandar el formulario que lo contiene. */
export function ConfirmSubmitButton({ message, children }: { message: string; children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      disabled={pending}
      className="px-3 py-1.5 text-status-bad-text"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
