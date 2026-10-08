"use client";

import { useActionState, useState } from "react";
import { createInvite, type CreateInviteState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const initialState: CreateInviteState = { code: null, error: null };

export function InviteCard({ clanId }: { clanId: string }) {
  const [state, formAction, pending] = useActionState(createInvite, initialState);
  const [copied, setCopied] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-base">Invitar a un colíder</h2>
        <p className="text-xs text-text-secondary">
          Comparta el código. Al entrar, confirma que la cuenta es suya. Caduca en 7 días y solo sirve una vez.
        </p>
      </div>

      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="clanId" value={clanId} />
        <div className="flex-1 truncate rounded-xl border border-border bg-bg px-3.5 py-2.5 font-heading text-sm tracking-wider text-text">
          {state.code ?? "[CÓDIGO]"}
        </div>
        {state.code ? (
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(state.code!);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copiado" : "Copiar"}
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Creando…" : "Generar"}
          </Button>
        )}
      </form>

      {state.error ? <p className="text-xs text-status-bad-text">{state.error}</p> : null}
    </Card>
  );
}
