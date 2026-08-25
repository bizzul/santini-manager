import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline | Full Data Manager",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-page px-6 py-12 text-center text-foreground">
      <WifiOff className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-semibold">Sei offline</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Full Data Manager ha bisogno di una connessione per caricare i dati.
        Controlla la rete e riprova: l&apos;app resta installata sul telefono.
      </p>
      <Button asChild className="mt-6 h-11 min-w-44">
        <Link href="/">Riprova</Link>
      </Button>
    </main>
  );
}
