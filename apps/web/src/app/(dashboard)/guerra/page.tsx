import { Card } from "@/components/ui/Card";

export const metadata = { title: "Guerra · ClashLeader" };

export default function GuerraPage() {
  return (
    <Card>
      <h1 className="font-heading text-xl">Guerra</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Ataques pendientes, alineación recomendada e histórico de guerras llegan en la fase 4, junto con la
        recolección de datos de guerra, liga y capital.
      </p>
    </Card>
  );
}
