export type TimetrackingInstructionsMode = "personal" | "admin";

export type TimetrackingInstructionsView =
  | "create"
  | "my-hours"
  | "personal-week"
  | "leave-request"
  | "week"
  | "month"
  | "table";

export type TimetrackingInstructionStatus = "done" | "active" | "todo";

export interface TimetrackingInstructionRowSnapshot {
  activityType: "project" | "internal";
  label?: string;
  hasProject: boolean;
  hasRole: boolean;
  hasInternalActivity: boolean;
  hasTime: boolean;
  hasComment: boolean;
  lunchOffsite: boolean;
  hasLunchLocation: boolean;
}

export interface TimetrackingInstructionsInput {
  view: TimetrackingInstructionsView;
  mode?: TimetrackingInstructionsMode;
  entryCount?: number;
  userCount?: number;
  completedEntries?: number;
  savedEntriesCount?: number;
  totalMinutes?: number;
  targetMinutes?: number;
  currentRow?: TimetrackingInstructionRowSnapshot | null;
  voiceAvailable?: boolean;
}

export interface GeneratedTimetrackingInstructionItem {
  id: string;
  title: string;
  description: string;
  status: TimetrackingInstructionStatus;
}

export interface GeneratedTimetrackingInstructions {
  eyebrow: string;
  title: string;
  description: string;
  viewLabel: string;
  tip: string;
  items: GeneratedTimetrackingInstructionItem[];
}

