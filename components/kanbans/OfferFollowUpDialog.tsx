"use client";
import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Loader2,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Package,
  Euro,
  Send,
  FileText,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Task, KanbanColumn, Client } from "@/types/supabase";
import { DateManager } from "../../package/utils/dates/date-manager";
import { useToast } from "@/components/ui/use-toast";
import { useSiteId } from "@/hooks/use-site-id";

interface OfferFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task:
    | (Task & {
        client?: Client;
        sellProduct?: { type?: string; name?: string; category?: any };
        column?: KanbanColumn;
        positions?: string[];
        numero_pezzi?: number | null;
      })
    | null;
  columns: KanbanColumn[];
  onMoveCard: (
    taskId: number,
    columnId: number,
    columnIdentifier: string
  ) => Promise<void>;
  domain?: string;
}

type ContactType = "call" | "email" | "other";

export default function OfferFollowUpDialog({
  open,
  onOpenChange,
  task,
  columns,
  onMoveCard,
  domain,
}: OfferFollowUpDialogProps) {
  const { toast } = useToast();
  const { siteId } = useSiteId(domain);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactDate, setContactDate] = useState<Date>(new Date());
  const [contactType, setContactType] = useState<ContactType>("call");
  const [note, setNote] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState<string>("");

  const destinationColumns = useMemo(() => {
    if (!columns) return [];

    return columns
      .filter((col) => {
        const colType = col.column_type || col.columnType || "normal";
        const colIdentifier = col.identifier?.toUpperCase() || "";

        if (
          colIdentifier.includes("INVIAT") ||
          colIdentifier.includes("ELABOR") ||
          colIdentifier.includes("TRATTATIV")
        ) {
          return false;
        }

        return (
          colType === "won" ||
          colType === "lost" ||
          colIdentifier.includes("VINT") ||
          colIdentifier.includes("PERS")
        );
      })
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [columns]);

  const clientName = useMemo(() => {
    if (!task?.client) return "-";
    if (task.client.clientType === "BUSINESS") {
      return task.client.businessName || "-";
    }
    const firstName = task.client.individualFirstName || "";
    const lastName = task.client.individualLastName || "";
    return `${lastName} ${firstName}`.trim() || "-";
  }, [task?.client]);

  const contactPhone = useMemo(() => {
    if (!task?.client) return null;
    return task.client.mobilePhone || task.client.phone || null;
  }, [task?.client]);

  const sentDateFormatted = useMemo(() => {
    if (!task) return "-";
    const sentDate = task.sent_date || task.sentDate;
    if (!sentDate) return "-";
    return DateManager.formatEUDate(sentDate);
  }, [task]);

  const daysSinceSent = useMemo(() => {
    if (!task) return 0;
    const sentDate = task.sent_date || task.sentDate;
    if (!sentDate) return 0;
    const sent = new Date(sentDate);
    const now = new Date();
    return Math.floor((now.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
  }, [task]);

  const piecesDisplay = useMemo(() => {
    if (!task) return "-";
    if (task.numero_pezzi && task.numero_pezzi > 0) {
      return `${task.numero_pezzi} pz`;
    }
    if (task.positions && task.positions.length > 0) {
      const count = task.positions.filter((p: string) => p && p.trim() !== "").length;
      if (count > 0) return `${count} pos.`;
    }
    return "-";
  }, [task]);

  React.useEffect(() => {
    if (open && task) {
      setContactDate(new Date());
      setContactType("call");
      setNote("");
      setSelectedColumnId("");
    }
  }, [open, task?.id]);

  const handleSubmit = async () => {
    if (!task || !selectedColumnId) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Seleziona una destinazione per l'offerta",
      });
      return;
    }

    const selectedColumn = destinationColumns.find(
      (col) => col.id.toString() === selectedColumnId
    );

    if (!selectedColumn) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Colonna di destinazione non trovata",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const contactTypeLabels: Record<ContactType, string> = {
        call: "Chiamata",
        email: "Email",
        other: "Altro",
      };

      const fullNote = `[${format(contactDate, "dd/MM/yyyy", {
        locale: it,
      })}] ${contactTypeLabels[contactType]}: ${note}`;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (siteId) {
        headers["x-site-id"] = siteId;
      }

      const noteResponse = await fetch(`/api/tasks/${task.id}/notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          note: fullNote,
          contactType,
          contactDate: contactDate.toISOString(),
        }),
      });

      if (!noteResponse.ok) {
        console.warn("Note API not available, continuing with move");
      }

      await onMoveCard(
        task.id,
        selectedColumn.id,
        selectedColumn.identifier || ""
      );

      toast({
        title: "Follow-up salvato",
        description: `Offerta spostata in "${
          selectedColumn.title || selectedColumn.identifier
        }"`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error in follow-up:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!task) return null;

  const productName = task.sellProduct?.name || task.sellProduct?.type || "-";
  const categoryName = (() => {
    const cat = task.sellProduct?.category;
    if (!cat) return null;
    const catData = Array.isArray(cat) ? cat[0] : cat;
    return catData?.name || null;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Follow-up Offerta</span>
            <span className="text-lg font-bold text-primary">
              {task.unique_code}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          {/* LEFT: Project Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dettagli Progetto
            </h3>

            {/* Client */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Cliente</div>
                  <div className="font-semibold truncate">{clientName}</div>
                  {contactPhone && (
                    <a
                      href={`tel:${contactPhone}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="h-3 w-3" />
                      {contactPhone}
                    </a>
                  )}
                </div>
              </div>

              {/* Object Name + Location */}
              {(task.name || task.luogo) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    {task.name && (
                      <>
                        <div className="text-xs text-muted-foreground">Oggetto</div>
                        <div className="font-medium truncate">{task.name}</div>
                      </>
                    )}
                    {task.luogo && (
                      <>
                        <div className="text-xs text-muted-foreground mt-1">Luogo</div>
                        <div className="text-sm">{task.luogo}</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Product + Category */}
              <div className="flex items-start gap-3">
                <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Prodotto</div>
                  <div className="font-medium">{productName}</div>
                  {categoryName && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Categoria: {categoryName}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Numbers Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <Euro className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-xs text-muted-foreground">Valore</div>
                <div className="font-bold text-lg">
                  {((task.sellPrice || 0) / 1000).toFixed(1)}K
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-xs text-muted-foreground">Pezzi</div>
                <div className="font-bold text-lg">{piecesDisplay}</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <Send className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="text-xs text-muted-foreground">Inviata</div>
                <div className="font-bold text-sm">{sentDateFormatted}</div>
                {daysSinceSent > 0 && (
                  <div className={cn(
                    "text-xs mt-0.5",
                    daysSinceSent >= 7 ? "text-orange-600 font-semibold" : "text-muted-foreground"
                  )}>
                    {daysSinceSent} giorni fa
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            {task.deliveryDate && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Data consegna: </span>
                    <span className="font-medium text-sm">
                      {DateManager.formatEUDate(task.deliveryDate)}
                      {" "}(S.{DateManager.getWeekNumber(task.deliveryDate)})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes/Comments */}
            {task.other && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Note</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{task.other}</p>
              </div>
            )}
          </div>

          {/* RIGHT: Follow-up Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Azione Follow-up
            </h3>

            {/* Contact Date */}
            <div className="space-y-2">
              <Label>Data Contatto</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !contactDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {contactDate ? (
                      format(contactDate, "PPP", { locale: it })
                    ) : (
                      <span>Seleziona data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={contactDate}
                    onSelect={(date) => date && setContactDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Contact Type */}
            <div className="space-y-2">
              <Label>Tipo Contatto</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={contactType === "call" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setContactType("call")}
                  className="flex-1"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Chiamata
                </Button>
                <Button
                  type="button"
                  variant={contactType === "email" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setContactType("email")}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={contactType === "other" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setContactType("other")}
                  className="flex-1"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Altro
                </Button>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Inserisci le informazioni del contatto..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
              />
            </div>

            {/* Destination Column */}
            <div className="space-y-2">
              <Label>Sposta in</Label>
              <Select
                value={selectedColumnId}
                onValueChange={setSelectedColumnId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona destinazione..." />
                </SelectTrigger>
                <SelectContent>
                  {destinationColumns.map((col) => {
                    const colType = col.column_type || col.columnType || "normal";
                    let icon = "";
                    if (colType === "won") icon = "🏆 ";
                    if (colType === "lost") icon = "❌ ";

                    return (
                      <SelectItem key={col.id} value={col.id.toString()}>
                        {icon}
                        {col.title || col.identifier}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedColumnId}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salva e Sposta"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
