export type MyDashboardQuestion = {
  id: string;
  prompt: string;
  helper: string;
  answers: string[];
};

export type MyDashboardAssetKind = "photo" | "color" | "font" | "model3d";

export type MyDashboardAsset = {
  id: string;
  kind: MyDashboardAssetKind;
  title: string;
  description: string;
  preview: string;
  value: string;
};

export type MyDashboardWizardStep =
  | {
      id: string;
      type: "question";
      title: string;
      helper: string;
      options: string[];
    }
  | {
      id: string;
      type: "asset";
      assetKind: MyDashboardAssetKind;
      title: string;
      helper: string;
      options: MyDashboardAsset[];
    };

export const myDashboardQuestions: MyDashboardQuestion[] = [
  {
    id: "role",
    prompt: "Che ruolo deve avere la tua prima dashboard?",
    helper: "Scegli il taglio mentale: comando, vendita, produzione o controllo.",
    answers: ["Centro comando", "Vendita rapida", "Produzione live", "Finanza chiara"],
  },
  {
    id: "first-signal",
    prompt: "Quale dato vuoi capire nei primi 5 secondi?",
    helper: "Questo decide il primo KPI grande e il ritmo della pagina.",
    answers: ["Margine", "Carico lavoro", "Offerte calde", "Ritardi"],
  },
  {
    id: "mood",
    prompt: "Che sensazione deve dare l’esperienza?",
    helper: "La scelta guida profondità, animazioni e densità informativa.",
    answers: ["Videogioco premium", "Cockpit tecnico", "Studio elegante", "Mappa operativa"],
  },
  {
    id: "density",
    prompt: "Quanto deve essere piena la schermata?",
    helper: "In 2 minuti conviene scegliere un livello e rifinirlo dopo.",
    answers: ["Essenziale", "Bilanciata", "Ricca", "Ultra compatta"],
  },
  {
    id: "movement",
    prompt: "Quanto movimento vuoi vedere?",
    helper: "Le animazioni restano leggere e rispettano la modalità ridotta.",
    answers: ["Minimo", "Hover morbido", "Transizioni vive", "Effetto arcade"],
  },
  {
    id: "decision",
    prompt: "Quale azione deve suggerire la dashboard?",
    helper: "Serve per trasformare i dati in decisioni operative.",
    answers: ["Chi chiamare", "Cosa produrre", "Dove intervenire", "Cosa fatturare"],
  },
  {
    id: "map",
    prompt: "La dashboard deve partire da una mappa o da una lista?",
    helper: "La risposta decide la gerarchia tra territorio e tabella.",
    answers: ["Mappa", "Lista visuale", "Timeline", "Card 3D"],
  },
  {
    id: "tone",
    prompt: "Qual è il tono corretto per il manager?",
    helper: "Il tono influenza copy, colori di stato e micro-feedback.",
    answers: ["Calmo", "Urgente", "Lussuoso", "Industriale"],
  },
];

export const myDashboardAssets: MyDashboardAsset[] = [
  {
    id: "photo-atelier",
    kind: "photo",
    title: "Atelier scuro",
    description: "Sfondo fotografico profondo con materiali e luci radenti.",
    preview: "from-slate-950 via-zinc-900 to-stone-800",
    value: "atelier-dark",
  },
  {
    id: "photo-map",
    kind: "photo",
    title: "Mappa viva",
    description: "Look geografico per cantieri, clienti e interventi.",
    preview: "from-emerald-950 via-sky-950 to-slate-900",
    value: "living-map",
  },
  {
    id: "photo-glass",
    kind: "photo",
    title: "Vetro tecnico",
    description: "Dashboard nitida con riflessi e livelli trasparenti.",
    preview: "from-blue-950 via-slate-950 to-cyan-900",
    value: "technical-glass",
  },
  {
    id: "color-electric-blue",
    kind: "color",
    title: "Blu elettrico",
    description: "Energia digitale, perfetta per overview e forecast.",
    preview: "#2563eb",
    value: "electric-blue",
  },
  {
    id: "color-amber-forge",
    kind: "color",
    title: "Ambra officina",
    description: "Caldo, industriale, forte su alert e carico AVOR.",
    preview: "#f59e0b",
    value: "amber-forge",
  },
  {
    id: "color-emerald-grid",
    kind: "color",
    title: "Verde griglia",
    description: "Operativo, leggibile, ideale per stati positivi.",
    preview: "#10b981",
    value: "emerald-grid",
  },
  {
    id: "font-geometric",
    kind: "font",
    title: "Geometrico",
    description: "Pulito e futuristico, per una dashboard da cockpit.",
    preview: "Aa",
    value: "geometric",
  },
  {
    id: "font-editorial",
    kind: "font",
    title: "Editoriale",
    description: "Più premium, adatto a report direzionali e margini.",
    preview: "Aa",
    value: "editorial",
  },
  {
    id: "font-mono",
    kind: "font",
    title: "Mono tecnico",
    description: "Molto leggibile per numeri, codici e tempi.",
    preview: "01",
    value: "technical-mono",
  },
  {
    id: "model-orb",
    kind: "model3d",
    title: "Sfera dati",
    description: "Oggetto centrale morbido con orbite KPI.",
    preview: "orb",
    value: "data-orb",
  },
  {
    id: "model-cube",
    kind: "model3d",
    title: "Cubo comando",
    description: "Elemento solido, adatto a stati e reparti.",
    preview: "cube",
    value: "command-cube",
  },
  {
    id: "model-tower",
    kind: "model3d",
    title: "Torre moduli",
    description: "Stack 3D per mostrare livelli e priorità.",
    preview: "tower",
    value: "module-tower",
  },
];

const assetSequence: MyDashboardAssetKind[] = [
  "photo",
  "color",
  "font",
  "model3d",
];

export function getMyDashboardWizardStep(index: number): MyDashboardWizardStep {
  if (index % 2 === 0) {
    const question = myDashboardQuestions[
      Math.floor(index / 2) % myDashboardQuestions.length
    ];
    return {
      id: `question-${index}-${question.id}`,
      type: "question",
      title: question.prompt,
      helper: question.helper,
      options: question.answers,
    };
  }

  const assetKind = assetSequence[
    Math.floor(index / 2) % assetSequence.length
  ];
  const labels: Record<MyDashboardAssetKind, string> = {
    photo: "Scegli una foto o atmosfera",
    color: "Scegli il colore dominante",
    font: "Scegli il carattere visivo",
    model3d: "Scegli l’oggetto 3D",
  };

  return {
    id: `asset-${index}-${assetKind}`,
    type: "asset",
    assetKind,
    title: labels[assetKind],
    helper: "Questi asset sono pensati come un database espandibile per varianti infinite.",
    options: myDashboardAssets.filter((asset) => asset.kind === assetKind),
  };
}
