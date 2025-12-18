"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import OfferWizard from "@/components/kanbans/OfferWizard";
import { Client, SellProduct } from "@/types/supabase";

interface OfferCreateClientProps {
  domain: string;
  siteId: string;
  kanbanId: number | null;
  clients: Client[];
  products: SellProduct[];
}

export default function OfferCreateClient({
  domain,
  siteId,
  kanbanId,
  clients,
  products,
}: OfferCreateClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleComplete = async (offerData: any) => {
    try {
      const response = await fetch("/api/kanban/tasks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-id": siteId,
        },
        body: JSON.stringify({
          ...offerData,
          kanbanId: kanbanId,
          taskType: "OFFERTA",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create offer");
      }

      const result = await response.json();

      toast({
        title: "Offerta creata",
        description: `Offerta ${result.data?.unique_code || ""} creata con successo`,
      });

      // Redirect back to kanban
      router.push(`/sites/${domain}/kanban?kanbanId=${kanbanId}`);
    } catch (error) {
      console.error("Error creating offer:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante la creazione dell'offerta",
      });
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!kanbanId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">
          Nessuna Kanban Offerte configurata
        </h2>
        <p className="text-muted-foreground">
          Per creare offerte, è necessario prima configurare una kanban con il flag
          &quot;Kanban Offerte&quot; attivo.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8 text-center">Crea Nuova Offerta</h1>
      <OfferWizard
        kanbanId={kanbanId}
        onComplete={handleComplete}
        onCancel={handleCancel}
        domain={domain}
      />
      
      {/* Note for development */}
      <div className="mt-8 p-4 bg-muted rounded-lg text-sm text-muted-foreground text-center">
        <p>
          <strong>Nota:</strong> Questo wizard è una struttura placeholder.
        </p>
        <p>
          I passaggi specifici del configuratore saranno implementati quando
          riceverò i dettagli della scheda.
        </p>
      </div>
    </div>
  );
}

