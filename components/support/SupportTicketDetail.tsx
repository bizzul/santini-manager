"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { SupportChatThread } from "@/components/support/SupportChatThread";
import {
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TICKET_STATUSES,
  SUPPORT_PRIORITIES,
  formatTicketNumber,
  type SupportPriority,
  type SupportTicketStatus,
} from "@/lib/support/settings";
import type { SupportTicketDetail } from "@/lib/support/types";

export function SupportTicketDetailView({
  ticket,
  domain,
  isAdmin,
}: {
  ticket: SupportTicketDetail;
  domain: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [saving, setSaving] = useState(false);

  async function sendMessage() {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, body }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Invio fallito");
      setBody("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invio fallito");
    } finally {
      setSaving(false);
    }
  }

  async function saveAdmin() {
    setSaving(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, status, priority }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Salvataggio fallito");
      toast.success("Ticket aggiornato");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  }

  async function convertKb() {
    setSaving(true);
    try {
      const response = await fetch(
        `/api/support/tickets/${ticket.id}/convert-kb`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Conversione fallita");
      toast.success("Bozza articolo creata");
      router.push(`/sites/${domain}/supporto/gestione/kb`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Conversione fallita");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4">
        <SupportChatThread messages={ticket.messages} />
        <div className="space-y-2">
          <Label htmlFor="reply">Risposta</Label>
          <Textarea
            id="reply"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Scrivi un messaggio…"
          />
          <Button disabled={saving || body.trim().length === 0} onClick={sendMessage}>
            Invia
          </Button>
        </div>
      </div>

      <aside className="space-y-4 rounded-lg border bg-card p-4">
        <div>
          <p className="text-xs text-muted-foreground">Ticket</p>
          <p className="font-semibold">{formatTicketNumber(ticket.publicNumber)}</p>
        </div>
        <Badge>
          {SUPPORT_STATUS_LABELS[ticket.status as SupportTicketStatus] ??
            ticket.status}
        </Badge>
        <p className="text-sm text-muted-foreground">
          Priorità:{" "}
          {SUPPORT_PRIORITY_LABELS[ticket.priority as SupportPriority] ??
            ticket.priority}
        </p>
        {ticket.context.pathname ? (
          <p className="text-xs text-muted-foreground break-all">
            Pagina: {ticket.context.pathname}
          </p>
        ) : null}
        {ticket.context.userAgent ? (
          <p className="text-xs text-muted-foreground break-all">
            Browser: {ticket.context.userAgent}
          </p>
        ) : null}

        {isAdmin ? (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="space-y-1">
              <Label>Stato</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_TICKET_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {SUPPORT_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priorità</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_PRIORITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {SUPPORT_PRIORITY_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={saving} onClick={saveAdmin} className="w-full">
              Salva
            </Button>
            <Button
              disabled={saving}
              variant="outline"
              onClick={convertKb}
              className="w-full"
            >
              Converti in articolo KB
            </Button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
