"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerClan, type AltaClanActionState } from "./actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";

const initialState: AltaClanActionState = { error: null };

export default function AltaClanPage() {
  const [state, formAction, pending] = useActionState(registerClan, initialState);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[390px] flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="font-heading text-2xl">Da de alta tu clan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Comprobamos con la API de Clash of Clans que eres el líder antes de darlo de alta.
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        <form action={formAction} className="flex flex-col gap-4">
          <TextField label="Tag del clan" name="clanTag" placeholder="#2PP0YLQG" required autoCapitalize="characters" />
          <TextField label="Tu tag de jugador" name="playerTag" placeholder="#8GQPJLU2" required autoCapitalize="characters" />
          <TextField
            label="Token de tu cuenta"
            name="playerToken"
            placeholder="En el juego: Ajustes › Más ajustes › Mostrar token de API"
            required
          />
          {state.error ? <p className="text-sm text-status-bad-text">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Comprobando…" : "Dar de alta el clan"}
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-text-secondary">
        ¿Te han invitado como colíder?{" "}
        <Link href="/unirse" className="text-accent">
          Usa tu código de invitación
        </Link>
      </p>
    </main>
  );
}
