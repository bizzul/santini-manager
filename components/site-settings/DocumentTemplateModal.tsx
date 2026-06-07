"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Paperclip, Sparkles, Upload, X } from "lucide-react";
import { toast } from "@/lib/toast";
import type { DocumentTemplateConfig } from "@/lib/documenti/template-types";
import type { TemplateStructureMap } from "@/lib/documenti/template-structure-types";
import { createClient } from "@/utils/supabase/client";
import {
  validateDocumentAttachment,
  DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES,
} from "@/lib/documenti/attachment-validation";

interface DocumentTemplateModalProps {
  subdomain: string;
  siteId: string;
  trigger: React.ReactNode;
}

const emptyConfig = (): DocumentTemplateConfig => ({
  mittente: {
    ragioneSociale: "",
    via: "",
    cap: "",
    citta: "",
    iva: "",
  },
  banca: { nome: "", iban: "" },
  condizioniDefault: [],
  termineFornituraDefault: null,
  templateModelText: null,
  referenceDocument: null,
  structureMap: null,
  structureAnalyzedAt: null,
});

const PLACEHOLDER_GUIDE = `Esempio placeholder:
{{mittente.ragioneSociale}}
{{destinatario.nome}}
{{oggetto}}
{{corpo}}
{{righe}}
{{totale}}`;

