"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Globe } from "lucide-react";
import { DangerousDeleteDialog } from "@/components/dialogs/DangerousDeleteDialog";
import { deleteOrganization } from "../actions";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  code?: string;
  userCount: number;
  siteCount?: number;
}

interface OrganizationRowProps {
  organization: Organization;
  isSuperadmin: boolean;
}

export function OrganizationRow({
  organization,
  isSuperadmin,
}: OrganizationRowProps) {
  const router = useRouter();

  const handleDelete = async () => {
    const result = await deleteOrganization(organization.id);
    if (result.success) {
      toast.success(result.message || "Organizzazione eliminata con successo");
      router.refresh();
    } else {
      throw new Error(result.message || "Errore durante l'eliminazione");
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
      <div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white text-lg">
            {organization.name}
          </span>
          {organization.code && (
            <span className="text-white/60 bg-white/10 px-2 py-1 rounded text-sm font-mono">
              {organization.code}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-white/60 mt-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {organization.userCount} utent
              {organization.userCount !== 1 ? "i" : "e"}
            </span>
          </div>
          {organization.siteCount !== undefined && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>
                {organization.siteCount} sit
                {organization.siteCount !== 1 ? "i" : "o"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/administration/organizations/${organization.id}`}>
          <Button
            size="sm"
            variant="outline"
            className="border border-white/40 text-white hover:bg-white/20"
          >
            Dettagli
          </Button>
        </Link>
        {isSuperadmin && (
          <>
            <Link
              href={`/administration/organizations/${organization.id}/edit`}
            >
              <Button
                size="sm"
                variant="outline"
                className="border border-white/40 text-white hover:bg-white/20"
              >
                Modifica
              </Button>
            </Link>
            <DangerousDeleteDialog
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="border border-red-400/50 text-red-400 hover:bg-red-500/20 hover:border-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
              title="Elimina Organizzazione"
              description={`Stai per eliminare l'organizzazione "${organization.name}" e tutti i dati collegati.`}
              confirmationText={organization.name}
              warningItems={[
                `${organization.siteCount || 0} siti collegati`,
                "Tutti i progetti e le attività",
                "Tutto l'inventario e i prodotti",
                "Tutti i clienti e i fornitori",
                "Tutte le offerte",
                "Tutti i tracciamenti temporali",
                "Tutte le configurazioni e impostazioni",
              ]}
              onConfirm={handleDelete}
            />
          </>
        )}
      </div>
    </div>
  );
}
