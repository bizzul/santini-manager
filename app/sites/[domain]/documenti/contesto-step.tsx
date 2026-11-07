"use client";

import type { UseFormReturn } from "react-hook-form";
import type {
  Allegato,
  DocumentoArricchito,
} from "@/validation/documenti/extracted-document";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { VoiceDictationButton } from "@/components/voice-input/VoiceDictationButton";
import { MobileMediaCapture } from "@/components/media/mobile-media-capture";
import { DOCUMENT_ATTACHMENT_MAX_SIZE_BYTES } from "@/lib/documenti/attachment-validation";
import { GenerateErrorsAlert } from "@/components/documenti/generate-errors-alert";
import { CondizioniStep } from "./condizioni-step";
import { OW } from "./wizard-ui";

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
    <div className="space-y-5">
      <div className={OW.banner}>
        {nPosizioni === 0
          ? "Nessuna posizione inserita: l'elaborazione costruira' l'offerta dal testo qui sotto."
          : `${nPosizioni} ${nPosizioni === 1 ? "posizione" : "posizioni"} gia' inserite. Quello che scrivi o detti qui le arricchisce, non le sostituisce.`}
      </div>

      <div className={OW.card}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className={OW.cardTitle}>Nota vocale o testo descrittivo</h2>
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
          rows={7}
          className={OW.input}
          placeholder="Quello che diresti al collega: vincoli di cantiere, accordi presi col cliente, dettagli che non stanno in una riga..."
          value={testo}
          onChange={(e) => onTestoChange(e.target.value)}
        />
      </div>

      <div className={`${OW.card} space-y-3`}>
        <h2 className={OW.cardTitle}>Allegati (opzionale)</h2>
        <p className={OW.cardHint}>
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
                className="flex items-center justify-between rounded-[9px] border border-[var(--ow-border)] bg-[var(--ow-pos-bg)] px-3 py-2 text-sm"
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

      <div className={OW.footer}>
        <Button
          type="button"
          variant="outline"
          className={OW.btnSecondary}
          onClick={onIndietro}
        >
          Indietro
        </Button>
        <div className="flex items-center gap-4">
          <span className={OW.footerStep}>Passo 3 di 4</span>
          <Button
            type="button"
            className={OW.btnPrimary}
            onClick={onElabora}
            disabled={isElaborando || isUploading}
          >
            {isElaborando ? "Elaborazione in corso..." : "Elabora offerta"}
          </Button>
        </div>
      </div>
    </div>
  );
}
