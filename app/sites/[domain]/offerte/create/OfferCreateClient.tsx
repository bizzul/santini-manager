"use client";

import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import OfferWizard from "@/components/kanbans/OfferWizard";
import { Client, SellProduct, Task } from "@/types/supabase";
import { Badge } from "@/components/ui/badge";
import { FileEdit } from "lucide-react";
import { downloadOfferPdf } from "@/lib/offer-pdf";
import { useSiteVerticalProfile } from "@/hooks/use-site-vertical-profile";

interface OfferCreateClientProps {
  domain: string;
  siteId: string;
  kanbanId: number | null;
  kanbanIdentifier?: string | null;
  clients: Client[];
  products: SellProduct[];
  draftTask?: Task | null;
  targetColumnId?: number | null;
}

export default function OfferCreateClient({
  domain,
  siteId,
  kanbanId,
  kanbanIdentifier,
  clients,
  products,
  draftTask,
  targetColumnId,
}: OfferCreateClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: verticalProfile } = useSiteVerticalProfile(domain);
  
  const isCompletingDraft = !!draftTask;

  const handleComplete = async (offerData: any) => {
    try {
      let taskId: number | null = null;
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
            sellProductId: offerData.productId,
            offer_products: offerData.offerProducts,
            is_draft: false,
            // Move to target column if specified
            ...(targetColumnId && { kanbanColumnId: targetColumnId }),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update offer");
        }

        taskId = draftTask.id;

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
        taskId = result.data?.id || null;

        toast({
          title: "Offerta creata",
          description: `Offerta ${result.data?.unique_code || ""} creata con successo`,
        });
      }

      if (offerData.downloadPdf && taskId) {
        await downloadOfferPdf({ taskId, siteId, saveToProjectDocuments: true });
      }

      // Redirect back to kanban
      if (kanbanIdentifier) {
        router.push(`/sites/${domain}/kanban?name=${kanbanIdentifier}`);
      } else {
        router.push(`/sites/${domain}/kanban`);
      }
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
      <div className="rounded-lg border border-dashed bg-card/50 p-12 text-center">
        <h2 className="text-xl font-semibold mb-2">
          Nessuna Kanban Offerte configurata
        </h2>
        <p className="text-sm text-muted-foreground">
          Per creare offerte, e necessario prima configurare una kanban con il flag
          &quot;Kanban Offerte&quot; attivo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isCompletingDraft && draftTask && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <Badge className="bg-amber-500 hover:bg-amber-600">
            <FileEdit className="h-3 w-3 mr-1" />
            Da bozza: {draftTask.unique_code}
          </Badge>
          <p className="flex-1 text-sm text-foreground">
            Stai completando la bozza <strong>{draftTask.unique_code}</strong>.
            {draftTask.clientId && " Cliente e prodotti sono gia pre-selezionati."}
          </p>
        </div>
      )}

      {!isCompletingDraft && verticalProfile?.pageCopy.offerCreateSubtitle && (
        <p className="text-sm text-muted-foreground">
          {verticalProfile.pageCopy.offerCreateSubtitle}
        </p>
      )}

      <OfferWizard
        kanbanId={kanbanId}
        onComplete={handleComplete}
        onCancel={handleCancel}
        domain={domain}
        clients={clients}
        products={products}
        draftTask={draftTask}
      />
    </div>
  );
}

