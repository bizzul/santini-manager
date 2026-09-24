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
