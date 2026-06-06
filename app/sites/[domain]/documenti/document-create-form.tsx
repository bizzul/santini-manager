"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { LoadingState } from "@/components/layout/loading-state";
import { DOCUMENT_TYPES } from "@/lib/documenti/document-types";
import {
  validateDocumentAttachment,
  DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES,
} from "@/lib/documenti/attachment-validation";
import type {
  Allegato,
  DestinatarioInput,
  DocumentoArricchito,
  TipoDocumento,
} from "@/validation/documenti/extracted-document";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Paperclip, X } from "lucide-react";

export interface ClienteOption {
  id: number;
  businessName: string | null;
  individualFirstName?: string | null;
  individualLastName?: string | null;
  individualTitle?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: number | null;
  email?: string | null;
  contactPeople?: Array<{
    name?: string | null;
    role?: string | null;
    email?: string | null;
    phone?: string | null;
  }> | null;
}

export interface OffertaOption {
  id: number;
  unique_code: string;
  name: string;
  clientId: number | null;
  clientName: string | null;
  label: string;
}

export interface FornitoreOption {
  id: number;
  name: string;
  address?: string | null;
  cap?: number | null;
  location?: string | null;
  email?: string | null;
  contact?: string | null;
}

interface DocumentCreateFormProps {
  domain: string;
  siteId: string;
  clients: ClienteOption[];
  suppliers: FornitoreOption[];
  offers?: OffertaOption[];
  initialValues?: {
    tipoDocumento?: TipoDocumento;
    destinatario?: DestinatarioInput;
    oggetto?: string;
    testo?: string;
    allegati?: Allegato[];
    taskId?: number | null;
  };
  onGenerated: (
    documento: DocumentoArricchito,
    sourceText: string,
    taskId?: number | null,
  ) => void;
  onCancel: () => void;
}

type DestinatarioMode = "cliente" | "fornitore" | "manuale";

function clientDisplayName(c: ClienteOption): string {
  return (
    c.businessName?.trim() ||
    [c.individualFirstName, c.individualLastName].filter(Boolean).join(" ") ||
    `Cliente #${c.id}`
  );
}

function clientAca(c: ClienteOption): string {
  const contact = c.contactPeople?.[0];
  if (contact?.name?.trim()) {
    return contact.role?.trim()
      ? `${contact.name.trim()} (${contact.role.trim()})`
      : contact.name.trim();
  }
  const person = [c.individualFirstName, c.individualLastName]
    .filter(Boolean)
    .join(" ");
  if (person) {
    return c.individualTitle?.trim()
      ? `${c.individualTitle.trim()} ${person}`
      : person;
  }
  return "";
}

