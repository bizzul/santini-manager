"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PageContent,
  PageHeader,
  PageLayout,
} from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Download,
  Eye,
  FileText,
  Mail,
  Pencil,
  RefreshCw,
} from "lucide-react";
import type {
  DestinatarioInput,
  DocumentoArricchito,
  TipoDocumento,
} from "@/validation/documenti/extracted-document";
import {
  consumeVoiceDocumentPrefill,
  type VoiceDocumentPrefill,
} from "@/lib/voice-document-prefill";
import type { DocumentTemplate } from "@/lib/documenti/template-types";
import { DocumentReviewForm } from "./document-review-form";
import {
  DocumentCreateForm,
  type ClienteOption,
  type FornitoreOption,
  type OffertaOption,
} from "./document-create-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getTipoDocumentoLabel } from "@/lib/documenti/template-types";
import { DocumentPreview } from "@/components/documenti/document-preview";
import { isCommercialType } from "@/lib/documenti/document-types";

interface RigaDb {
  descrizione: string;
  descrizione_estesa: string | null;
  misure: string | null;
  unita: string;
  quantita: number;
  prezzo_unitario: number;
  sconto: number | null;
  is_trasporto: boolean;
  articolo_id: string | null;
  art: string | null;
  totale_riga: number | null;
  immagine_url: string | null;
}

export interface DocumentoListItem {
  id: string;
  tipo_documento: TipoDocumento;
  numero: string | null;
  oggetto: string | null;
  status: string;
  totale_chf: number | null;
  created_at: string;
  corpo_testo: string | null;
  pdf_url: string | null;
  condizioni_pagamento: string[] | null;
  termine_fornitura: string | null;
  note: string | null;
  cliente_id: number | null;
  destinatario: {
    ragioneSociale?: string;
    aca?: string | null;
    via?: string | null;
    cap?: string | null;
    citta?: string | null;
    email?: string | null;
    fornitoreId?: number | null;
  } | null;
  allegati: Array<{
    name: string;
    url: string;
    storagePath: string;
  }> | null;
  righe_documento: RigaDb[] | null;
}

interface DocumentiPageClientProps {
  domain: string;
  siteId: string;
  template: DocumentTemplate;
  documenti: DocumentoListItem[];
  clients: ClienteOption[];
  suppliers: FornitoreOption[];
  offers: OffertaOption[];
}

type Step = "list" | "create" | "review" | "view";

function dbToDocumentoArricchito(doc: DocumentoListItem): DocumentoArricchito {
  const righe = (doc.righe_documento ?? []).map((r) => ({
    descrizione: r.descrizione,
    descrizioneEstesa: r.descrizione_estesa ?? null,
    misure: r.misure,
    unita: r.unita as DocumentoArricchito["righe"][0]["unita"],
    quantita: Number(r.quantita),
    prezzoUnitario: Number(r.prezzo_unitario),
    sconto: r.sconto != null ? Number(r.sconto) : null,
    isTrasporto: r.is_trasporto,
    articoloId: r.articolo_id,
    articoloSource: undefined,
    isNuovo: false,
    art: r.art ?? undefined,
    totaleRiga: r.totale_riga != null ? Number(r.totale_riga) : undefined,
    immagineUrl: r.immagine_url ?? null,
  }));

  const totali =
    doc.totale_chf != null && isCommercialType(doc.tipo_documento)
      ? {
          totNetto: righe.reduce((s, r) => s + (r.totaleRiga ?? 0), 0),
          iva: 0,
          totaleCHF: Number(doc.totale_chf),
        }
      : undefined;

  return {
    tipoDocumento: doc.tipo_documento,
    destinatario: {
      ragioneSociale: doc.destinatario?.ragioneSociale ?? "",
      aca: doc.destinatario?.aca ?? null,
      via: doc.destinatario?.via ?? null,
      cap: doc.destinatario?.cap ?? null,
      citta: doc.destinatario?.citta ?? null,
      clienteId: doc.cliente_id,
      fornitoreId: doc.destinatario?.fornitoreId ?? null,
      isNuovo: false,
      email: doc.destinatario?.email ?? null,
    },
    oggetto: doc.oggetto ?? "",
    corpoTesto: doc.corpo_testo,
    righe,
    condizioniPagamento: doc.condizioni_pagamento ?? [],
    termineFornitura: doc.termine_fornitura,
    note: doc.note,
    totali,
    allegati: doc.allegati ?? [],
  };
}

