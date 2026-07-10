"use client";

import { useState } from "react";
import { Building2, Loader2, MapPin, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface AccessItem {
  id: string;
  name: string;
  organizationName?: string;
}

interface UserAccessCellProps {
  userId: string;
  organizations: AccessItem[];
  sites: AccessItem[];
  disabled?: boolean;
  emptyLabel?: string;
}

type PendingRemoval = {
  type: "organization" | "site";
  id: string;
  name: string;
};

export default function UserAccessCell({
  userId,
  organizations,
  sites,
  disabled = false,
  emptyLabel = "Nessun accesso",
}: UserAccessCellProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const [removing, setRemoving] = useState(false);

  const hasAccess = organizations.length > 0 || sites.length > 0;

  const handleRemove = async () => {
    if (!pending) return;
    setRemoving(true);
    try {
      const response = await fetch(`/api/users/${userId}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: pending.type, id: pending.id }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Impossibile rimuovere l'accesso");
      }

      toast({
        title:
          pending.type === "organization"
            ? "Organizzazione rimossa"
            : "Sito rimosso",
        description: `Accesso a "${pending.name}" revocato con successo.`,
      });
      setPending(null);
      router.refresh();
    } catch (error) {
      toast({
        title: "Errore",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante la rimozione dell'accesso",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        {!hasAccess && (
          <span className="text-xs text-white/40 italic">{emptyLabel}</span>
        )}

        {organizations.map((org) => (
          <span
            key={`org-${org.id}`}
            className="group inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 pl-2 pr-1 py-0.5 text-xs text-white/90 w-fit max-w-full"
          >
            <Building2 className="h-3 w-3 shrink-0 text-white/60" />
            <span className="truncate">{org.name}</span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Rimuovi organizzazione ${org.name}`}
                onClick={() =>
                  setPending({ type: "organization", id: org.id, name: org.name })
                }
                className="ml-0.5 rounded-full p-0.5 text-white/50 hover:bg-red-500/30 hover:text-red-200 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {sites.map((site) => (
          <span
            key={`site-${site.id}`}
            className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 pl-2 pr-1 py-0.5 text-xs text-white/80 w-fit max-w-full"
          >
            <MapPin className="h-3 w-3 shrink-0 text-white/50" />
            <span className="truncate">
              {site.name}
              {site.organizationName && (
                <span className="text-white/40"> · {site.organizationName}</span>
              )}
            </span>
            {!disabled && (
              <button
                type="button"
                aria-label={`Rimuovi sito ${site.name}`}
                onClick={() =>
                  setPending({ type: "site", id: site.id, name: site.name })
                }
                className="ml-0.5 rounded-full p-0.5 text-white/50 hover:bg-red-500/30 hover:text-red-200 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !removing) setPending(null);
        }}
      >
        <AlertDialogContent
          onKeyDown={(e) => {
            if (e.key === "Enter" && !removing) {
              e.preventDefault();
              handleRemove();
            }
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.type === "organization"
                ? "Rimuovi accesso all'organizzazione"
                : "Rimuovi accesso al sito"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi davvero revocare l&apos;accesso a{" "}
              <span className="font-semibold">{pending?.name}</span>? L&apos;utente
              non potrà più accedere a{" "}
              {pending?.type === "organization"
                ? "questa organizzazione"
                : "questo sito"}
              . L&apos;azione può essere annullata riassegnando l&apos;accesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700"
            >
              {removing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rimozione...
                </>
              ) : (
                "Rimuovi accesso"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
