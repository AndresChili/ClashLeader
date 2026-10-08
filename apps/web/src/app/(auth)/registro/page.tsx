"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInWithGoogle, signUpWithPassword, type AuthActionState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";

const initialState: AuthActionState = { error: null };

export default function RegistroPage() {
  const [state, formAction, pending] = useActionState(signUpWithPassword, initialState);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[390px] flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="font-heading text-2xl">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-text-secondary">Para líderes y colíderes de clanes de Clash of Clans.</p>
      </div>

      <Card className="flex flex-col gap-4">
        {state.info ? (
          <p className="rounded-xl bg-status-good-bg px-3 py-2 text-sm text-status-good-text">{state.info}</p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <TextField label="Nombre" name="displayName" autoComplete="name" required />
            <TextField label="Correo" name="email" type="email" autoComplete="email" required />
            <TextField
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
            />
            {state.error ? <p className="text-sm text-status-bad-text">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
          </form>
        )}

        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span className="h-px flex-1 bg-border" />
          o
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={signInWithGoogle}>
          <Button type="submit" variant="secondary" className="w-full">
            Continuar con Google
          </Button>
        </form>
      </Card>

      <p className="text-center text-sm text-text-secondary">
        ¿Ya tienes cuenta?{" "}
        <Link href="/iniciar-sesion" className="text-accent">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
