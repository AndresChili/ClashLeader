import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Panel · ClashLeader" };

export default function PanelPage() {
  return (
    <Card>
      <h1 className="font-heading text-xl">Panel</h1>
      <p className="mt-2 text-sm text-text-secondary">
        El panel reúne datos de guerra, capital y ascensos que todavía no existen. Llega en la fase 7, cuando el resto
        ya está construido. Mientras tanto, revisa{" "}
        <Link href="/miembros" className="text-accent">
          Miembros
        </Link>
        .
      </p>
    </Card>
  );
}
