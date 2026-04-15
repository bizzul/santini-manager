"use client";

import Image from "next/image";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const GUIDE_PENDING_LOGIN_KEY = "santini-manager-guide-pending-login";
const GUIDE_STORAGE_PREFIX = "santini-manager-guide";
const REQUIRED_LOGIN_AUTO_OPENS = 5;
const DEFAULT_GUIDE_BUTTON_LABEL = "Apri guida";

type GuidePreferences = {
  showOnLogin: boolean;
  forcedLoginOpens: number;
};

type GuideStep = {
  id: string;
  shortTitle: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  imageAspect?: string;
  secondaryImage?: string;
  secondaryImageAlt?: string;
  secondaryImageAspect?: string;
  highlights: string[];
  tip: string;
};

type ManagerGuideMascotProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

type ManagerGuideContextValue = {
  openGuide: (stepId?: GuideStep["id"]) => void;
  showOnLogin: boolean;
  setShowOnLogin: (value: boolean) => void;
  remainingRequiredLogins: number;
};

const defaultPreferences: GuidePreferences = {
  showOnLogin: true,
  forcedLoginOpens: 0,
};

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "overview",
    shortTitle: "Overview",
    title: "Panoramica generale del manager",
    description:
      "La dashboard iniziale ti mostra in pochi secondi KPI, pipeline, reparti e notifiche da tenere sotto controllo.",
    image: "/manager-guide/step-01.png",
    imageAlt: "Dashboard overview del manager Santini",
    highlights: [
      "Usa la barra superiore per passare rapidamente tra le diverse aree operative.",
      "Controlla gli indicatori in alto per capire subito volume, attività e alert.",
      "Le notifiche in basso ti aiutano a individuare pratiche o offerte da seguire.",
    ],
    tip: "Parti sempre da qui quando vuoi capire le priorità della giornata.",
  },
  {
    id: "sales-dashboard",
    shortTitle: "Vendita",
    title: "Dashboard Vendita",
    description:
      "Questa vista riassume lo stato del commerciale: offerte in lavorazione, trattative, vinte, perse e trend nel tempo.",
    image: "/manager-guide/step-12.png",
    imageAlt: "Dashboard vendite con stato offerte e grafici",
    highlights: [
      "Le card in alto mostrano subito quante offerte sono in ogni fase.",
      "Il grafico categorie aiuta a capire dove si concentra il lavoro commerciale.",
      "L'area alert segnala le offerte da ricontattare o in scadenza.",
    ],
    tip: "Se devi fare follow-up, controlla prima gli alert della dashboard vendite.",
  },
  {
    id: "offers-board",
    shortTitle: "Kanban Offerte",
    title: "Kanban Offerte",
    description:
      "Nel kanban Offerte gestisci il ciclo commerciale completo: To do, Elaborazione, Inviata, Trattativa, Vinta e Persa.",
    image: "/manager-guide/step-02.png",
    imageAlt: "Kanban offerte con colonne e card progetto",
    highlights: [
      "Ogni colonna rappresenta una fase del processo commerciale.",
      "Le card mostrano cliente, pezzi, valore, scadenze e avanzamento.",
      "Dal pulsante nella colonna o dalla card puoi creare e aggiornare una pratica.",
    ],
    tip: "Muovi le card tra le colonne per mantenere il flusso offerte sempre aggiornato.",
  },
  {
    id: "quick-offer-request",
    shortTitle: "Nuova richiesta",
    title: "Creazione rapida di una richiesta offerta",
    description:
      "La richiesta rapida ti permette di aprire una nuova opportunità in To do e completare i dettagli operativi in un secondo momento.",
    image: "/manager-guide/step-03.png",
    imageAlt: "Modal nuova richiesta offerta rapida",
    imageAspect: "aspect-[4/5]",
    highlights: [
      "Inserisci cliente e categoria prodotto per registrare subito la richiesta.",
      "Aggiungi una data prevista e note veloci per non perdere il contesto.",
      "La bozza resta nel kanban e può essere completata quando hai tutti i dati.",
    ],
    tip: "Usa la creazione rapida quando ricevi richieste al telefono o durante una visita.",
  },
  {
    id: "offer-details",
    shortTitle: "Scheda offerta",
    title: "Scheda completa della pratica",
    description:
      "Dentro la card trovi i dettagli operativi della commessa: cliente, oggetto, luogo, prodotti, date, commenti, ordini fornitori e documenti progetto.",
    image: "/manager-guide/step-13.png",
    imageAlt: "Scheda completa di modifica pratica offerta",
    imageAspect: "aspect-[4/5]",
    highlights: [
      "Compila i dati base della pratica per mantenere offerte e produzione allineate.",
      "Gestisci fino a 5 prodotti con quantità e informazioni operative dedicate.",
      "Carica documenti e registra dati fornitori direttamente nella stessa scheda.",
    ],
    tip: "Aggiorna questa scheda ogni volta che la pratica cambia, così la cronologia resta affidabile.",
  },
  {
    id: "follow-up",
    shortTitle: "Follow-up",
    title: "Follow-up e trattative",
    description:
      "Quando una pratica entra in trattativa puoi registrare data contatto, tipo di interazione e note senza perdere la cronologia commerciale.",
    image: "/manager-guide/step-06.png",
    imageAlt: "Dialog follow-up offerta con data contatto e note",
    imageAspect: "aspect-[4/3]",
    highlights: [
      "Registra chiamate, email o altri contatti effettuati con il cliente.",
      "Salva note sintetiche per sapere subito a che punto è la trattativa.",
      "Se serve, sposta la pratica nella fase successiva direttamente dal follow-up.",
    ],
    tip: "Inserisci il follow-up subito dopo il contatto, così chiunque vede lo stato reale della trattativa.",
  },
  {
    id: "avor-board",
    shortTitle: "AVOR",
    title: "Kanban AVOR e filtro categorie",
    description:
      "Nel kanban AVOR segui il passaggio delle pratiche da To do a Rilievo, Elaborazione e Produzione, con la possibilità di filtrare per categoria.",
    image: "/manager-guide/step-10.png",
    imageAlt: "Kanban AVOR con pratiche suddivise per colonne",
    secondaryImage: "/manager-guide/step-09.png",
    secondaryImageAlt: "Filtro categorie del kanban AVOR",
    secondaryImageAspect: "aspect-[5/1]",
    highlights: [
      "Le colonne mostrano in modo chiaro dove si trova ogni pratica tecnica.",
      "Il filtro categorie aiuta a concentrarsi su Serramenti, Porte, Accessori e altri gruppi.",
      "Le card riportano quantità, valore e informazioni utili per la pianificazione.",
    ],
    tip: "Attiva i filtri categoria quando vuoi pianificare il lavoro per reparto o tipologia.",
  },
  {
    id: "installation-board",
    shortTitle: "Posa",
    title: "Kanban di Posa",
    description:
      "La vista di posa serve a organizzare e monitorare l'avanzamento dei lavori sul campo tra To do, Piani, Esecuzione e Collaudo.",
    image: "/manager-guide/step-11.png",
    imageAlt: "Kanban posa con colonne operative",
    highlights: [
      "Le card mostrano cliente, luogo, quantità, valore e note operative.",
      "Le fasi aiutano a distinguere ciò che va ancora pianificato da ciò che è in esecuzione.",
      "Il collaudo finale rende visibile quali lavori sono ormai chiusi.",
    ],
    tip: "Usa questa schermata per coordinare squadra, posa e chiusura lavori.",
  },
  {
    id: "production-dashboard",
    shortTitle: "Produzione",
    title: "Dashboard Produzione",
    description:
      "La dashboard produzione raccoglie il carico per categoria prodotto e aiuta a capire dove si sta concentrando il lavoro di fabbrica.",
    image: "/manager-guide/step-16.png",
    imageAlt: "Dashboard produzione con carico per tipologia prodotto",
    highlights: [
      "Vedi subito quante commesse sono in lavorazione per categoria.",
      "Confronta i carichi tra serramenti, accessori, porte e altre famiglie.",
      "Usa la vista per capire se ci sono reparti da alleggerire o priorità da ribilanciare.",
    ],
    tip: "Controlla la produzione insieme al kanban AVOR per avere una visione completa del flusso tecnico.",
  },
];