export function DocumentiPageClient({
  domain,
  siteId,
  template,
  documenti,
  clients,
  suppliers,
  offers,
}: DocumentiPageClientProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("list");
  const [sourceText, setSourceText] = useState("");
  const [linkedTaskId, setLinkedTaskId] = useState<number | null>(null);
  const [documentoGenerato, setDocumentoGenerato] =
    useState<DocumentoArricchito | null>(null);
  const [editingDocumentoId, setEditingDocumentoId] = useState<string | null>(
    null,
  );
  const [viewDocumento, setViewDocumento] =
    useState<DocumentoListItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [documentiList, setDocumentiList] = useState(documenti);
  const [voicePrefill, setVoicePrefill] =
    useState<VoiceDocumentPrefill | null>(null);

  useEffect(() => {
    setDocumentiList(documenti);
  }, [documenti]);

  useEffect(() => {
    const prefill = consumeVoiceDocumentPrefill();
    if (!prefill) return;

    setVoicePrefill(prefill);
    setStep("create");
    toast({
      description:
        prefill.summary ||
        "Generatore documenti precompilato dal comando vocale. Rivedi i dati e premi Genera.",
    });
  }, [toast]);

  const refreshDocumenti = useCallback(async () => {
    try {
      const response = await fetch("/api/documenti", {
        headers: { "x-site-domain": domain },
      });
      if (response.ok) {
        const data = (await response.json()) as DocumentoListItem[];
        setDocumentiList(data);
      }
    } catch {
      // L'elenco verrà aggiornato al prossimo router.refresh()
    }
  }, [domain]);

  const handleGenerated = (
    documento: DocumentoArricchito,
    testo: string,
    taskId?: number | null,
  ) => {
    setDocumentoGenerato(documento);
    setSourceText(testo);
    setLinkedTaskId(taskId ?? null);
    setEditingDocumentoId(null);
    setStep("review");
  };

  const handleEdit = (doc: DocumentoListItem) => {
    setDocumentoGenerato(dbToDocumentoArricchito(doc));
    setEditingDocumentoId(doc.id);
    setSourceText("");
    setStep("review");
  };

  const downloadPdf = async (docId: string, filename?: string) => {
    setActionLoading(`pdf-${docId}`);
    try {
      const response = await fetch(`/api/documenti/${docId}/pdf`, {
        headers: { "x-site-domain": domain },
      });
      if (!response.ok) {
        const err = await response.json();
        toast({
          variant: "destructive",
          description: err.message ?? err.error ?? "Errore PDF",
        });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? `documento-${docId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      await refreshDocumenti();
    } catch {
      toast({
        variant: "destructive",
        description: "Errore nel download del PDF",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const sendMailto = (doc: DocumentoListItem) => {
    const email = doc.destinatario?.email;
    const subject = encodeURIComponent(
      `${getTipoDocumentoLabel(doc.tipo_documento)}${doc.numero ? ` ${doc.numero}` : ""} - ${doc.oggetto ?? ""}`,
    );
    const body = encodeURIComponent(
      `Gentile ${doc.destinatario?.ragioneSociale ?? "destinatario"},\n\nIn allegato il documento richiesto.\n\nCordiali saluti`,
    );
    const mailto = email
      ? `mailto:${email}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    toast({
      description:
        "Client email aperto. Scarica il PDF e allegalo manualmente.",
    });
  };

  if (step === "review" && documentoGenerato) {
    return (
      <PageLayout>
        <PageHeader
          title="Generatore documenti"
          subtitle="Verifica i campi generati prima del salvataggio"
        />
        <PageContent>
          <DocumentReviewForm
            domain={domain}
            siteId={siteId}
            initialDocumento={documentoGenerato}
            template={template}
            sourceText={sourceText}
            documentoId={editingDocumentoId}
            taskId={linkedTaskId}
            onBack={() => {
              setStep(editingDocumentoId ? "list" : "create");
              setDocumentoGenerato(null);
              setEditingDocumentoId(null);
              setLinkedTaskId(null);
            }}
            onSaved={() => {
              setStep("list");
              setDocumentoGenerato(null);
              setEditingDocumentoId(null);
              setLinkedTaskId(null);
              void refreshDocumenti();
            }}
          />
        </PageContent>
      </PageLayout>
    );
  }

  if (step === "view" && viewDocumento) {
    const previewDoc = dbToDocumentoArricchito(viewDocumento);
    return (
      <PageLayout>
        <PageHeader
          title="Visualizza documento"
          subtitle={viewDocumento.oggetto ?? ""}
          actions={
            <Button variant="outline" onClick={() => setStep("list")}>
              Torna all&apos;elenco
            </Button>
          }
        />
        <PageContent variant="narrow">
          <DocumentPreview
            documento={previewDoc}
            template={template}
            numero={viewDocumento.numero}
            dataDocumento={new Date(viewDocumento.created_at).toLocaleDateString(
              "it-CH",
              { day: "2-digit", month: "long", year: "numeric" },
            )}
          />
        </PageContent>
      </PageLayout>
    );
  }

  if (step === "create") {
    return (
      <PageLayout>
        <PageHeader
          title="Generatore documenti"
          subtitle="Compila il form: l'AI genererà il contenuto strutturato"
          actions={
            <Button variant="outline" onClick={() => setStep("list")}>
              Torna all&apos;elenco
            </Button>
          }
        />
        <PageContent variant="narrow">
          <DocumentCreateForm
            domain={domain}
            siteId={siteId}
            clients={clients}
            suppliers={suppliers}
            offers={offers}
            initialValues={
              voicePrefill
                ? {
                    tipoDocumento: voicePrefill.tipoDocumento,
                    destinatario: voicePrefill.destinatario as
                      | DestinatarioInput
                      | undefined,
                    oggetto: voicePrefill.oggetto,
                    testo: voicePrefill.testo,
                  }
                : undefined
            }
            onGenerated={handleGenerated}
            onCancel={() => {
              setVoicePrefill(null);
              setStep("list");
            }}
          />
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Generatore documenti"
        subtitle="Offerte, fatture, lettere e comunicazioni su carta intestata"
        actions={
          <Button onClick={() => setStep("create")}>Nuovo documento</Button>
        }
      />
      <PageContent>
        {documentiList.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Nessun documento"
            description="Crea il primo documento con il form guidato e la generazione AI."
            action={
              <Button onClick={() => setStep("create")}>Nuovo documento</Button>
            }
          />
        ) : (
          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Numero</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Oggetto</TableHead>
                  <TableHead className="text-right">Totale CHF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-24">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentiList.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      {getTipoDocumentoLabel(doc.tipo_documento)}
                    </TableCell>
                    <TableCell>{doc.numero ?? "—"}</TableCell>
                    <TableCell>
                      {doc.destinatario?.ragioneSociale ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {doc.oggetto ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {doc.totale_chf != null
                        ? Number(doc.totale_chf).toFixed(2)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString("it-CH")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            ···
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setViewDocumento(doc);
                              setStep("view");
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizza
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={actionLoading === `pdf-${doc.id}`}
                            onClick={() =>
                              void downloadPdf(
                                doc.id,
                                `${doc.tipo_documento}-${doc.numero ?? doc.id}.pdf`,
                              )
                            }
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Scarica PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={actionLoading === `regen-${doc.id}`}
                            onClick={() => {
                              setActionLoading(`regen-${doc.id}`);
                              void downloadPdf(doc.id).finally(() =>
                                setActionLoading(null),
                              );
                              toast({ description: "PDF rigenerato" });
                            }}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Rigenera PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(doc)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendMailto(doc)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Invia via email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
