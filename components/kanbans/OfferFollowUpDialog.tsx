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
import { CalendarIcon, Loader2, Phone, Mail, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Task, KanbanColumn, Client } from "@/types/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useSiteId } from "@/hooks/use-site-id";

interface OfferFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: (Task & { client?: Client; sellProduct?: { type?: string; name?: string } }) | null;
  columns: KanbanColumn[];
  onMoveCard: (taskId: number, columnId: number, columnIdentifier: string) => Promise<void>;
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

  // Filter columns to show only valid destinations (Trattativa, Vinta, Persa)
  // These are columns after "Inviata" that make sense for follow-up
  const destinationColumns = useMemo(() => {
    if (!columns) return [];
    
    // Get columns that are not the current column (Inviata)
    // and are either normal type or won/lost type
    return columns
      .filter((col) => {
        const colType = col.column_type || col.columnType || "normal";
        const colIdentifier = col.identifier?.toUpperCase() || "";
        
        // Exclude "Inviata" column and "Elaborazione" column
        if (colIdentifier.includes("INVIAT") || colIdentifier.includes("ELABOR")) {
          return false;
        }
        
        // Include Trattativa (normal), Vinta (won), Persa (lost)
        return (
          colIdentifier.includes("TRATTATIV") ||
          colType === "won" ||
          colType === "lost" ||
          colIdentifier.includes("VINT") ||
          colIdentifier.includes("PERS")
        );
      })
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [columns]);

  // Get client name
  const clientName = useMemo(() => {
    if (!task?.client) return "-";
    if (task.client.clientType === "BUSINESS") {
      return task.client.businessName || "-";
    }
    const firstName = task.client.individualFirstName || "";
    const lastName = task.client.individualLastName || "";
    return `${firstName} ${lastName}`.trim() || "-";
  }, [task?.client]);

  // Reset form when dialog opens with new task
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
      // Build the note content
      const contactTypeLabels: Record<ContactType, string> = {
        call: "Chiamata",
        email: "Email",
        other: "Altro",
      };

      const fullNote = `[${format(contactDate, "dd/MM/yyyy", { locale: it })}] ${contactTypeLabels[contactType]}: ${note}`;

      // Save the note via API
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (siteId) {
        headers["x-site-id"] = siteId;
      }

      // Add note to task
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
        // Note API might not exist yet, continue anyway
        console.warn("Note API not available, continuing with move");
      }

      // Move the card to the selected column
      await onMoveCard(
        task.id,
        selectedColumn.id,
        selectedColumn.identifier || ""
      );

      toast({
        title: "Follow-up salvato",
        description: `Offerta spostata in "${selectedColumn.title || selectedColumn.identifier}"`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Follow-up Offerta</span>
            <span className="text-sm font-normal text-muted-foreground">
              {task.unique_code}
            </span>
          </DialogTitle>
          <DialogDescription>
            Cliente: <strong>{clientName}</strong>
            {task.sellProduct?.type && (
              <span className="ml-2">• {task.sellProduct.type}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              rows={3}
            />
          </div>

          {/* Destination Column */}
          <div className="space-y-2">
            <Label>Sposta in</Label>
            <Select value={selectedColumnId} onValueChange={setSelectedColumnId}>
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedColumnId}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salva e Sposta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