const ManagerGuideContext = createContext<ManagerGuideContextValue | null>(null);

function getStorageKey(userId: string) {
  return `${GUIDE_STORAGE_PREFIX}:${userId}`;
}

function loadPreferences(userId: string): GuidePreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const storedValue = window.localStorage.getItem(getStorageKey(userId));
    if (!storedValue) {
      return defaultPreferences;
    }

    const parsed = JSON.parse(storedValue) as Partial<GuidePreferences>;
    return {
      showOnLogin: parsed.showOnLogin ?? defaultPreferences.showOnLogin,
      forcedLoginOpens: Math.min(
        REQUIRED_LOGIN_AUTO_OPENS,
        Math.max(0, parsed.forcedLoginOpens ?? defaultPreferences.forcedLoginOpens),
      ),
    };
  } catch {
    return defaultPreferences;
  }
}

function savePreferences(userId: string, preferences: GuidePreferences) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(preferences),
    );
  } catch {
    // Ignore storage errors to avoid blocking the UI.
  }
}

export function ManagerGuideProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [preferences, setPreferences] = useState<GuidePreferences>(defaultPreferences);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }

    setPreferences(loadPreferences(userId));
    setReady(true);
  }, [userId]);

  useEffect(() => {
    if (!ready || !userId) {
      return;
    }

    savePreferences(userId, preferences);
  }, [preferences, ready, userId]);

  useEffect(() => {
    if (!ready || !userId || typeof window === "undefined") {
      return;
    }

    const pendingLogin = window.sessionStorage.getItem(GUIDE_PENDING_LOGIN_KEY);
    if (!pendingLogin) {
      return;
    }

    window.sessionStorage.removeItem(GUIDE_PENDING_LOGIN_KEY);

    const forcedOpenRequired =
      preferences.forcedLoginOpens < REQUIRED_LOGIN_AUTO_OPENS;

    if (forcedOpenRequired || preferences.showOnLogin) {
      setCurrentStepIndex(0);
      setOpen(true);
    }

    if (forcedOpenRequired) {
      setPreferences((current) => ({
        ...current,
        forcedLoginOpens: Math.min(
          REQUIRED_LOGIN_AUTO_OPENS,
          current.forcedLoginOpens + 1,
        ),
      }));
    }
  }, [preferences.forcedLoginOpens, preferences.showOnLogin, ready, userId]);

  const openGuide = useCallback((stepId?: GuideStep["id"]) => {
    if (stepId) {
      const targetStepIndex = GUIDE_STEPS.findIndex((step) => step.id === stepId);
      setCurrentStepIndex(targetStepIndex >= 0 ? targetStepIndex : 0);
    } else {
      setCurrentStepIndex(0);
    }
    setOpen(true);
  }, []);

  const setShowOnLogin = useCallback((value: boolean) => {
    setPreferences((current) => ({
      ...current,
      showOnLogin: value,
    }));
  }, []);

  const remainingRequiredLogins = Math.max(
    0,
    REQUIRED_LOGIN_AUTO_OPENS - preferences.forcedLoginOpens,
  );

  const contextValue = useMemo<ManagerGuideContextValue>(
    () => ({
      openGuide,
      showOnLogin: preferences.showOnLogin,
      setShowOnLogin,
      remainingRequiredLogins,
    }),
    [openGuide, preferences.showOnLogin, remainingRequiredLogins, setShowOnLogin],
  );

  const currentStep = GUIDE_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === GUIDE_STEPS.length - 1;
  const progressValue = ((currentStepIndex + 1) / GUIDE_STEPS.length) * 100;

  return (
    <ManagerGuideContext.Provider value={contextValue}>
      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <ManagerGuideMascot size="sm" />
                  <BookOpen className="h-4 w-4" />
                  Guida all&apos;utilizzo del manager
                </div>
                <DialogTitle className="text-2xl">
                  {currentStep.title}
                </DialogTitle>
                <DialogDescription className="max-w-3xl text-sm leading-6">
                  {currentStep.description}
                </DialogDescription>
              </div>

              <div className="min-w-32 text-sm text-muted-foreground lg:text-right">
                Passo {currentStepIndex + 1} di {GUIDE_STEPS.length}
              </div>
            </div>

            <Progress className="mt-2 h-2" value={progressValue} />
          </DialogHeader>

          <div className="grid max-h-[calc(92vh-210px)] gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl border bg-slate-950",
                  currentStep.imageAspect ?? "aspect-[16/10]",
                )}
              >
                <Image
                  src={currentStep.image}
                  alt={currentStep.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-contain"
                />
              </div>

              {currentStep.secondaryImage && (
                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl border bg-slate-950",
                    currentStep.secondaryImageAspect ?? "aspect-[16/9]",
                  )}
                >
                  <Image
                    src={currentStep.secondaryImage}
                    alt={currentStep.secondaryImageAlt ?? currentStep.title}
                    fill
                    sizes="(min-width: 1024px) 58vw, 100vw"
                    className="object-contain"
                  />
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border bg-muted/30 p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Cosa puoi fare qui
                </div>

                <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                  {currentStep.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-sm font-medium text-foreground">
                  Suggerimento operativo
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {currentStep.tip}
                </p>
              </div>

              <div className="rounded-xl border p-5">
                <p className="text-sm font-medium text-foreground">
                  Vai direttamente a una sezione
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {GUIDE_STEPS.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCurrentStepIndex(index)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        index === currentStepIndex
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {step.shortTitle}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex max-w-md items-start gap-3">
              <Checkbox
                id="manager-guide-show-on-login"
                checked={preferences.showOnLogin}
                onCheckedChange={(checked) => setShowOnLogin(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="manager-guide-show-on-login"
                  className="text-sm font-medium"
                >
                  Mostra automaticamente la guida all&apos;accesso
                </Label>
                <p className="text-xs leading-5 text-muted-foreground">
                  {remainingRequiredLogins > 0
                    ? `La guida verrà comunque aperta automaticamente per altri ${remainingRequiredLogins} accessi, poi seguirà questa preferenza.`
                    : "Da ora in poi l'apertura automatica seguirà questa preferenza."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStepIndex((current) => Math.max(0, current - 1))}
                disabled={isFirstStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Indietro
              </Button>

              {isLastStep ? (
                <Button type="button" onClick={() => setOpen(false)}>
                  Chiudi guida
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    setCurrentStepIndex((current) =>
                      Math.min(GUIDE_STEPS.length - 1, current + 1),
                    )
                  }
                >
                  Avanti
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ManagerGuideContext.Provider>
  );
}

export function useManagerGuide() {
  const context = useContext(ManagerGuideContext);

  if (!context) {
    return {
      openGuide: () => undefined,
      showOnLogin: true,
      setShowOnLogin: (_value: boolean) => undefined,
      remainingRequiredLogins: REQUIRED_LOGIN_AUTO_OPENS,
    };
  }

  return context;
}

export function ManagerGuideButton({
  stepId,
  label = DEFAULT_GUIDE_BUTTON_LABEL,
  title,
  className,
  iconClassName,
  showLabel = false,
  showMascot = true,
  variant = "outline",
  size = "icon",
}: {
  stepId?: GuideStep["id"];
  label?: string;
  title?: string;
  className?: string;
  iconClassName?: string;
  showLabel?: boolean;
  showMascot?: boolean;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const context = useContext(ManagerGuideContext);
  const mascotSize = size === "icon" ? "sm" : "md";

  if (!context) {
    return null;
  }

  const { openGuide } = context;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      title={title ?? label}
      aria-label={label}
      className={cn(
        className,
        size === "icon" &&
          showMascot &&
          "w-auto gap-1.5 px-1.5 has-[>svg]:px-1.5"
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        openGuide(stepId);
      }}
    >
      {showMascot && <ManagerGuideMascot size={mascotSize} />}
      <BookOpen className={cn("h-4 w-4", iconClassName)} />
      {showLabel && <span>{label}</span>}
    </Button>
  );
}

export function ManagerGuideMascot({
  className,
  size = "md",
}: ManagerGuideMascotProps) {
  const sizeClasses = {
    sm: {
      root: "h-5 w-5",
      face: "scale-[0.72]",
      sparkle: "scale-75",
    },
    md: {
      root: "h-6 w-6",
      face: "scale-[0.86]",
      sparkle: "scale-90",
    },
    lg: {
      root: "h-8 w-8",
      face: "scale-100",
      sparkle: "scale-100",
    },
  } as const;

  return (
    <span
      aria-hidden
      className={cn(
        "guide-assistant-float group relative inline-flex shrink-0 items-center justify-center rounded-full border border-amber-200/80 bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100 shadow-sm",
        sizeClasses[size].root,
        className
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-orange-200/60 opacity-70 blur-md transition-opacity duration-300 group-hover:opacity-100"
      />
      <span
        aria-hidden
        className={cn(
          "relative h-[26px] w-[26px] origin-center overflow-hidden rounded-full bg-[#f5c39b] ring-1 ring-amber-50/80",
          sizeClasses[size].face
        )}
      >
        <span className="absolute inset-x-0 top-0 h-[9px] rounded-t-full bg-[#6b4a36]" />
        <span className="absolute left-[3px] top-[6px] h-[7px] w-[3px] rounded-full bg-[#6b4a36]" />
        <span className="absolute right-[3px] top-[6px] h-[7px] w-[3px] rounded-full bg-[#6b4a36]" />
        <span className="guide-assistant-eye absolute left-[7px] top-[10px] h-1.5 w-1.5 rounded-full bg-[#2f241d]" />
        <span className="guide-assistant-eye guide-assistant-eye-delay absolute right-[7px] top-[10px] h-1.5 w-1.5 rounded-full bg-[#2f241d]" />
        <span className="absolute left-[5px] top-[14px] h-1.5 w-1.5 rounded-full bg-rose-300/70" />
        <span className="absolute right-[5px] top-[14px] h-1.5 w-1.5 rounded-full bg-rose-300/70" />
        <span className="absolute left-1/2 top-[13px] h-2 w-[1.5px] -translate-x-1/2 rounded-full bg-[#d79a73]" />
        <span className="guide-assistant-mustache absolute left-[7px] top-[16px] h-[3px] w-[6px] rounded-full bg-[#4f3628]" />
        <span className="guide-assistant-mustache guide-assistant-mustache-delay absolute right-[7px] top-[16px] h-[3px] w-[6px] rounded-full bg-[#4f3628]" />
        <span className="absolute left-1/2 top-[18px] h-[1.5px] w-[3px] -translate-x-1/2 rounded-full bg-[#4f3628]" />
        <span className="absolute left-1/2 top-[20px] h-[2px] w-[6px] -translate-x-1/2 rounded-full border-b border-[#8a4a38]" />
        <span className="absolute bottom-0 left-1/2 h-[6px] w-[14px] -translate-x-1/2 rounded-t-[999px] bg-[#60a5fa]" />
      </span>
      <span
        aria-hidden
        className={cn(
          "guide-assistant-wave absolute -right-0.5 top-0.5 text-[10px] leading-none",
          sizeClasses[size].sparkle
        )}
      >
        <Sparkles className="h-3 w-3 text-amber-500" />
      </span>
    </span>
  );
}

