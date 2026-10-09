"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { signInWithGoogle, signInWithPassword, type AuthActionState } from "../actions";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";

const initialState: AuthActionState = { error: null };

export default function IniciarSesionPage() {
  const [state, formAction, pending] = useActionState(signInWithPassword, initialState);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[390px] flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="font-heading text-2xl">ClashLeader</h1>
        <p className="mt-1 text-sm text-text-secondary">Inicia sesión para ver tu clan.</p>
      </div>

      <Card className="flex flex-col gap-4">
        <Suspense fallback={null}>
          <AuthErrorBanner />
        </Suspense>
        <form action={formAction} className="flex flex-col gap-4">
          <TextField label="Correo" name="email" type="email" autoComplete="email" required />
          <TextField label="Contraseña" name="password" type="password" autoComplete="current-password" required />
          {state.error ? <p className="text-sm text-status-bad-text">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Entrando…" : "Iniciar sesión"}
          </Button>
        </form>

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
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="text-accent">
          Regístrate
        </Link>
      </p>
    </main>
  );
}