function formatMinutes(value: number) {
  const safeValue = Math.max(0, value);
  const hours = Math.floor(safeValue / 60);
  const minutes = safeValue % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function buildCreateInstructions(
  input: TimetrackingInstructionsInput
): GeneratedTimetrackingInstructions {
  const currentRow = input.currentRow;
  const completedEntries = input.completedEntries ?? 0;
  const savedEntriesCount = input.savedEntriesCount ?? 0;
  const totalMinutes = input.totalMinutes ?? 0;
  const targetMinutes = input.targetMinutes ?? 0;
  const remainingMinutes = Math.max(0, targetMinutes - totalMinutes);
  const isTargetCovered = targetMinutes > 0 && totalMinutes >= targetMinutes;

  if (!currentRow) {
    return {
      eyebrow: "Istruzioni generate automaticamente",
      title: "Come compilare il modulo ore",
      description:
        "Inizia aggiungendo una registrazione: il sistema aggiornera automaticamente i passaggi consigliati.",
      viewLabel: "Registra ore",
      tip: "Quando completi una registrazione, il pulsante Salva si attiva in basso.",
      items: [
        {
          id: "start-entry",
          title: "Aggiungi una registrazione",
          description:
            "Apri la scheda, scegli il tipo di attivita e indica il tempo impiegato.",
          status: "active",
        },
      ],
    };
  }

  const items: GeneratedTimetrackingInstructionItem[] = [];
  const rowLabel = currentRow.label?.trim();

  if (currentRow.activityType === "project") {
    items.push({
      id: "project",
      title: "Scegli il progetto",
      description: currentRow.hasProject
        ? rowLabel
          ? `La registrazione corrente e collegata a ${rowLabel}.`
          : "Il progetto della registrazione corrente e gia selezionato."
        : "Seleziona la commessa su cui stai consuntivando il tempo.",
      status: currentRow.hasProject ? "done" : "active",
    });

    items.push({
      id: "role",
      title: "Assegna il reparto",
      description: currentRow.hasRole
        ? "Il reparto e gia valorizzato per questa attivita su progetto."
        : "Per le attivita su progetto il reparto e obbligatorio prima del salvataggio.",
      status: currentRow.hasRole
        ? "done"
        : currentRow.hasProject
          ? "active"
          : "todo",
    });
  } else {
    items.push({
      id: "internal-activity",
      title: "Scegli l'attivita interna",
      description: currentRow.hasInternalActivity
        ? rowLabel
          ? `L'attivita selezionata e ${rowLabel}.`
          : "L'attivita interna della registrazione corrente e gia selezionata."
        : "Usa questa opzione quando il tempo non e legato a una commessa.",
      status: currentRow.hasInternalActivity ? "done" : "active",
    });
  }

  const hasActivitySelection =
    currentRow.activityType === "project"
      ? currentRow.hasProject && currentRow.hasRole
      : currentRow.hasInternalActivity;

  items.push({
    id: "time",
    title: "Inserisci la durata",
    description: currentRow.hasTime
      ? "Le ore della registrazione corrente sono gia compilate."
      : "Usa i pulsanti rapidi oppure compila ore e minuti manualmente.",
    status: currentRow.hasTime
      ? "done"
      : hasActivitySelection
        ? "active"
        : "todo",
  });

  if (currentRow.lunchOffsite) {
    items.push({
      id: "lunch",
      title: "Indica il luogo del pranzo",
      description: currentRow.hasLunchLocation
        ? "Il luogo del pranzo fuori sede e gia stato inserito."
        : "Quando il pranzo e fuori sede, il luogo va specificato nella registrazione.",
      status: currentRow.hasLunchLocation
        ? "done"
        : currentRow.hasTime
          ? "active"
          : "todo",
    });
  } else {
    items.push({
      id: "comment",
      title: "Aggiungi un commento utile",
      description: currentRow.hasComment
        ? "La registrazione include gia un commento descrittivo."
        : "Il commento e facoltativo, ma aiuta a capire meglio il lavoro svolto.",
      status: currentRow.hasComment ? "done" : "todo",
    });
  }

  if (input.voiceAvailable) {
    items.push({
      id: "voice",
      title: "In alternativa usa la voce",
      description:
        "Puoi dettare una registrazione e far compilare automaticamente progetto, attivita e durata.",
      status: "todo",
    });
  }

  items.push({
    id: "save",
    title: "Salva le registrazioni pronte",
    description:
      completedEntries > 0
        ? `Hai ${completedEntries} ${pluralize(completedEntries, "registrazione pronta", "registrazioni pronte")} da inviare.`
        : "Il pulsante Salva si attiva appena completi almeno una registrazione.",
    status: completedEntries > 0 ? "active" : "todo",
  });

  let description =
    "Il sistema sta leggendo la registrazione corrente e ti suggerisce il prossimo passaggio utile.";

  if (completedEntries > 0) {
    const savedLabel =
      savedEntriesCount > 0
        ? ` e ${savedEntriesCount} ${pluralize(savedEntriesCount, "gia salvata oggi", "gia salvate oggi")}`
        : "";
    const targetLabel =
      targetMinutes > 0
        ? isTargetCovered
          ? " Il target giornaliero e gia coperto."
          : ` Mancano ancora ${formatMinutes(remainingMinutes)} al target giornaliero.`
        : "";
    description = `Hai ${completedEntries} ${pluralize(completedEntries, "registrazione pronta", "registrazioni pronte")}${savedLabel}.${targetLabel}`;
  } else if (currentRow.activityType === "project" && !currentRow.hasProject) {
    description =
      "La registrazione corrente e su progetto: scegli prima la commessa, poi completa reparto e durata.";
  } else if (currentRow.activityType === "project" && !currentRow.hasRole) {
    description =
      "La commessa e gia selezionata: il prossimo passaggio e indicare il reparto che ha svolto l'attivita.";
  } else if (currentRow.activityType === "internal" && !currentRow.hasInternalActivity) {
    description =
      "La registrazione corrente e su attivita interna: seleziona l'attivita e poi indica il tempo impiegato.";
  } else if (!currentRow.hasTime) {
    description =
      "La registrazione e quasi pronta: manca soltanto la durata dell'attivita.";
  }

  const tip = isTargetCovered
    ? "Puoi salvare subito o aggiungere altre righe per dettagliare meglio come hai distribuito la giornata."
    : "Se devi spezzare la giornata su piu attivita, usa Aggiungi registrazione prima di salvare.";

  return {
    eyebrow: "Istruzioni generate automaticamente",
    title: "Come completare il modulo ore",
    description,
    viewLabel: "Registra ore",
    tip,
    items,
  };
}

function buildHistoryInstructions(
  input: TimetrackingInstructionsInput
): GeneratedTimetrackingInstructions {
  const entryCount = input.entryCount ?? 0;

  return {
    eyebrow: "Istruzioni generate automaticamente",
    title: "Come usare lo storico ore",
    description:
      entryCount > 0
        ? `Hai ${entryCount} ${pluralize(entryCount, "registrazione nello storico", "registrazioni nello storico")}. Usa i filtri per restringere velocemente il risultato.`
        : "Lo storico e ancora vuoto. Le registrazioni salvate compariranno qui in automatico.",
    viewLabel: "Le mie ore",
    tip: "Quando cerchi anomalie, filtra prima per data e poi per progetto o attivita interna.",
    items: [
      {
        id: "summary",
        title: "Controlla il totale filtrato",
        description:
          "La card iniziale aggiorna automaticamente numero di registrazioni e totale ore in base ai filtri correnti.",
        status: entryCount > 0 ? "done" : "todo",
      },
      {
        id: "filters",
        title: "Apri i filtri",
        description:
          "Puoi limitare per intervallo date, tipo attivita e singolo progetto o attivita interna.",
        status: "active",
      },
      {
        id: "cleanup",
        title: "Seleziona e rimuovi se necessario",
        description:
          "Se trovi un consuntivo errato, seleziona una o piu righe e usa Elimina.",
        status: entryCount > 0 ? "todo" : "todo",
      },
    ],
  };
}

function buildPersonalWeekInstructions(
  input: TimetrackingInstructionsInput
): GeneratedTimetrackingInstructions {
  const entryCount = input.entryCount ?? 0;

  return {
    eyebrow: "Istruzioni generate automaticamente",
    title: "Come leggere il planner settimanale",
    description:
      entryCount > 0
        ? "La vista settimanale aggrega automaticamente le registrazioni salvate e ti mostra progressi e carichi giorno per giorno."
        : "Quando inizierai a registrare ore, la vista settimanale si popolera automaticamente.",
    viewLabel: "Settimana",
    tip: "Usa questa vista per capire subito se hai coperto il target giornaliero o se ci sono buchi da completare.",
    items: [
      {
        id: "navigate-week",
        title: "Spostati tra le settimane",
        description:
          "Cambia settimana per confrontare il carico attuale con i periodi precedenti.",
        status: "active",
      },
      {
        id: "read-summary",
        title: "Controlla i riepiloghi giornalieri",
        description:
          "Il pannello laterale mostra totale consuntivato, scostamenti e dettaglio delle attivita registrate.",
        status: entryCount > 0 ? "done" : "todo",
      },
      {
        id: "verify-target",
        title: "Verifica il target personale",
        description:
          "Il planner confronta automaticamente ore registrate e obiettivo giornaliero.",
        status: entryCount > 0 ? "done" : "todo",
      },
    ],
  };
}

function buildLeaveInstructions(): GeneratedTimetrackingInstructions {
  return {
    eyebrow: "Istruzioni generate automaticamente",
    title: "Come richiedere un'assenza",
    description:
      "Questa sezione ti guida nella compilazione delle richieste collegate al modulo ore.",
    viewLabel: "Assenze",
    tip: "Compila la richiesta appena conosci le date, cosi il planner ore resta coerente con la disponibilita reale.",
    items: [
      {
        id: "choose-period",
        title: "Seleziona il periodo",
        description:
          "Indica con precisione le date dell'assenza per evitare sovrapposizioni nel planning.",
        status: "active",
      },
      {
        id: "complete-request",
        title: "Completa motivazione e dettagli",
        description:
          "Aggiungi le informazioni richieste dal form per rendere la richiesta subito verificabile.",
        status: "todo",
      },
      {
        id: "submit-request",
        title: "Invia la richiesta",
        description:
          "Dopo l'invio, la richiesta entra nel flusso di controllo previsto dal modulo presenze.",
        status: "todo",
      },
    ],
  };
}

function buildOverviewInstructions(
  input: TimetrackingInstructionsInput
): GeneratedTimetrackingInstructions {
  const mode = input.mode ?? "admin";
  const entryCount = input.entryCount ?? 0;
  const userCount = input.userCount ?? 0;
  const isAdmin = mode === "admin";

  const titleByView: Record<"week" | "month" | "table", string> = {
    week: isAdmin ? "Vista settimanale del team" : "Vista settimanale personale",
    month: isAdmin ? "Vista mensile del team" : "Vista mensile personale",
    table: isAdmin ? "Tabella operativa ore" : "Tabella riepilogativa ore",
  };

  const viewLabelByView: Record<"week" | "month" | "table", string> = {
    week: "Calendario ore",
    month: "Mese",
    table: "Tabella",
  };

  const descriptionByView: Record<"week" | "month" | "table", string> = {
    week: isAdmin
      ? `La vista settimanale raccoglie ${entryCount} registrazioni distribuite su ${userCount} ${pluralize(userCount, "collaboratore", "collaboratori")}.`
      : "La vista settimanale mostra le tue registrazioni aggregate per giorno e fascia oraria.",
    month: isAdmin
      ? "La vista mensile ti aiuta a leggere trend, giorni pieni e vuoti del team in un colpo solo."
      : "La vista mensile ti aiuta a leggere continuita e buchi di registrazione sul lungo periodo.",
    table: isAdmin
      ? "La tabella e la vista piu operativa per filtrare, correggere e inserire rapidamente nuove registrazioni."
      : "La tabella e utile quando vuoi cercare o verificare una registrazione specifica.",
  };

  const itemsByView: Record<
    "week" | "month" | "table",
    GeneratedTimetrackingInstructionItem[]
  > = {
    week: [
      {
        id: "navigate",
        title: "Naviga la settimana",
        description:
          "Spostati tra i periodi per verificare carichi, sovrapposizioni e giornate incomplete.",
        status: "active",
      },
      {
        id: "inspect",
        title: isAdmin ? "Apri il dettaglio di una registrazione" : "Leggi il dettaglio delle registrazioni",
        description: isAdmin
          ? "Selezionando un elemento puoi controllare dati, durata e reparto direttamente dalla vista calendario."
          : "Ogni blocco nel calendario mostra durata e contesto dell'attivita registrata.",
        status: entryCount > 0 ? "done" : "todo",
      },
      {
        id: "summary",
        title: "Usa il riepilogo laterale",
        description:
          "Il pannello di riepilogo riassume automaticamente ore, scostamenti e distribuzione per giorno.",
        status: entryCount > 0 ? "done" : "todo",
      },
    ],
    month: [
      {
        id: "scan-month",
        title: "Scansiona il mese",
        description:
          "La griglia mensile aiuta a vedere subito continuita, picchi e giorni senza registrazioni.",
        status: "active",
      },
      {
        id: "compare-days",
        title: "Confronta i giorni",
        description:
          "Ogni cella evidenzia il carico giornaliero e permette un controllo rapido delle anomalie.",
        status: entryCount > 0 ? "done" : "todo",
      },
      {
        id: "open-details",
        title: isAdmin ? "Apri rapidamente le modifiche" : "Apri i dettagli delle ore",
        description: isAdmin
          ? "La vista mensile e pensata per arrivare velocemente alla registrazione da correggere."
          : "Usa il mese come mappa rapida prima di passare al dettaglio settimanale o alla tabella.",
        status: "todo",
      },
    ],
    table: [
      {
        id: "search",
        title: "Filtra e cerca",
        description:
          "Usa ricerca globale e filtri per restringere il set di registrazioni da controllare.",
        status: "active",
      },
      {
        id: "edit",
        title: isAdmin ? "Correggi o inserisci rapidamente" : "Verifica i dettagli della riga",
        description: isAdmin
          ? "Gli amministratori possono creare nuove righe dalla tabella e aggiornare i valori in modo rapido."
          : "Questa vista ti permette di controllare i dati in formato tabellare con maggiore precisione.",
        status: entryCount > 0 ? "done" : "todo",
      },
      {
        id: "bulk-actions",
        title: isAdmin ? "Usa le azioni massive" : "Usa la vista per audit rapido",
        description: isAdmin
          ? "Seleziona piu righe per eliminarle o concentrarti su un sottoinsieme specifico."
          : "La tabella e la vista piu comoda quando devi rileggere diverse registrazioni consecutive.",
        status: "todo",
      },
    ],
  };

  const view = input.view as "week" | "month" | "table";

  return {
    eyebrow: "Istruzioni generate automaticamente",
    title: titleByView[view],
    description: descriptionByView[view],
    viewLabel: viewLabelByView[view],
    tip: isAdmin
      ? "Per un inserimento veloce usa la tabella; per controlli e anomalie parti invece dal calendario."
      : "Se devi inserire nuove ore, apri Consuntivi; se devi controllarle, usa calendario o tabella.",
    items: itemsByView[view],
  };
}

export function generateTimetrackingInstructions(
  input: TimetrackingInstructionsInput
): GeneratedTimetrackingInstructions {
  switch (input.view) {
    case "create":
      return buildCreateInstructions(input);
    case "my-hours":
      return buildHistoryInstructions(input);
    case "personal-week":
      return buildPersonalWeekInstructions(input);
    case "leave-request":
      return buildLeaveInstructions();
    case "week":
    case "month":
    case "table":
      return buildOverviewInstructions(input);
    default:
      return {
        eyebrow: "Istruzioni generate automaticamente",
        title: "Modulo ore",
        description:
          "Le istruzioni verranno adattate automaticamente in base alla vista corrente.",
        viewLabel: "Ore",
        tip: "Apri una vista del modulo per ricevere indicazioni contestuali.",
        items: [],
      };
  }
}
