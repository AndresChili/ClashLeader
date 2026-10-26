"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ClanRules } from "@clashleader/rules";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { updateClanRules, type RulesActionState } from "./actions";

const initialState: RulesActionState = { error: null };

const WEIGHT_FIELDS = [
  { name: "indexWeightWar", label: "Guerra" },
  { name: "indexWeightActivity", label: "Actividad" },
  { name: "indexWeightCapital", label: "Capital" },
  { name: "indexWeightGames", label: "Juegos del Clan" },
  { name: "indexWeightDonations", label: "Donaciones" },
] as const;

const BANDS = [
  ["Excelente", "85 o más"],
  ["Genial", "70 – 84"],
  ["Bien", "60 – 69"],
  ["Suficiente", "50 – 59"],
  ["Flojo", "30 – 49"],
  ["Muy flojo", "20 – 29"],
  ["Expulsar", "menos de 20"],
] as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text">{value}</span>
    </div>
  );
}

export function RulesEditor({ rules, canEdit }: { rules: ClanRules; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateClanRules, initialState);
  const wasSubmitting = useRef(false);

  useEffect(() => {
    if (wasSubmitting.current && !pending && !state.error) {
      setEditing(false);
    }
    wasSubmitting.current = pending;
  }, [pending, state.error]);

  const veteranMonths = Math.round(rules.veteranMinDays / 30);
  const coleaderMonths = Math.round(rules.coleaderMinDays / 30);
  // Tras un error se vuelve a pintar lo que se había escrito, no lo guardado.
  const value = (name: string, saved: number) => state.values?.[name] ?? saved;

  if (editing) {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="clanId" value={rules.clanId} />

        <Card className="flex flex-col gap-3">
          <h2 className="font-heading text-base">Expulsión</h2>
          <TextField label="Días sin actividad detectada" name="kickInactivityDays" type="number" min={1} max={30} defaultValue={value("kickInactivityDays", rules.kickInactivityDays)} />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-heading text-base">Ascenso a veterano</h2>
          <TextField label="Meses en el clan" name="veteranMinMonths" type="number" min={1} max={24} defaultValue={value("veteranMinMonths", veteranMonths)} />
          <TextField
            label="Donaciones por temporada"
            name="veteranMinDonationsPerSeason"
            type="number"
            min={0}
            defaultValue={value("veteranMinDonationsPerSeason", rules.veteranMinDonationsPerSeason)}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-heading text-base">Ascenso a colíder</h2>
          <TextField label="Meses en el clan" name="coleaderMinMonths" type="number" min={1} max={36} defaultValue={value("coleaderMinMonths", coleaderMonths)} />
          <TextField
            label="% de ataques de guerra usados"
            name="coleaderMinAttackUsagePct"
            type="number"
            min={0}
            max={100}
            defaultValue={value("coleaderMinAttackUsagePct", rules.coleaderMinAttackUsagePct)}
          />
          <TextField
            label="Donaciones por temporada"
            name="coleaderMinDonationsPerSeason"
            type="number"
            min={0}
            defaultValue={value("coleaderMinDonationsPerSeason", rules.coleaderMinDonationsPerSeason)}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-heading text-base">Puntuación</h2>
          <p className="text-xs text-text-secondary">Peso de cada parte en la puntuación. Tienen que sumar 100.</p>
          {WEIGHT_FIELDS.map((field) => (
            <TextField
              key={field.name}
              label={field.label}
              name={field.name}
              type="number"
              min={0}
              max={100}
              defaultValue={value(field.name, rules[field.name])}
            />
          ))}
        </Card>

        {state.error ? <p className="text-sm text-status-bad-text">{state.error}</p> : null}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Editar
          </Button>
        </div>
      ) : null}

      <Card>
        <h2 className="mb-1 font-heading text-base">Expulsión</h2>
        <Row label="Sin actividad detectada" value={`Más de ${rules.kickInactivityDays} días`} />
        <Row label="Guerra terminada sin ningún ataque" value="Siempre" />
        <Row label="Puntuación" value="Menos de 20" />
      </Card>

      <Card>
        <h2 className="mb-1 font-heading text-base">Ascenso a veterano</h2>
        <Row label="Tiempo en el clan" value={`${veteranMonths} ${veteranMonths === 1 ? "mes" : "meses"}`} />
        <Row label="Ataca en todas sus guerras" value="Sí" />
        <Row label="Donaciones por temporada" value={`${rules.veteranMinDonationsPerSeason}`} />
      </Card>

      <Card>
        <h2 className="mb-1 font-heading text-base">Ascenso a colíder</h2>
        <Row label="Tiempo en el clan" value={`${coleaderMonths} meses`} />
        <Row label="Ataques de guerra usados" value={`${rules.coleaderMinAttackUsagePct}% o más`} />
        <Row label="Donaciones por temporada" value={`${rules.coleaderMinDonationsPerSeason}`} />
        <Row label="Actividad" value="Casi a diario" />
      </Card>

      <Card>
        <h2 className="mb-1 font-heading text-base">Puntuación</h2>
        {WEIGHT_FIELDS.map((field) => (
          <Row key={field.name} label={field.label} value={`${rules[field.name]} %`} />
        ))}
        <p className="mt-2 text-xs text-text-secondary">
          Una parte que no aplica en ese momento (sin guerras en alineación, Juegos sin empezar, inicio de temporada…) no
          cuenta y su peso se reparte entre las demás.
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 font-heading text-base">Tramos</h2>
        {BANDS.map(([band, range]) => (
          <Row key={band} label={band} value={range} />
        ))}
      </Card>
    </div>
  );
}