export default function DocumentTemplateModal({
  subdomain,
  siteId,
  trigger,
}: DocumentTemplateModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [config, setConfig] = useState<DocumentTemplateConfig>(emptyConfig());
  const [condizioniText, setCondizioniText] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [structurePreview, setStructurePreview] =
    useState<TemplateStructureMap | null>(null);

  useEffect(() => {
    if (open) loadConfig();
  }, [open, subdomain]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${subdomain}/document-template`);
      const data = await res.json();
      if (res.ok) {
        const cfg = { ...emptyConfig(), ...data.config };
        if (!cfg.mittente.ragioneSociale.trim() && data.siteName) {
          cfg.mittente.ragioneSociale = data.siteName;
        }
        if (!cfg.mittente.ragioneSociale.trim() && data.resolvedMittente?.ragioneSociale) {
          cfg.mittente.ragioneSociale = data.resolvedMittente.ragioneSociale;
        }
        setConfig(cfg);
        setCondizioniText((cfg.condizioniDefault ?? []).join("\n"));
        setLogoUrl(cfg.logoUrl ?? data.logoUrl ?? null);
        setStructurePreview(cfg.structureMap ?? null);
      }
    } catch {
      toast.error("Errore nel caricamento del template");
    } finally {
      setLoading(false);
    }
  };

  const buildPayload = (): DocumentTemplateConfig => ({
    ...config,
    condizioniDefault: condizioniText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${subdomain}/document-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: buildPayload() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Template documenti salvato");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const uploadReferenceDocument = async (file: File) => {
    const validation = validateDocumentAttachment({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setUploadingRef(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const safeName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .substring(0, 40);
      const fileName = `reference-${safeName}-${Date.now()}.${ext}`;
      const filePath = `${siteId}/documenti/template/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath);

      setConfig((prev) => ({
        ...prev,
        referenceDocument: {
          name: file.name,
          url: publicUrl,
          storagePath: filePath,
          mimeType: file.type,
          size: file.size,
        },
        structureMap: null,
        structureAnalyzedAt: null,
      }));
      setStructurePreview(null);
      toast.success("Documento di riferimento caricato");
    } catch {
      toast.error("Errore nel caricamento del documento");
    } finally {
      setUploadingRef(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Il logo deve essere un'immagine (JPEG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo troppo grande (max 5 MB)");
      return;
    }

    setUploadingLogo(true);
    try {
      const supabase = createClient();
      const filePath = `${siteId}/logo.webp`;
      const { error: uploadError } = await supabase.storage
        .from("document-assets")
        .upload(filePath, file, {
          upsert: true,
          contentType: "image/webp",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("document-assets").getPublicUrl(filePath);

      setConfig((prev) => ({
        ...prev,
        logoPath: filePath,
        logoUrl: publicUrl,
      }));
      setLogoUrl(publicUrl);
      toast.success("Logo caricato");
    } catch {
      toast.error("Errore nel caricamento del logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await fetch(`/api/sites/${subdomain}/document-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: buildPayload() }),
      });

      const res = await fetch(
        `/api/sites/${subdomain}/document-template/analyze`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? "Analisi fallita");
      }
      setStructurePreview(data.structureMap);
      setConfig((prev) => ({
        ...prev,
        structureMap: data.structureMap,
        structureAnalyzedAt: data.analyzedAt,
      }));
      toast.success("Modello analizzato con AI");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore nell'analisi");
    } finally {
      setAnalyzing(false);
    }
  };

  const m = config.mittente ?? {};
  const b = config.banca ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carta intestata documenti</DialogTitle>
          <DialogDescription>
            Configura mittente, IVA, IBAN e modello carta intestata per PDF e
            anteprima (formato A4). La ragione sociale viene precompilata dal
            nome del sito se non impostata.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Logo aziendale</Label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-12 w-auto rounded border object-contain"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Nessun logo
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/jpeg,image/png,image/webp";
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (file) void uploadLogo(file);
                    };
                    input.click();
                  }}
                >
                  {uploadingLogo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Carica logo
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ragione sociale</Label>
              <Input
                value={m.ragioneSociale ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    mittente: { ...m, ragioneSociale: e.target.value },
                  })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-2">
                <Label>Via</Label>
                <Input
                  value={m.via ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mittente: { ...m, via: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>CAP</Label>
                <Input
                  value={m.cap ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mittente: { ...m, cap: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Città</Label>
                <Input
                  value={m.citta ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mittente: { ...m, citta: e.target.value },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>IVA / IDI</Label>
                <Input
                  value={m.iva ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mittente: { ...m, iva: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Banca</Label>
              <Input
                value={b.nome ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    banca: { ...b, nome: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input
                value={b.iban ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    banca: { ...b, iban: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Condizioni di pagamento predefinite (una per riga)</Label>
              <Textarea
                rows={3}
                value={condizioniText}
                onChange={(e) => setCondizioniText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Termine di fornitura predefinito</Label>
              <Input
                value={config.termineFornituraDefault ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    termineFornituraDefault: e.target.value || null,
                  })
                }
              />
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <Label>Modello carta intestata (testo con placeholder)</Label>
              <p className="text-xs text-muted-foreground">{PLACEHOLDER_GUIDE}</p>
              <Textarea
                rows={8}
                placeholder={PLACEHOLDER_GUIDE}
                value={config.templateModelText ?? ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    templateModelText: e.target.value || null,
                  })
                }
              />
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <Label>Documento di riferimento (PDF, Word, Excel)</Label>
              <p className="text-xs text-muted-foreground">
                Max {DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES / 1024 / 1024} MB.
                Analizzato dall&apos;AI per mappare la struttura (output PDF).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingRef}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept =
                      ".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (file) void uploadReferenceDocument(file);
                    };
                    input.click();
                  }}
                >
                  {uploadingRef ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="mr-2 h-4 w-4" />
                  )}
                  Carica documento
                </Button>
                {config.referenceDocument ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setConfig((prev) => ({
                        ...prev,
                        referenceDocument: null,
                        structureMap: null,
                        structureAnalyzedAt: null,
                      }));
                      setStructurePreview(null);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Rimuovi
                  </Button>
                ) : null}
              </div>
              {config.referenceDocument ? (
                <p className="text-sm">{config.referenceDocument.name}</p>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={
                  analyzing ||
                  (!config.referenceDocument && !config.templateModelText)
                }
                onClick={() => void handleAnalyze()}
              >
                {analyzing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Analizza modello con AI
              </Button>
              {structurePreview?.sections?.length ? (
                <div className="mt-2 rounded border bg-muted/30 p-3 text-sm">
                  <p className="mb-2 font-medium">Struttura rilevata</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {[...structurePreview.sections]
                      .sort((a, b) => a.order - b.order)
                      .map((s) => (
                        <li key={s.id}>
                          {s.order}. {s.label} ({s.fields.length} campi)
                        </li>
                      ))}
                  </ul>
                  {config.structureAnalyzedAt ? (
                    <p className="mt-2 text-xs">
                      Analizzato:{" "}
                      {new Date(config.structureAnalyzedAt).toLocaleString(
                        "it-CH",
                      )}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
