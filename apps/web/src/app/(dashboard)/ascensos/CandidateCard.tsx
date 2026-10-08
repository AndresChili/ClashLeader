"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { approveCandidate, discardCandidate, undoDecision, type CandidateDecisionInput } from "./actions";

export function CandidateCard({
  name,
  merits,
  decisionInput,
  status,
  decidedByName,
  canEdit,
}: {
  name: string;
  merits: string;
  decisionInput: CandidateDecisionInput;
  status: "pending" | "approved";
  decidedByName: string | null;
  canEdit: boolean;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Card className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-text">{name}</p>
        <p className="text-xs text-text-secondary">{merits}</p>
      </div>
      {status === "approved" ? (
        <p className="text-sm text-status-good-text">Aprobado por {decidedByName ?? "ti"} · asciéndelo en el juego</p>
      ) : !canEdit ? null : (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await discardCandidate(decisionInput);
              setPending(false);
            }}
          >
            Descartar
          </Button>
          <Button
            className="flex-1"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              await approveCandidate(decisionInput);
              setPending(false);
            }}
          >
            Aprobar
          </Button>
        </div>
      )}
    </Card>
  );
}

export function DiscardedCard({
  name,
  decidedAt,
  decisionInput,
  canEdit,
}: {
  name: string;
  decidedAt: string | null;
  decisionInput: CandidateDecisionInput;
  canEdit: boolean;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-text">{name}</p>
        <p className="text-xs text-text-secondary">
          Cumple las reglas · descartado el {decidedAt ? new Date(decidedAt).toLocaleDateString("es-ES") : "—"}
        </p>
      </div>
      {canEdit ? (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await undoDecision(decisionInput);
            setPending(false);
          }}
        >
          Deshacer
        </Button>
      ) : null}
    </Card>
  );
}
