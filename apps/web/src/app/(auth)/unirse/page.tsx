"use client";

import { useActionState } from "react";
import { redeemInvite, type UnirseActionState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";

const initialState: UnirseActionState = { error: null };

export default function UnirsePage() {
  const [state, formAction, pending] = useActionState(redeemInvite, initialState);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[390px] flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="font-heading text-2xl">Unirse a un clan</h1>
        <p className="mt-1 text-sm text-text-secondary">Pon el código de invitación de un solo uso que te dio el líder.</p>
      </div>

      <Card>
        <form action={formAction} className="flex flex-col gap-4">
          <TextField label="Código de invitación" name="code" placeholder="Código" required autoCapitalize="characters" />
          {state.error ? <p className="text-sm text-status-bad-text">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Comprobando…" : "Unirme"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
