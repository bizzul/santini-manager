"use client";

import type { UseFormReturn } from "react-hook-form";
import type {
  Allegato,
  DocumentoArricchito,
} from "@/validation/documenti/extracted-document";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { VoiceDictationButton } from "@/components/voice-input/VoiceDictationButton";
import { MobileMediaCapture } from "@/components/media/mobile-media-capture";
import { DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES } from "@/lib/documenti/attachment-validation";
import { GenerateErrorsAlert } from "@/components/documenti/generate-errors-alert";
import { CondizioniStep } from "./condizioni-step";

/**
 * Passo 3: contesto e condizioni.
 *
 * Nota vocale e allegati arrivano QUI, non nella prima schermata. E' la
 * differenza che conta: a questo punto la struttura dell'offerta esiste gia',
 * quindi l'AI arricchisce posizioni reali invece di doverle indovinare da un
 * testo libero.
 */

interface ContestoStepProps {
  domain: string;
  siteId: string;
  form: UseFormReturn<DocumentoArricchito>;
  testo: string;
  onTestoChange: (valore: string | ((prev: string) => string)) => void;
  allegati: Allegato[];
  setAllegati: React.Dispatch<React.SetStateAction<Allegato[]>>;
  isUploading: boolean;
  uploadAttachment: (file: File) => Promise<void>;
  elaborazioneErrori: string[];
  isElaborando: boolean;
  onIndietro: () => void;
  onElabora: () => void;
}

export function ContestoStep({
  domain,
  siteId,
  form,
  testo,
  onTestoChange,
  allegati,
  setAllegati,
  isUploading,
  uploadAttachment,
  elaborazioneErrori,
  isElaborando,
  onIndietro,
  onElabora,
}: ContestoStepProps) {
  const nPosizioni = (form.watch("righe") ?? []).length;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/70 bg-muted/10 p-3 text-sm text-muted-foreground">
        {nPosizioni === 0
          ? "Nessuna posizione inserita: l'elaborazione costruira' l'offerta dal testo qui sotto."
          : `${nPosizioni} ${nPosizioni === 1 ? "posizione" : "posizioni"} gia' inserite. Quello che scrivi o detti qui le arricchisce, non le sostituisce.`}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Label>Nota vocale o testo descrittivo</Label>
          <VoiceDictationButton
            siteId={siteId}
            domain={domain}
            title="Nota vocale sull'offerta"
            description="Vincoli di cantiere, accordi col cliente, dettagli che non stanno in una riga. Potrai rivedere il testo prima di inserirlo."
            buttonTitle="Dettatura vocale"
            onTranscript={(text) =>
              onTestoChange((prev) => (prev ? `${prev} ${text}` : text))
            }
          />
        </div>
        <Textarea
          rows={8}
          placeholder="Quello che diresti al collega: vincoli di cantiere, accordi presi col cliente, dettagli che non stanno in una riga..."
          value={testo}
          onChange={(e) => onTestoChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Allegati (opzionale)</Label>
        <p className="text-xs text-muted-foreground">
          Foto, disegni, piani di cantiere, capitolati. Max{" "}
          {DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES / 1024 / 1024} MB per file.
        </p>
        <MobileMediaCapture
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,image/*"
          multiple
          busy={isUploading}
          confirmLabel="Aggiungi allegato"
          onConfirm={async (files) => {
            for (const file of files) {
              await uploadAttachment(file);
            }
          }}
        />
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
                  className="h-11 w-11 md:h-7 md:w-7"
                  onClick={() =>
                    setAllegati((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  aria-label={`Rimuovi ${a.name}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <CondizioniStep form={form} />

      <GenerateErrorsAlert errors={elaborazioneErrori} />

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onIndietro}>
          Indietro
        </Button>
        <Button
          type="button"
          onClick={onElabora}
          disabled={isElaborando || isUploading}
        >
          {isElaborando ? "Elaborazione in corso..." : "Elabora offerta"}
        </Button>
      </div>
    </div>
  );
}
