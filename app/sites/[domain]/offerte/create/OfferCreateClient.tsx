"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import OfferWizard from "@/components/kanbans/OfferWizard";
import { Client, SellProduct, Task } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { FileEdit } from "lucide-react";

interface OfferCreateClientProps {
  domain: string;
  siteId: string;
  kanbanId: number | null;
  clients: Client[];
  products: SellProduct[];
  draftTask?: Task | null;
  targetColumnId?: number | null;
}

export default function OfferCreateClient({
  domain,
  siteId,
  kanbanId,
  clients,
  products,
  draftTask,
  targetColumnId,
}: OfferCreateClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  
  const isCompletingDraft = !!draftTask;

  const handleComplete = async (offerData: any) => {
    try {
      if (isCompletingDraft && draftTask) {
        // Update existing draft task and remove draft flag
        const response = await fetch(`/api/kanban/tasks/${draftTask.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId,
          },
          body: JSON.stringify({
            ...offerData,
            is_draft: false,
            // Move to target column if specified
            ...(targetColumnId && { kanbanColumnId: targetColumnId }),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update offer");
        }

        toast({
          title: "Offerta completata",
          description: `Offerta ${draftTask.unique_code} completata e spostata`,
        });
      } else {
        // Create new offer
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
      }

      // Redirect back to kanban
      router.push(`/sites/${domain}/kanban?kanbanId=${kanbanId}`);
    } catch (error) {
      console.error("Error with offer:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: isCompletingDraft 
          ? "Si è verificato un errore durante il completamento dell'offerta"
          : "Si è verificato un errore durante la creazione dell'offerta",
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
      <div className="flex items-center justify-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-center">
          {isCompletingDraft ? "Completa Offerta" : "Crea Nuova Offerta"}
        </h1>
        {isCompletingDraft && (
          <Badge className="bg-amber-500 hover:bg-amber-600">
            <FileEdit className="h-3 w-3 mr-1" />
            Da bozza: {draftTask?.unique_code}
          </Badge>
        )}
      </div>
      
      {/* Draft info banner */}
      {isCompletingDraft && draftTask && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Stai completando la bozza <strong>{draftTask.unique_code}</strong>.
            {draftTask.clientId && " Cliente e prodotti sono già pre-selezionati."}
          </p>
        </div>
      )}
      
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

