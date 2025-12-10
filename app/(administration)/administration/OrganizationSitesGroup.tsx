"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building,
  Globe,
  Settings,
  ExternalLink,
  ChevronDown,
  Trash2,
  Plus,
} from "lucide-react";
import { DangerousDeleteDialog } from "@/components/dialogs/DangerousDeleteDialog";
import { deleteOrganization, deleteSite } from "./actions";
import { toast } from "sonner";

interface Site {
  id: string;
  name: string;
  subdomain: string;
  description?: string;
  image?: string;
  custom_domain?: string;
}

interface Organization {
  id: string;
  name: string;
  code: string;
}

interface OrganizationSitesGroupProps {
  organization: Organization | null;
  sites: Site[];
}

export function OrganizationSitesGroup({
  organization,
  sites,
}: OrganizationSitesGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  const handleDeleteOrganization = async () => {
    if (!organization) return;

    const result = await deleteOrganization(organization.id);
    if (result.success) {
      toast.success(result.message || "Organizzazione eliminata con successo");
      router.refresh();
    } else {
      throw new Error(result.message || "Errore durante l'eliminazione");
    }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    const result = await deleteSite(siteId);
    if (result.success) {
      toast.success(result.message || "Sito eliminato con successo");
      router.refresh();
    } else {
      throw new Error(result.message || "Errore durante l'eliminazione");
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 hover:bg-white/10 transition-colors">
          <CollapsibleTrigger asChild>
            <button className="flex-1 flex items-center gap-3 text-left">
              <div className="p-2 rounded-xl bg-white/10">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">
                  {organization?.name || "Senza Organizzazione"}
                </h4>
                <p className="text-sm text-white/60">
                  {organization?.code && (
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded mr-2">
                      {organization.code}
                    </span>
                  )}
                  {sites.length} {sites.length === 1 ? "sito" : "siti"}
                </p>
              </div>
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            {organization && (
              <>
                <Link
                  href={`/administration/organizations/${organization.id}/edit`}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/20 h-8 w-8 p-0"
                    title="Modifica organizzazione"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
                <DangerousDeleteDialog
                  trigger={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
                      title="Elimina organizzazione"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="Elimina Organizzazione"
                  description={`Stai per eliminare l'organizzazione "${organization.name}" e tutti i dati collegati.`}
                  confirmationText={organization.name}
                  warningItems={[
                    `${sites.length} ${
                      sites.length === 1 ? "sito" : "siti"
                    } collegati`,
                    "Tutti i progetti e le attività",
                    "Tutto l'inventario e i prodotti",
                    "Tutti i clienti e i fornitori",
                    "Tutte le offerte",
                    "Tutti i tracciamenti temporali",
                    "Tutte le configurazioni e impostazioni",
                  ]}
                  onConfirm={handleDeleteOrganization}
                />
              </>
            )}
            <CollapsibleTrigger asChild>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronDown
                  className={`h-5 w-5 text-white/60 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="border-t border-white/20 p-4">
            {sites.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-10 w-10 mx-auto text-white/30 mb-3" />
                <p className="text-white/60 text-sm mb-4">
                  Nessun sito collegato a questa organizzazione
                </p>
                <Link href="/administration/sites/create">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border border-white/40 text-white hover:bg-white/20 hover:border-white transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crea primo sito
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sites.map((site) => (
                  <div
                    key={site.id}
                    className="group backdrop-blur-xl bg-white/5 border border-white/20 rounded-xl p-4 hover:bg-white/10 hover:shadow-xl transition-all duration-300 hover:border-white/40"
                  >
                    {/* Site Image */}
                    {site.image && (
                      <div className="mb-3 -mx-1 -mt-1">
                        <img
                          src={site.image}
                          alt={`${site.name} image`}
                          className="w-full h-24 object-contain rounded-lg bg-white/5"
                        />
                      </div>
                    )}
                    <h5 className="text-base font-bold text-white mb-1">
                      {site.name}
                    </h5>
                    {site.description && (
                      <p className="text-white/70 text-sm mb-3 line-clamp-2">
                        {site.description}
                      </p>
                    )}
                    <div className="space-y-1 mb-3">
                      <div className="text-xs text-white/60">
                        <span className="font-medium text-white/80">
                          Domain:
                        </span>{" "}
                        {site.subdomain}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN}
                      </div>
                      {site.custom_domain && (
                        <div className="text-xs text-white/60">
                          <span className="font-medium text-white/80">
                            Custom:
                          </span>{" "}
                          {site.custom_domain}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/sites/${site.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}/dashboard`}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="border border-white/40 text-white hover:bg-white/20 hover:border-white transition-all duration-300 text-xs h-7 px-2"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Visit
                        </Button>
                      </Link>
                      <Link href={`/administration/sites/${site.id}/edit`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border border-white/40 text-white hover:bg-white/20 hover:border-white transition-all duration-300 text-xs h-7 px-2"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      </Link>
                      <DangerousDeleteDialog
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            className="border border-red-400/50 text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all duration-300 text-xs h-7 px-2"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        }
                        title="Elimina Sito"
                        description={`Stai per eliminare il sito "${site.name}" e tutti i dati collegati.`}
                        confirmationText={site.name}
                        warningItems={[
                          "Tutti i progetti e le attività kanban",
                          "Tutto l'inventario e i prodotti",
                          "Tutti i clienti e i fornitori",
                          "Tutte le offerte",
                          "Tutti i tracciamenti temporali",
                          "Tutte le configurazioni e impostazioni del sito",
                        ]}
                        onConfirm={() => handleDeleteSite(site.id, site.name)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
