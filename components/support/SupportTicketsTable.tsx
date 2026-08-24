"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/layout/empty-state";
import { Headset } from "lucide-react";
import {
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
  formatTicketNumber,
  type SupportPriority,
  type SupportTicketStatus,
} from "@/lib/support/settings";
import type { SupportTicketListItem } from "@/lib/support/types";

function statusVariant(status: string) {
  if (status === "open") return "warning" as const;
  if (status === "in_progress") return "info" as const;
  if (status === "resolved") return "success" as const;
  if (status === "closed") return "secondary" as const;
  return "outline" as const;
}

export function SupportTicketsTable({
  tickets,
  hrefFor,
  showSite = false,
}: {
  tickets: SupportTicketListItem[];
  hrefFor: (ticket: SupportTicketListItem) => string;
  showSite?: boolean;
}) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={<Headset className="h-6 w-6" />}
        title="Nessun ticket"
        description="Quando apri una segnalazione dal widget, compare qui."
      />
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numero</TableHead>
            <TableHead>Oggetto</TableHead>
            {showSite ? <TableHead>Spazio</TableHead> : null}
            <TableHead>Stato</TableHead>
            <TableHead>Priorità</TableHead>
            <TableHead>Aperto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>
                <Link href={hrefFor(ticket)} className="font-medium text-primary">
                  {formatTicketNumber(ticket.publicNumber)}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={hrefFor(ticket)}>{ticket.subject}</Link>
              </TableCell>
              {showSite ? <TableCell>{ticket.siteName ?? "—"}</TableCell> : null}
              <TableCell>
                <Badge variant={statusVariant(ticket.status)}>
                  {SUPPORT_STATUS_LABELS[ticket.status as SupportTicketStatus] ??
                    ticket.status}
                </Badge>
              </TableCell>
              <TableCell>
                {SUPPORT_PRIORITY_LABELS[ticket.priority as SupportPriority] ??
                  ticket.priority}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleString("it-CH")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
