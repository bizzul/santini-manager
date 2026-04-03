const MULTI_COMMAND_CONNECTOR_REGEX =
    /\s+(?=(?:e poi|poi|dopodiche|dopo di che|quindi|successivamente)\s+(?:crea(?:re)?|aggiungi(?:ere)?|sposta(?:re)?|muovi(?:ere)?|pianifica(?:re)?|programma(?:re)?|registra(?:re)?|segna(?:re)?|inserisci(?:re)?)\b)/i;

const LEADING_CONNECTOR_REGEX =
    /^(?:e poi|poi|dopodiche|dopo di che|quindi|successivamente)\s+/i;

function sanitizeTranscriptSegment(value: string) {
    return value
        .replace(/\s+/g, " ")
        .replace(LEADING_CONNECTOR_REGEX, "")
        .replace(/^[,;:\-]+/, "")
        .replace(/[,;:\-]+$/, "")
        .trim();
}

export function splitVoiceCommandTranscript(transcript: string) {
    const normalizedTranscript = transcript.replace(/\s+/g, " ").trim();

    if (!normalizedTranscript) {
        return [];
    }

    const segments = normalizedTranscript
        .split(/[.;\n]+/)
        .flatMap((sentence) => sentence.split(MULTI_COMMAND_CONNECTOR_REGEX))
        .map(sanitizeTranscriptSegment)
        .filter(Boolean);

    return segments.length > 0 ? segments : [normalizedTranscript];
}
