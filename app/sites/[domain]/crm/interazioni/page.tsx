import Link from "next/link";
import { PageLayout, PageHeader, PageContent } from "@/components/page-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/layout/empty-state";
import { MessageSquare } from "lucide-react";
import { requireCampagnaContext } from "@/lib/campagna/guard";
import { fetchInterazioni } from "@/lib/campagna/server-data";
import {
  INTERAZIONE_TIPO_LABELS,
  type InterazioneTipo,
} from "@/lib/campagna/config";

export const metadata = { title: "CRM - Interazioni" };

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("it-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function InterazioniPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const { siteId } = await requireCampagnaContext(domain);
  const interazioni = await fetchInterazioni(siteId);

  return (
    <PageLayout>
      <PageHeader
        title="Interazioni"
        subtitle="Registro delle interazioni con i contatti della campagna"
      />
      <PageContent>
        {interazioni.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6" />}
            title="Nessuna interazione"
            description="Le interazioni registrate dai contatti appariranno qui."
          />
        ) : (
          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Contatto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interazioni.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(i.data)}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/sites/${domain}/crm/contatti/${i.contatto_id}`}
                        className="hover:underline"
                      >
                        {i.contatto_nome || "Contatto"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {INTERAZIONE_TIPO_LABELS[i.tipo as InterazioneTipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {i.note || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}