export function DocumentCreateForm({
  domain,
  siteId,
  clients,
  suppliers,
  offers = [],
  initialValues,
  onGenerated,
  onCancel,
}: DocumentCreateFormProps) {
  const { toast } = useToast();
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>(
    initialValues?.tipoDocumento ?? "OFFERTA",
  );
  const [destMode, setDestMode] = useState<DestinatarioMode>(
    initialValues?.destinatario?.tipo ?? "cliente",
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    initialValues?.destinatario?.entityId != null
      ? String(initialValues.destinatario.entityId)
      : "",
  );
  const [ragioneSociale, setRagioneSociale] = useState(
    initialValues?.destinatario?.ragioneSociale ?? "",
  );
  const [aca, setAca] = useState(initialValues?.destinatario?.aca ?? "");
  const [via, setVia] = useState(initialValues?.destinatario?.via ?? "");
  const [cap, setCap] = useState(initialValues?.destinatario?.cap ?? "");
  const [citta, setCitta] = useState(initialValues?.destinatario?.citta ?? "");
  const [email, setEmail] = useState(initialValues?.destinatario?.email ?? "");
  const [selectedOfferId, setSelectedOfferId] = useState<string>(
    initialValues?.taskId != null ? String(initialValues.taskId) : "",
  );
  const [oggetto, setOggetto] = useState(initialValues?.oggetto ?? "");
  const [testo, setTesto] = useState(initialValues?.testo ?? "");
  const [allegati, setAllegati] = useState<Allegato[]>(
    initialValues?.allegati ?? [],
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const typeConfig = useMemo(
    () => DOCUMENT_TYPES.find((t) => t.id === tipoDocumento),
    [tipoDocumento],
  );

  const applyCliente = useCallback(
    (id: string) => {
      const client = clients.find((c) => c.id === Number(id));
      if (!client) return;
      setRagioneSociale(clientDisplayName(client));
      setAca(clientAca(client));
      setVia(client.address ?? "");
      setCap(client.zipCode != null ? String(client.zipCode) : "");
      setCitta(client.city ?? "");
      setEmail(client.email ?? "");
    },
    [clients],
  );

  const applyFornitore = (id: string) => {
    const supplier = suppliers.find((s) => s.id === Number(id));
    if (!supplier) return;
    setRagioneSociale(supplier.name);
    setAca(supplier.contact ?? "");
    setVia(supplier.address ?? "");
    setCap(supplier.cap != null ? String(supplier.cap) : "");
    setCitta(supplier.location ?? "");
    setEmail(supplier.email ?? "");
  };

  const handleEntityChange = (id: string) => {
    setSelectedEntityId(id);
    if (destMode === "cliente") applyCliente(id);
    if (destMode === "fornitore") applyFornitore(id);
  };

  const handleDestModeChange = (mode: DestinatarioMode) => {
    setDestMode(mode);
    if (mode === "manuale") {
      setSelectedEntityId("");
      return;
    }
    if (mode === "cliente" && clients.length > 0) {
      handleEntityChange(String(clients[0].id));
      return;
    }
    if (mode === "fornitore" && suppliers.length > 0) {
      handleEntityChange(String(suppliers[0].id));
    }
  };

  const showOfferPicker =
    tipoDocumento === "OFFERTA" || tipoDocumento === "PREVENTIVO";

  const handleOfferChange = (offerId: string) => {
    setSelectedOfferId(offerId);
    const offer = offers.find((o) => o.id === Number(offerId));
    if (!offer) return;

    const subject =
      offer.name?.trim() && offer.name !== offer.unique_code
        ? `Offerta N°: ${offer.unique_code} - ${offer.name}`
        : `Offerta N°: ${offer.unique_code}`;
    setOggetto(subject);

    if (offer.clientId) {
      setDestMode("cliente");
      handleEntityChange(String(offer.clientId));
    }
  };

  useEffect(() => {
    if (destMode !== "cliente" || selectedEntityId || clients.length === 0) {
      return;
    }
    const id = String(clients[0].id);
    setSelectedEntityId(id);
    applyCliente(id);
  }, [destMode, selectedEntityId, clients, applyCliente]);

  const uploadAttachment = useCallback(
    async (file: File) => {
      const validation = validateDocumentAttachment({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      if (!validation.valid) {
        toast({ variant: "destructive", description: validation.message });
        return;
      }

      setIsUploading(true);
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop();
        const safeName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "_")
          .substring(0, 50);
        const fileName = `${safeName}-${Date.now()}.${ext}`;
        const filePath = `${siteId}/documenti/temp/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file, { upsert: false });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("documents").getPublicUrl(filePath);

        setAllegati((prev) => [
          ...prev,
          {
            name: file.name,
            url: publicUrl,
            storagePath: filePath,
            size: file.size,
            mimeType: file.type,
          },
        ]);
      } catch {
        toast({
          variant: "destructive",
          description: "Errore nel caricamento dell'allegato",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [siteId, toast],
  );

  const handleGenerate = async () => {
    if (!oggetto.trim() || !testo.trim() || !ragioneSociale.trim()) {
      toast({
        variant: "destructive",
        description: "Compila tipo, destinatario, oggetto e testo descrittivo",
      });
      return;
    }

    const destinatario: DestinatarioInput = {
      tipo: destMode,
      entityId:
        destMode !== "manuale" && selectedEntityId
          ? Number(selectedEntityId)
          : null,
      ragioneSociale: ragioneSociale.trim(),
      aca: aca.trim() || null,
      via: via.trim() || null,
      cap: cap.trim() || null,
      citta: citta.trim() || null,
      email: email.trim() || null,
    };

    setIsGenerating(true);
    try {
      const response = await fetch("/api/documenti/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-site-domain": domain,
        },
        body: JSON.stringify({
          tipoDocumento,
          destinatario,
          oggetto: oggetto.trim(),
          testo: testo.trim(),
          allegati,
          taskId:
            selectedOfferId && showOfferPicker
              ? Number(selectedOfferId)
              : null,
          offertaCodice:
            selectedOfferId && showOfferPicker
              ? offers.find((o) => o.id === Number(selectedOfferId))
                  ?.unique_code ?? null
              : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const detail = [
          result.message,
          result.providerErrorType
            ? `(${result.providerErrorType})`
            : null,
        ]
          .filter(Boolean)
          .join(" ");
        toast({
          variant: "destructive",
          description: detail || result.error || "Errore nella generazione",
        });
        return;
      }

      const taskId =
        selectedOfferId && showOfferPicker ? Number(selectedOfferId) : null;
      onGenerated(result.documento, testo.trim(), taskId);
    } catch {
      toast({
        variant: "destructive",
        description: "Errore di rete durante la generazione",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block">Tipo documento</Label>
        <Select
          value={tipoDocumento}
          onValueChange={(v) => setTipoDocumento(v as TipoDocumento)}
        >
          <SelectTrigger className="w-full max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {typeConfig ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {typeConfig.category === "commercial"
              ? "Documento commerciale con righe articolo e totali"
              : "Lettera in prosa senza tabella articoli"}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <Label>Destinatario</Label>
        <Select
          value={destMode}
          onValueChange={(v) => handleDestModeChange(v as DestinatarioMode)}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cliente">Cliente anagrafica</SelectItem>
            <SelectItem value="fornitore">Fornitore anagrafica</SelectItem>
            <SelectItem value="manuale">Inserimento manuale</SelectItem>
          </SelectContent>
        </Select>

        {destMode === "cliente" ? (
          <Select
            value={selectedEntityId || undefined}
            onValueChange={handleEntityChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {clientDisplayName(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {destMode === "fornitore" ? (
          <Select
            value={selectedEntityId || undefined}
            onValueChange={handleEntityChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona fornitore" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Ragione sociale / Nome</Label>
            <Input
              value={ragioneSociale}
              onChange={(e) => setRagioneSociale(e.target.value)}
            />
          </div>
          <div>
            <Label>a.c.a / Riferimento</Label>
            <Input value={aca} onChange={(e) => setAca(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Via</Label>
            <Input value={via} onChange={(e) => setVia(e.target.value)} />
          </div>
          <div>
            <Label>CAP</Label>
            <Input value={cap} onChange={(e) => setCap(e.target.value)} />
          </div>
          <div>
            <Label>Città</Label>
            <Input value={citta} onChange={(e) => setCitta(e.target.value)} />
          </div>
        </div>
      </div>

      {showOfferPicker && offers.length > 0 ? (
        <div>
          <Label className="mb-2 block">Offerta collegata</Label>
          <Select
            value={selectedOfferId || undefined}
            onValueChange={handleOfferChange}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Seleziona offerta esistente (opzionale)" />
            </SelectTrigger>
            <SelectContent>
              {offers.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Collega il documento a un&apos;offerta del database: compila
            automaticamente oggetto e cliente.
          </p>
        </div>
      ) : null}

      <div>
        <Label className="mb-2 block">Oggetto</Label>
        <Input
          placeholder="Breve oggetto del documento"
          value={oggetto}
          onChange={(e) => setOggetto(e.target.value)}
        />
      </div>

      <div>
        <Label className="mb-2 block">Testo descrittivo</Label>
        <Textarea
          rows={10}
          placeholder={
            typeConfig?.hasLineItems
              ? "Descrivi articoli, quantità, prezzi, condizioni di pagamento, termini di fornitura..."
              : "Descrivi il contenuto della lettera: contesto, tono, punti da trattare, riferimenti..."
          }
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Allegati (opzionale)</Label>
        <p className="text-xs text-muted-foreground">
          Max {DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES / 1024 / 1024} MB. PDF, Word,
          Excel, testo o immagini.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept =
                ".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp";
              input.onchange = () => {
                const file = input.files?.[0];
                if (file) void uploadAttachment(file);
              };
              input.click();
            }}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="mr-2 h-4 w-4" />
            )}
            Aggiungi allegato
          </Button>
        </div>
        {allegati.length > 0 ? (
          <ul className="space-y-1">
            {allegati.map((a, i) => (
              <li
                key={a.storagePath}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span className="truncate">{a.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setAllegati((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || isUploading}
        >
          {isGenerating ? "Generazione in corso..." : "Genera documento"}
        </Button>
      </div>

      {isGenerating ? <LoadingState variant="form" /> : null}
    </div>
  );
}
