import type { DestinatarioInput, TipoDocumento } from "@/validation/documenti/extracted-document";

export const VOICE_DOCUMENT_PREFILL_KEY = "voice-document-prefill";

export interface VoiceDocumentPrefill {
    tipoDocumento?: TipoDocumento;
    destinatario?: Partial<DestinatarioInput>;
    oggetto?: string;
    testo?: string;
    summary?: string;
}

export function saveVoiceDocumentPrefill(data: VoiceDocumentPrefill): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(VOICE_DOCUMENT_PREFILL_KEY, JSON.stringify(data));
}

export function consumeVoiceDocumentPrefill(): VoiceDocumentPrefill | null {
    if (typeof window === "undefined") return null;

    const raw = sessionStorage.getItem(VOICE_DOCUMENT_PREFILL_KEY);
    if (!raw) return null;

    sessionStorage.removeItem(VOICE_DOCUMENT_PREFILL_KEY);

    try {
        return JSON.parse(raw) as VoiceDocumentPrefill;
    } catch {
        return null;
    }
}
