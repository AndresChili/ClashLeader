import Link from "next/link";
import { Card } from "@/components/ui/Card";

export function NoClanCard() {
  return (
    <Card>
      <p className="text-sm text-text-secondary">
        Todavía no tienes un clan.{" "}
        <Link href="/alta-clan" className="text-accent">
          Dalo de alta
        </Link>{" "}
        o pide un código de invitación a tu líder.
      </p>
    </Card>
  );
}
