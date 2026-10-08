import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Equipo · ClashLeader" };

export default function EquipoPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl">Equipo</h1>
      <Card>
        <p className="text-sm text-text-secondary">
          Gestión de accesos, invitaciones a colíderes y alta de clanes con verificación del líder llegan en la fase 6.
        </p>
      </Card>

      <div className="flex flex-col gap-2">
        <Link href="/reglas" className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <span className="text-sm text-text">Reglas del clan</span>
          <span className="text-text-secondary">›</span>
        </Link>
        <Link href="/ascensos" className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <span className="text-sm text-text">Candidatos a ascender</span>
          <span className="text-text-secondary">›</span>
        </Link>
      </div>
    </div>
  );
}
