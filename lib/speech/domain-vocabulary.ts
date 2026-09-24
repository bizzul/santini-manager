/**
 * Vocabolario di dominio per orientare la trascrizione Whisper (parametro
 * "prompt" dell'API: non viene trascritto, aiuta solo l'ortografia di
 * marchi, misure e termini tecnici che altrimenti vengono spesso storpiati).
 *
 * Tenere conciso (Whisper considera solo l'ultima porzione del prompt se
 * troppo lungo, indicativamente ~224 token).
 */
export const CARPENTRY_VOICE_VOCABULARY_HINT =
    "Gestionale per falegnameria e serramenti in Svizzera italiana. " +
    "Termini tecnici: serramenti, gelosie, cassonetto, telaio, controtelaio, anta, " +
    "armadio a muro, armadio cassone, porta interna, porta blindata EI30, posa, " +
    "rilievo, smontaggio, regia, taglio termico, vetro camera, guarnizione, cerniera, " +
    "maniglione, battiscopa, rovere, laminato CPL. " +
    "Marchi e materiali: PVC, alluminio, Aluplast, Siegenia, Secustik, Grauthoff, Ehret Easyflex. " +
    "Importi in franchi svizzeri (CHF), misure in centimetri o millimetri.";

/**
 * Whisper puo' "allucinare" frasi ricorrenti dei suoi dati di addestramento
 * quando incontra silenzio, rumore di fondo o un audio molto breve/pulito a
 * fine registrazione: in italiano le piu' comuni sono crediti di sottotitoli
 * amatoriali che non hanno nulla a che fare col contenuto detto. Le
 * rimuoviamo dal testo trascritto invece di lasciarle passare come se
 * facessero parte del comando.
 */
const WHISPER_HALLUCINATION_PATTERNS: RegExp[] = [
    /sottotitoli\s+(e\s+revisione\s+)?(a\s+cura\s+di|creati?\s+da(lla)?)\s+.*?(amara\.org|qtss|comunit[aà]\s+amara)\b\.?/gi,
    /sottotitoli\s+creati?\s+dalla\s+comunit[aà]\s+amara\.org\.?/gi,
    /www\.amara\.org\.?/gi,
    /grazie\s+per\s+aver\s+guardato\s+(questo\s+)?video\.?/gi,
    /iscriviti\s+al\s+canale\.?/gi,
];

/** Rimuove le allucinazioni note di Whisper e ripulisce gli spazi risultanti. */
export function stripWhisperHallucinations(text: string): string {
    let cleaned = text;
    for (const pattern of WHISPER_HALLUCINATION_PATTERNS) {
        cleaned = cleaned.replace(pattern, " ");
    }
    return cleaned.replace(/\s{2,}/g, " ").trim();
}
