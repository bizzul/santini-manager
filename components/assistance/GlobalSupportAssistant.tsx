"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  Loader2,
  Mail,
  Mic,
  MicOff,
  Ticket,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useUserContext } from "@/hooks/use-user-context";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AssistanceLevel = "basic_tutorial" | "smart_support" | "advanced_support";
type SupportChannel = "email" | "ticket";
type AssistantId = "vera" | "mira" | "aura";

function getAssistanceLevelLabel(level: AssistanceLevel) {
  if (level === "advanced_support") return "Livello C";
  if (level === "smart_support") return "Livello B";
  return "Livello A";
}

function getRequestTypeOptions(level: AssistanceLevel) {
  if (level === "advanced_support") {
    return [
      { value: "error", label: "Segnalazione errore" },
      { value: "support", label: "Richiesta assistenza operativa" },
      { value: "custom", label: "Richiesta funzione custom" },
    ];
  }

  return [
    { value: "error", label: "Segnalazione errore" },
    { value: "support", label: "Richiesta assistenza" },
  ];
}

function classifySupport(details: string) {
  const normalized = details.toLowerCase();
  const criticalKeywords = [
    "blocco",
    "fermo",
    "critico",
    "errore fatale",
    "non fattura",
    "non salva",
  ];

  const mediumKeywords = ["lento", "permesso", "profilo", "accesso", "ruolo"];

  if (criticalKeywords.some((keyword) => normalized.includes(keyword))) {
    return { severity: "alta", destination: "tecnico prioritario" };
  }

  if (mediumKeywords.some((keyword) => normalized.includes(keyword))) {
    return { severity: "media", destination: "agente interno" };
  }

  return { severity: "standard", destination: "coda supporto" };
}

function resolveAssistantFromPathname(pathname?: string | null): AssistantId {
  if (!pathname) return "vera";

  if (
    pathname.includes("/factory") ||
    pathname.includes("/inventory") ||
    pathname.includes("/calendar") ||
    pathname.includes("/timetracking") ||
    pathname.includes("/qualityControl") ||
    pathname.includes("/boxing") ||
    pathname.includes("/dashboard/produzione") ||
    pathname.includes("/dashboard/avor")
  ) {
    return "mira";
  }

  if (
    pathname.includes("/clients") ||
    pathname.includes("/offerte") ||
    pathname.includes("/dashboard/vendita") ||
    pathname.includes("/dashboard/forecast") ||
    pathname.includes("/suppliers") ||
    pathname.includes("/manufacturers")
  ) {
    return "aura";
  }

  return "vera";
}

