import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Schermata mostrata quando l'utente non ha l'app Beta abilitata.
 * Nessun dato personale viene caricato: solo il gate.
 */
export function BetaGate({ domain }: { domain: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-xl font-semibold text-foreground">
        Accesso non attivo
      </h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Lo spazio Manager Personale e&apos; disponibile solo su invito. Chiedi a
        un amministratore di abilitare l&apos;accesso all&apos;app Beta per il
        tuo profilo.
      </p>
      <div className="mt-8 flex flex-col gap-2">
        <Button asChild variant="outline">
          <Link href={`/sites/${domain}/dashboard`}>Torna alla dashboard</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/sites/select">I miei spazi</Link>
        </Button>
      </div>
    </div>
  );
}
