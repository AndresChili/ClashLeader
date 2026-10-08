"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addLeaderNote, setOnWatch, type NoteActionState } from "./actions";
import { Button } from "@/components/ui/Button";

const initialState: NoteActionState = { error: null };

export function FichaActions({
  clanMemberId,
  clanId,
  tagSlug,
  onWatch,
  canEdit,
}: {
  clanMemberId: string;
  clanId: string;
  tagSlug: string;
  onWatch: boolean;
  canEdit: boolean;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addLeaderNote, initialState);
  const [watchPending, setWatchPending] = useState(false);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !pending && !state.error) {
      setNoteOpen(false);
    }
    wasSubmitting.current = pending;
  }, [pending, state.error]);

  if (!canEdit) return null;

  return (
    <div className="flex flex-col gap-3">
      {noteOpen ? (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="clanMemberId" value={clanMemberId} />
          <input type="hidden" name="clanId" value={clanId} />
          <input type="hidden" name="tagSlug" value={tagSlug} />
          <textarea
            name="note"
            rows={3}
            placeholder="Escribe la nota..."
            className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-accent focus:outline-none"
          />
          {state.error ? <p className="text-xs text-status-bad-text">{state.error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Guardando…" : "Guardar nota"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setNoteOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setNoteOpen(true)}>
            Añadir nota
          </Button>
          <Button
            className="flex-1"
            disabled={watchPending}
            onClick={async () => {
              setWatchPending(true);
              await setOnWatch({ clanMemberId, clanId, tagSlug, onWatch: !onWatch });
              setWatchPending(false);
            }}
          >
            {onWatch ? "Quitar de observación" : "Poner en observación"}
          </Button>
        </div>
      )}
    </div>
  );
}