export function GlobalSupportAssistant() {
  const pathname = usePathname();
  const { userContext, loading } = useUserContext();
  const [activeAssistant, setActiveAssistant] = useState<AssistantId>(
    resolveAssistantFromPathname(pathname)
  );
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState("error");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [technicalDetails, setTechnicalDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [miniChatPosition, setMiniChatPosition] = useState({ x: 0, y: 64 });
  const [miniChatPositionReady, setMiniChatPositionReady] = useState(false);
  const [isDraggingMiniChat, setIsDraggingMiniChat] = useState(false);
  const [miniChatStage, setMiniChatStage] = useState<"intro" | "thinking" | "full">(
    "intro"
  );
  const [introMessage, setIntroMessage] = useState("");
  const [introSequenceStep, setIntroSequenceStep] = useState<
    "idle" | "typing" | "presented"
  >("idle");
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [superadminPreviewLevel, setSuperadminPreviewLevel] =
    useState<AssistanceLevel | null>(null);

  const {
    isSupported,
    isRecording,
    isProcessing,
    fullTranscript,
    start,
    stop,
    clear,
    error: speechError,
  } = useSpeechToText({
    language: "it-IT",
    continuous: true,
    interimResults: true,
  });

  const isAuthRoute =
    pathname?.startsWith("/login") || pathname?.startsWith("/auth");
  const isSiteRoute = Boolean(pathname?.startsWith("/sites/"));
  const assistantLabel =
    activeAssistant === "mira"
      ? "Mira"
      : activeAssistant === "aura"
      ? "Aura"
      : "Vera";
  const assistantAvatarSrc = `/api/assistant/avatar?assistant=${activeAssistant}&variant=chat`;

  const assistanceLevel: AssistanceLevel = useMemo(() => {
    const fromContext = userContext?.assistanceLevel;
    if (
      fromContext === "basic_tutorial" ||
      fromContext === "smart_support" ||
      fromContext === "advanced_support"
    ) {
      return fromContext;
    }

    // Safe fallback if older cached context is still in localStorage.
    if (userContext?.role === "superadmin") return "advanced_support";
    if (userContext?.role === "admin") return "smart_support";
    return "basic_tutorial";
  }, [userContext?.assistanceLevel, userContext?.role]);

  const effectiveAssistanceLevel = useMemo(() => {
    if (userContext?.role === "superadmin" && superadminPreviewLevel) {
      return superadminPreviewLevel;
    }
    return assistanceLevel;
  }, [assistanceLevel, superadminPreviewLevel, userContext?.role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userContext?.role !== "superadmin") return;

    const persisted = window.localStorage.getItem("assistbot-superadmin-level");
    if (
      persisted === "basic_tutorial" ||
      persisted === "smart_support" ||
      persisted === "advanced_support"
    ) {
      setSuperadminPreviewLevel(persisted);
      return;
    }

    setSuperadminPreviewLevel(assistanceLevel);
  }, [assistanceLevel, userContext?.role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (userContext?.role !== "superadmin") return;
    if (!superadminPreviewLevel) return;

    window.localStorage.setItem("assistbot-superadmin-level", superadminPreviewLevel);
  }, [superadminPreviewLevel, userContext?.role]);

  const requestTypeOptions = useMemo(
    () => getRequestTypeOptions(effectiveAssistanceLevel),
    [effectiveAssistanceLevel]
  );

  useEffect(() => {
    const allowedValues = requestTypeOptions.map((option) => option.value);
    if (!allowedValues.includes(requestType)) {
      setRequestType("error");
    }
  }, [requestType, requestTypeOptions]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ assistant?: AssistantId }>;
      if (customEvent?.detail?.assistant) {
        setActiveAssistant(customEvent.detail.assistant);
      } else {
        setActiveAssistant(resolveAssistantFromPathname(pathname));
      }
      setOpen(true);
    };
    window.addEventListener("open-support-assistant", handler as EventListener);
    return () => {
      window.removeEventListener("open-support-assistant", handler as EventListener);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isSiteRoute) return;
    setActiveAssistant(resolveAssistantFromPathname(pathname));
  }, [isSiteRoute, pathname]);

  useEffect(() => {
    if (!open && isSiteRoute) {
      setMiniChatStage("intro");
      setIntroMessage("");
      setIntroSequenceStep("idle");
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      if (introTypingTimerRef.current) {
        clearTimeout(introTypingTimerRef.current);
        introTypingTimerRef.current = null;
      }
    }
  }, [open, isSiteRoute]);

  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
      }
      if (introTypingTimerRef.current) {
        clearTimeout(introTypingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSiteRoute || !open || miniChatStage !== "intro") {
      return;
    }

    if (introSequenceStep !== "idle") {
      return;
    }

    setIntroSequenceStep("typing");
    introTypingTimerRef.current = setTimeout(() => {
      setIntroSequenceStep("presented");
    }, 1400);
  }, [introSequenceStep, isSiteRoute, miniChatStage, open]);

  useEffect(() => {
    if (!isSiteRoute || !open || miniChatPositionReady) return;
    const panelWidth = 390;
    setMiniChatPosition({
      x: Math.max(8, window.innerWidth - panelWidth - 16),
      y: 56,
    });
    setMiniChatPositionReady(true);
  }, [isSiteRoute, open, miniChatPositionReady]);

  useEffect(() => {
    if (!isDraggingMiniChat) return;

    const onMove = (event: PointerEvent) => {
      const panelWidth = 390;
      const panelHeight = 600;
      const nextX = event.clientX - dragOffsetRef.current.x;
      const nextY = event.clientY - dragOffsetRef.current.y;
      setMiniChatPosition({
        x: Math.max(8, Math.min(nextX, window.innerWidth - panelWidth - 8)),
        y: Math.max(8, Math.min(nextY, window.innerHeight - panelHeight - 8)),
      });
    };

    const onUp = () => {
      setIsDraggingMiniChat(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isDraggingMiniChat]);

  const displayName = useMemo(() => {
    const meta = userContext?.user?.user_metadata || {};
    const firstName =
      meta.given_name ||
      meta.name ||
      (typeof meta.full_name === "string" ? meta.full_name.split(" ")[0] : null);

    if (typeof firstName === "string" && firstName.trim()) {
      return firstName.trim();
    }

    const email = userContext?.user?.email;
    if (typeof email === "string" && email.includes("@")) {
      return email.split("@")[0];
    }

    return "utente";
  }, [userContext?.user]);

  if (loading || !userContext || isAuthRoute) {
    return null;
  }

  const useTranscriptInDetails = () => {
    if (!fullTranscript.trim()) {
      toast.error("Nessuna trascrizione disponibile.");
      return;
    }

    setDetails((current) =>
      `${current}${current.trim() ? "\n\n" : ""}${fullTranscript}`.trim()
    );
    clear();
    toast.success("Trascrizione aggiunta alla richiesta.");
  };

  const compiledBody = () => {
    const triage = classifySupport(`${subject}\n${details}\n${technicalDetails}`);

    return [
      `Utente: ${userContext.user?.email || "-"}`,
      `Ruolo: ${userContext.role}`,
      `Livello assistenza: ${getAssistanceLevelLabel(effectiveAssistanceLevel)}`,
      `Tipo richiesta: ${requestType}`,
      `Percorso applicativo: ${pathname || "-"}`,
      `Priorita suggerita BOT: ${triage.severity}`,
      `Destinazione suggerita: ${triage.destination}`,
      "",
      "Oggetto:",
      subject || "-",
      "",
      "Dettaglio richiesta:",
      details || "-",
      "",
      "Dettagli tecnici aggiuntivi:",
      technicalDetails || "-",
    ].join("\n");
  };

  const handleSubmit = async (channel: SupportChannel) => {
    if (effectiveAssistanceLevel === "basic_tutorial") {
      toast.info(
        "Il tuo profilo e configurato su tutorial statico. Chiedi al superadmin di abilitare il supporto avanzato."
      );
      return;
    }

    if (!subject.trim() || details.trim().length < 12) {
      toast.error("Inserisci oggetto e almeno un dettaglio descrittivo.");
      return;
    }

    const body = compiledBody();
    const emailSubject = `[AssistBot ${getAssistanceLevelLabel(
      effectiveAssistanceLevel
    )}] ${subject.trim()}`;

    if (channel === "email") {
      window.location.href = `mailto:support@fulldatamanager.it?subject=${encodeURIComponent(
        emailSubject
      )}&body=${encodeURIComponent(body)}`;
      toast.success("Bozza email aperta nel client di posta.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          details: details.trim(),
          technicalDetails: technicalDetails.trim(),
          requestType,
          assistanceLevel: effectiveAssistanceLevel,
          appPath: pathname,
          userEmail: userContext.user?.email || null,
          userRole: userContext.role,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Impossibile creare ticket");
      }

      toast.success(
        payload.ticketId
          ? `Ticket creato con successo (${payload.ticketId}).`
          : "Ticket inoltrato con successo."
      );
      setOpen(false);
      setSubject("");
      setDetails("");
      setTechnicalDetails("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore durante creazione ticket"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const beginMiniChatDrag = (event: any) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    dragOffsetRef.current = {
      x: event.clientX - miniChatPosition.x,
      y: event.clientY - miniChatPosition.y,
    };
    setIsDraggingMiniChat(true);
  };

  const handleBeginConversation = () => {
    const combinedMessage = [introMessage.trim(), fullTranscript.trim()]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!combinedMessage) {
      toast.info(`Scrivi o detta un messaggio per iniziare la chat con ${assistantLabel}.`);
      return;
    }

    setDetails(combinedMessage);
    clear();
    setMiniChatStage("thinking");

    if (thinkingTimerRef.current) {
      clearTimeout(thinkingTimerRef.current);
    }
    thinkingTimerRef.current = setTimeout(() => {
      setMiniChatStage("full");
    }, 3000);
  };

  const assistantContent = (
    <>
      <div className="rounded-lg border border-slate-300/40 bg-slate-100/70 p-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 overflow-hidden rounded-full border border-white/40 ring-2 ring-violet-300/25">
            <img
              src={assistantAvatarSrc}
              alt={`${assistantLabel} avatar`}
              className="h-full w-full scale-150 object-cover object-[center_22%]"
            />
          </span>
          <p className="text-sm font-medium">
            {`Ciao sono ${assistantLabel}, e sono qui per te! ;-)`}
          </p>
        </div>
      </div>

      {userContext.role === "superadmin" && (
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Assistente in uso (preview superadmin)
              </p>
              <p className="text-xs text-slate-600">
                Seleziona sempre il profilo A/B/C per testare e migliorare i flussi.
              </p>
            </div>
            <Select
              value={effectiveAssistanceLevel}
              onValueChange={(value) =>
                setSuperadminPreviewLevel(value as AssistanceLevel)
              }
            >
              <SelectTrigger className="w-[240px] border-slate-300/70 bg-white text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic_tutorial">
                  Livello A - Tutorial statico
                </SelectItem>
                <SelectItem value="smart_support">
                  Livello B - Supporto rapido
                </SelectItem>
                <SelectItem value="advanced_support">
                  Livello C - Avanzato/custom
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {effectiveAssistanceLevel === "basic_tutorial" ? (
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="font-medium">Tutorial rapido</p>
            <p className="mt-2 text-muted-foreground">
              1) Usa il menu laterale per entrare nel modulo.
            </p>
            <p className="text-muted-foreground">
              2) Apri la sezione filtro in alto per trovare rapidamente dati e attività.
            </p>
            <p className="text-muted-foreground">
              3) Per assistenza tecnica avanzata, chiedi al superadmin di abilitarti al
              livello B o C.
            </p>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Chiudi
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-slate-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support-type" className="text-slate-900">
                Tipologia richiesta
              </Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger id="support-type" className="border-slate-300/70 bg-white text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {requestTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-subject" className="text-slate-900">
                Oggetto
              </Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Es. Non vedo i test nelle attività calendario"
                className="border-slate-300/70 bg-white text-slate-900 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-details" className="text-slate-900">
              Dettaglio richiesta
            </Label>
            <Textarea
              id="support-details"
              rows={5}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Descrivi modulo coinvolto, passaggi, errore e risultato atteso..."
              className="border-slate-300/70 bg-white text-slate-900 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-slate-300/60 bg-slate-50/90 p-3">
            <p className="text-sm font-medium text-slate-900">Dettatura vocale</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!isSupported || isRecording || isProcessing}
                onClick={start}
                className="border-slate-300/70 bg-white text-slate-900 hover:bg-slate-50"
              >
                <Mic className="mr-2 h-4 w-4" />
                Avvia
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!isRecording}
                onClick={stop}
                className="border-slate-300/70 bg-white text-slate-900 hover:bg-slate-50"
              >
                <MicOff className="mr-2 h-4 w-4" />
                Ferma
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!fullTranscript.trim()}
                onClick={useTranscriptInDetails}
                className="border-slate-300/70 bg-white text-slate-900 hover:bg-slate-50"
              >
                Usa trascrizione
              </Button>
            </div>
            {speechError && (
              <p className="text-xs text-destructive">
                Errore dettatura: {speechError.message}
              </p>
            )}
            {fullTranscript && (
              <p className="text-xs text-slate-600">Trascrizione: {fullTranscript}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-tech-details" className="text-slate-900">
              Dettagli tecnici aggiuntivi
            </Label>
            <Textarea
              id="support-tech-details"
              rows={3}
              value={technicalDetails}
              onChange={(event) => setTechnicalDetails(event.target.value)}
              placeholder="Screenshot, frequenza, browser, ora evento, utenti coinvolti..."
              className="border-slate-300/70 bg-white text-slate-900 placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-slate-300/70 bg-white text-slate-900 hover:bg-slate-50"
            >
              Chiudi
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit("email")}
              className="border-slate-300/70 bg-white text-slate-900 hover:bg-slate-50"
            >
              <Mail className="mr-2 h-4 w-4" />
              Invia via email
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit("ticket")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ticket className="mr-2 h-4 w-4" />
              )}
              Crea ticket
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {isSiteRoute ? (
        open && (
          <div
            className="fixed z-50 w-[390px] max-w-[calc(100vw-1rem)] rounded-2xl border border-amber-200/70 bg-[#f6f2e9]/95 text-slate-900 shadow-[0_20px_55px_rgba(30,41,59,0.35)] backdrop-blur"
            style={{ left: miniChatPosition.x, top: miniChatPosition.y }}
          >
            <div className="max-h-[min(76vh,640px)] overflow-y-auto p-3">
              <div
                className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-amber-200/80 bg-white/70 px-2 py-1.5 cursor-move"
                onPointerDown={beginMiniChatDrag}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 overflow-hidden rounded-full border border-white/30">
                      <img
                        src={assistantAvatarSrc}
                        alt={`${assistantLabel} assistant`}
                        className="h-full w-full scale-150 object-cover object-[center_22%]"
                      />
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {assistantLabel} Assistente
                    </p>
                    <Badge variant="outline">
                      {getAssistanceLevelLabel(effectiveAssistanceLevel)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {effectiveAssistanceLevel === "basic_tutorial"
                      ? "Tutorial rapido contestuale."
                      : "Chat assistenza rapida con inoltro ticket/email."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 border border-amber-300/70 bg-white/85 text-slate-700 hover:bg-white"
                  onClick={() => setOpen(false)}
                  title="Chiudi chat"
                  aria-label="Chiudi chat"
                >
                  <X className="h-4 w-4 text-slate-700" />
                </Button>
              </div>

              {miniChatStage === "intro" ? (
                <div className="space-y-3 rounded-xl border border-amber-200/80 bg-gradient-to-b from-amber-50 to-orange-50 p-3 text-slate-900 shadow-inner">
                  <div className="space-y-2">
                    {introSequenceStep === "typing" && (
                      <div className="flex items-end gap-2">
                        <span className="inline-flex h-8 w-8 overflow-hidden rounded-full border border-amber-300/60">
                          <img
                            src={assistantAvatarSrc}
                            alt={`${assistantLabel} avatar`}
                            className="h-full w-full scale-150 object-cover object-[center_22%]"
                          />
                        </span>
                        <div className="rounded-2xl rounded-bl-md bg-white/90 px-3 py-2 shadow-sm">
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce" />
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:120ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce [animation-delay:240ms]" />
                          </div>
                        </div>
                      </div>
                    )}

                    {introSequenceStep === "presented" && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex h-8 w-8 overflow-hidden rounded-full border border-amber-300/60">
                            <img
                              src={assistantAvatarSrc}
                              alt={`${assistantLabel} avatar`}
                              className="h-full w-full scale-150 object-cover object-[center_22%]"
                            />
                          </span>
                          <div className="max-w-[83%] rounded-2xl rounded-bl-md bg-white/90 px-3 py-2 shadow-sm">
                            <span className="block h-36 w-full overflow-hidden rounded-lg border border-amber-200/60 bg-slate-200">
                              <img
                                src={assistantAvatarSrc}
                                alt={`Foto di ${assistantLabel}`}
                                className="h-full w-full scale-150 object-cover object-[center_22%]"
                              />
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex h-8 w-8 overflow-hidden rounded-full border border-amber-300/60">
                            <img
                              src={assistantAvatarSrc}
                              alt={`${assistantLabel} avatar`}
                              className="h-full w-full scale-150 object-cover object-[center_22%]"
                            />
                          </span>
                          <p className="max-w-[83%] rounded-2xl rounded-bl-md bg-white/90 px-3 py-2 text-sm shadow-sm">
                            {`Ciao io sono ${assistantLabel}! Come stai "${displayName}"?`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-700">
                    Scrivi un messaggio o usa la dettatura vocale per iniziare.
                  </p>
                  <Textarea
                    value={introMessage}
                    onChange={(event) => setIntroMessage(event.target.value)}
                    rows={4}
                    placeholder="Raccontami cosa ti serve..."
                    className="border-amber-300/60 bg-white/80 text-slate-900 placeholder:text-slate-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                      className="border-amber-300/60 bg-white/80 text-slate-900 hover:bg-white"
                    >
                      Chiudi chat
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!isSupported || isRecording || isProcessing}
                      onClick={start}
                      className="border-amber-300/60 bg-white/80 text-slate-900 hover:bg-white"
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Audio
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!isRecording}
                      onClick={stop}
                      className="border-amber-300/60 bg-white/80 text-slate-900 hover:bg-white"
                    >
                      <MicOff className="mr-2 h-4 w-4" />
                      Ferma
                    </Button>
                    <Button
                      type="button"
                      onClick={handleBeginConversation}
                      className="bg-slate-900 text-white hover:bg-slate-800"
                    >
                      {`Invia a ${assistantLabel}`}
                    </Button>
                  </div>
                  {speechError && (
                    <p className="text-xs text-red-700">Errore audio: {speechError.message}</p>
                  )}
                  {fullTranscript && (
                    <p className="text-xs text-slate-700">
                      Trascrizione pronta: {fullTranscript}
                    </p>
                  )}
                </div>
              ) : miniChatStage === "thinking" ? (
                <div className="space-y-4 rounded-xl border border-violet-300/30 bg-violet-500/10 p-4 text-center">
                  <span className="mx-auto inline-flex h-20 w-20 overflow-hidden rounded-full border border-white/30 shadow-lg animate-pulse">
                    <span className="block h-full w-full scale-150">
                      <img
                        src={assistantAvatarSrc}
                        alt={`${assistantLabel} thinking`}
                        className="h-full w-full object-cover object-[center_22%] animate-[spin_3s_linear_infinite]"
                      />
                    </span>
                  </span>
                  <p className="text-sm font-semibold">{assistantLabel} sta pensando...</p>
                  <p className="text-xs text-muted-foreground">
                    Elaborazione in corso, attendi un attimo.
                  </p>
                </div>
              ) : (
                assistantContent
              )}
            </div>
          </div>
        )
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Assistenza BOT
                <Badge variant="outline">
                  {getAssistanceLevelLabel(effectiveAssistanceLevel)}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {effectiveAssistanceLevel === "basic_tutorial"
                  ? "Avatar tutorial statico: guida rapida all'uso delle principali funzioni."
                  : "Segnala errore o richiesta supporto e inoltra via mail o ticket."}
              </DialogDescription>
            </DialogHeader>
            {assistantContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
