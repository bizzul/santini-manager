"use client";
import React, { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Task, Client, KanbanColumn } from "@/types/supabase";
import { DateManager } from "../../package/utils/dates/date-manager";
import { ManagerGuideButton } from "@/components/manager-guide";
import { getOfferFollowUpHighlightState } from "@/lib/offers";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { archiveItem } from "@/app/sites/[domain]/kanban/actions/archived-item-action";
import { removeItem } from "@/app/sites/[domain]/projects/actions/delete-item.action";
import { duplicateItem } from "@/app/sites/[domain]/kanban/actions/duplicate-item.action";
import { Archive, Copy, Trash2 } from "lucide-react";

interface OfferMiniCardProps {
  id: number;
  data: Task & {
    client?: Client;
    sellProduct?: { type?: string; name?: string };
    column?: KanbanColumn;
    positions?: string[];
    numero_pezzi?: number | null;
    isPreview?: boolean;
    locked?: boolean;
  };
  onCardClick: (task: Task) => void;
  domain?: string;
  onTaskDeleted?: () => void;
}

export default function OfferMiniCard({
  id,
  data,
  onCardClick,
  domain,
  onTaskDeleted,
}: OfferMiniCardProps) {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  // Orange after 7 days from send date, unless a recent follow-up keeps it green.
  const { isOverdue, daysSinceSent } = useMemo(() => {
    const sentDate = data.sent_date || data.sentDate;
    if (!sentDate) {
      return { isOverdue: false, daysSinceSent: 0 };
    }

    const sent = new Date(sentDate);
    const now = new Date();
    const diffTime = now.getTime() - sent.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return {
      isOverdue: diffDays >= 7,
      daysSinceSent: diffDays,
    };
  }, [data.sent_date, data.sentDate]);

  const { hasRecentFollowUp, daysSinceFollowUp } = useMemo(
    () => getOfferFollowUpHighlightState(data),
    [data],
  );

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: id.toString(),
      data: {
        id,
        fromColumn: data.column?.identifier,
      },
      disabled: data.locked || data.isPreview,
    });

  const dragStyle = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  // Get client display name
  const clientName = useMemo(() => {
    if (!data.client) return "-";
    if (data.client.clientType === "BUSINESS") {
      return data.client.businessName || "-";
    }
    const firstName = data.client.individualFirstName || "";
    const lastName = data.client.individualLastName || "";
    return `${lastName} ${firstName}`.trim() || "-";
  }, [data.client]);

  // Format sent date
  const sentDateFormatted = useMemo(() => {
    const sentDate = data.sent_date || data.sentDate;
    if (!sentDate) return "-";
    return DateManager.formatEUDate(sentDate);
  }, [data.sent_date, data.sentDate]);

  const sentWeekNumber = useMemo(() => {
    const sentDate = data.sent_date || data.sentDate;
    if (!sentDate) return null;
    return DateManager.getWeekNumber(sentDate);
  }, [data.sent_date, data.sentDate]);

  const projectSummary = useMemo(() => {
    const details = [data.name, data.luogo].filter(
      (value): value is string => Boolean(value && value.trim()),
    );
    return details.join(" · ") || "-";
  }, [data.name, data.luogo]);

  // Priorità a numero_pezzi, altrimenti conta le posizioni riempite
  const piecesOrPositions = useMemo(() => {
    // Se numero_pezzi è definito, usa quello
    if (data.numero_pezzi && data.numero_pezzi > 0) {
      return { value: data.numero_pezzi, label: 'pz' };
    }
    // Altrimenti conta le posizioni riempite
    if (!data.positions) return { value: 0, label: 'pos.' };
    const count = data.positions.filter((p) => p && p.trim() !== "").length;
    return { value: count, label: 'pos.' };
  }, [data.positions, data.numero_pezzi]);

  // Background class based on overdue status
  const getBackgroundClass = () => {
    if (isOverdue && hasRecentFollowUp) {
      return "bg-green-600 dark:bg-green-700";
    }
    if (isOverdue) {
      return "bg-orange-500 dark:bg-orange-600";
    }
    return "bg-slate-600 dark:bg-slate-700";
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if dragging
    if (isDragging) return;
    // Prevent click on drag handle
    if (e.target instanceof Element && e.target.closest("[data-drag-handle]"))
      return;

    onCardClick(data);
  };

  const statusMeta = useMemo(() => {
    if (isOverdue && hasRecentFollowUp && daysSinceFollowUp !== null) {
      return {
        className: "text-green-100",
        label:
          daysSinceFollowUp === 0
            ? "Contattato oggi"
            : `Contattato ${daysSinceFollowUp} giorni fa`,
      };
    }

    if (!isOverdue && daysSinceSent >= 5 && daysSinceSent < 7) {
      return {
        className: "text-yellow-100",
        label: `${7 - daysSinceSent} giorni al follow-up`,
      };
    }

    if (isOverdue) {
      return {
        className: "text-white",
        label: `Da ${daysSinceSent} giorni`,
      };
    }

    return {
      className: "text-white/80",
      label:
        daysSinceSent <= 0
          ? "Inviata oggi"
          : `Inviata da ${daysSinceSent} giorni`,
    };
  }, [daysSinceFollowUp, daysSinceSent, hasRecentFollowUp, isOverdue]);

  async function handleArchive() {
    setIsArchiving(true);
    try {
      const result = await archiveItem(!data.archived, data.id, domain);
      if (result && typeof result === "object" && "error" in result) {
        toast({
          variant: "destructive",
          description: result.message || "Errore nell'archiviazione",
        });
        return;
      }

      toast({
        description: data.archived
          ? `${data.unique_code} è stato ripristinato.`
          : `${data.unique_code} è stato archiviato.`,
      });
      onTaskDeleted?.();
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Errore nell'archiviazione del progetto",
      });
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await removeItem(id, domain);
      if (result && typeof result === "object" && "error" in result) {
        toast({
          variant: "destructive",
          description: result.message || "Errore nella cancellazione",
        });
        return;
      }

      toast({
        description: `${data.unique_code} è stato cancellato.`,
      });
      onTaskDeleted?.();
      setShowDeleteConfirm(false);
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Errore nella cancellazione del progetto",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const result = await duplicateItem(id, domain);
      if (result.error) {
        toast({
          variant: "destructive",
          description: result.message || "Errore nella duplicazione",
        });
        return;
      }

      toast({
        description: result.message || "Progetto duplicato con successo",
      });
      onTaskDeleted?.();
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Errore nella duplicazione del progetto",
      });
    } finally {
      setIsDuplicating(false);
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={data.isPreview ? undefined : setNodeRef}
          style={{
            ...dragStyle,
            opacity: isDragging ? 0.5 : 1,
            cursor: data.isPreview ? "not-allowed" : "pointer",
          }}
          {...(data.isPreview ? {} : { ...listeners, ...attributes })}
          onClick={handleClick}
          onContextMenu={(e) => e.preventDefault()}
          className={`
            w-full mb-2 shadow-md select-none rounded-r-xl rounded-l-sm overflow-hidden
            ${data.isPreview ? "opacity-75 cursor-not-allowed" : "hover:brightness-110"}
            ${getBackgroundClass()}
            text-white text-sm
            transition-all duration-200
          `}
        >
          <div className="flex h-[122px] flex-col">
            <div className="px-2 pt-2 pb-1 flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-sm shrink-0">{data.unique_code}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-white/80 shrink-0">
                  <ManagerGuideButton
                    label="Apri guida follow-up offerta"
                    stepId="follow-up"
                    variant="ghost"
                    size="icon"
                    showMascot={false}
                    className="h-6 w-6 text-white/80 hover:bg-white/10 hover:text-white"
                  />
                  <span>{sentDateFormatted}</span>
                  {sentWeekNumber && <span className="font-semibold">S.{sentWeekNumber}</span>}
                </div>
              </div>

              <div className="text-sm truncate mb-1">
                <span className="font-medium">{clientName}</span>
                {projectSummary !== "-" && (
                  <>
                    <span className="mx-1 text-white/50">·</span>
                    <span className="text-white/75">{projectSummary}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-white/85">
                  {piecesOrPositions.value > 0
                    ? `${piecesOrPositions.value} ${piecesOrPositions.label}`
                    : "-"}
                </span>
                <span className="text-white/40">|</span>
                <span className="font-semibold">
                  {((data.sellPrice || 0) / 1000).toFixed(1)}K
                </span>
              </div>
            </div>

            <div className="px-2 py-1 border-t border-white/20 text-xs">
              <span className={statusMeta.className}>{statusMeta.label}</span>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            void handleDuplicate();
          }}
          disabled={isDuplicating}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          {isDuplicating ? "Duplicando..." : "Duplica progetto"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            void handleArchive();
          }}
          disabled={isArchiving}
          className="flex items-center gap-2"
        >
          <Archive className="h-4 w-4" />
          {isArchiving
            ? "Archiviando..."
            : data.archived
              ? "Ripristina progetto"
              : "Archivia progetto"}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Cancella progetto
        </ContextMenuItem>
      </ContextMenuContent>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cancellazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler cancellare il progetto{" "}
              <strong>{data.unique_code}</strong>?
              <br />
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Cancellando..." : "Cancella"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContextMenu>
  );
}

