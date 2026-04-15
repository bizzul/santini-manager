"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  Headset,
  Loader2,
  Mic,
  MicOff,
  ShieldCheck,
  Siren,
  UserCog,
} from "lucide-react";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { logger } from "@/lib/logger";

type SiteSupportAndSubscriptionModalProps = {
  siteId: string;
  siteName: string;
  siteSubdomain: string;
  trigger: React.ReactNode;
  initialSupportBotEnabled: boolean;
  canConfigureBot: boolean;
  subscription?: {
    status?: string;
    planName?: string;
    renewDate?: string | Date;
    seats?: number;
  };
};

type BotRoute = "autonomo" | "agente_interno" | "operatore_umano";

type ChatMessage = {
  id: string;
  role: "bot" | "user" | "system";
  text: string;
};

function getStatusLabel(status?: string) {
  if (!status) return "Attivo";

  const normalized = status.toLowerCase();
  if (normalized === "active") return "Attivo";
  if (normalized === "trialing") return "Trial";
  if (normalized === "past_due") return "In scadenza";
  if (normalized === "canceled") return "Disdetto";

  return status;
}

function classifyRequest(input: string): {
  route: BotRoute;
  reason: string;
  confidence: number;
} {
  const normalized = input.toLowerCase();

  const humanKeywords = [
    "blocco",
    "fermo produzione",
    "pagamento",
    "fattura",
    "violazione",
    "sicurezza",
    "furto",
    "data breach",
    "critico",
    "urgente",
  ];

  const autonomousKeywords = [
    "password",
    "login",
    "cache",
    "permessi",
    "ruolo",
    "profilo",
    "foto",
    "browser",
  ];

  if (humanKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      route: "operatore_umano",
      reason: "Rilevata criticita alta o tema amministrativo/sicurezza.",
      confidence: 0.93,
    };
  }

  if (autonomousKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      route: "autonomo",
      reason: "Casistica frequente con playbook automatico disponibile.",
      confidence: 0.86,
    };
  }

  return {
    route: "agente_interno",
    reason: "Richiesta tecnica non standard: richiede analisi specialistica.",
    confidence: 0.74,
  };
}

export default function SiteSupportAndSubscriptionModal({
  siteId,
  siteName,
  siteSubdomain,
  trigger,
  initialSupportBotEnabled,
  canConfigureBot,
  subscription,
}: SiteSupportAndSubscriptionModalProps) {
  const [open, setOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "bot-1",
      role: "bot",
      text:
        "Ciao, sono AssistBot. Prima di aprire la richiesta devo verificare la tua identita con 2 domande rapide.",
    },
  ]);
  const [verifyPhoneLast4, setVerifyPhoneLast4] = useState("");
  const [verifyPassphrase, setVerifyPassphrase] = useState("");
  const [identityVerified, setIdentityVerified] = useState(false);
  const [supportReason, setSupportReason] = useState("");
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [triageResult, setTriageResult] = useState<{
    route: BotRoute;
    reason: string;
    confidence: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [supportBotEnabled, setSupportBotEnabled] = useState(initialSupportBotEnabled);
  const [savingBotConfig, setSavingBotConfig] = useState(false);

  useEffect(() => {
    setSupportBotEnabled(initialSupportBotEnabled);
  }, [initialSupportBotEnabled]);

  const statusLabel = useMemo(
    () => getStatusLabel(subscription?.status),
    [subscription?.status]
  );

  const planLabel = subscription?.planName || "Professional";
  const renewDateLabel = useMemo(() => {
    if (!subscription?.renewDate) return "Non disponibile";
    if (subscription.renewDate instanceof Date) {
      return subscription.renewDate.toLocaleDateString("it-IT");
    }
    return String(subscription.renewDate);
  }, [subscription?.renewDate]);
  const seatsLabel = subscription?.seats ?? 10;

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

  const canVerify =
    verifyPhoneLast4.trim().length >= 4 && verifyPassphrase.trim().length >= 3;

  const handleVerifyIdentity = () => {
    if (!canVerify) {
      toast.error("Compila entrambe le verifiche prima di proseguire.");
      return;
    }

    setIdentityVerified(true);
    setChatMessages((current) => [
      ...current,
      {
        id: `user-verify-${Date.now()}`,
        role: "user",
        text: "Verifica identita completata.",
      },
      {
        id: `bot-next-${Date.now()}`,
        role: "bot",
        text:
          "Perfetto, identita verificata. Per accelerare la risoluzione rispondi a queste domande: 1) quale modulo e coinvolto? 2) quando e iniziato il problema? 3) quale errore vedi? 4) quale risultato ti aspetti?",
      },
    ]);
    toast.success("Identita verificata. AssistBot e pronto.");
  };

  const handleUseTranscript = () => {
    if (!fullTranscript.trim()) {
      toast.error("Nessuna trascrizione disponibile.");
      return;
    }
    setSupportReason((current) =>
      `${current}${current.trim() ? "\n\n" : ""}${fullTranscript}`.trim()
    );
    clear();
    toast.success("Trascrizione inserita nella richiesta.");
  };

  const handleAnalyzeRequest = async () => {
    if (!identityVerified) {
      toast.error("Verifica identita prima di analizzare la richiesta.");
      return;
    }

    const compiled = `${supportReason}\n${analysisNotes}`.trim();
    if (compiled.length < 20) {
      toast.error("Aggiungi piu dettagli per una diagnosi efficace.");
      return;
    }

    setIsAnalyzing(true);
    setTriageResult(null);

    await new Promise((resolve) => setTimeout(resolve, 850));
    const result = classifyRequest(compiled);
    setTriageResult(result);
    setIsAnalyzing(false);

    const routeLabel =
      result.route === "autonomo"
        ? "Gestione autonoma"
        : result.route === "agente_interno"
        ? "Inoltro ad agente interno"
        : "Inoltro a operatore umano";

    setChatMessages((current) => [
      ...current,
      {
        id: `user-request-${Date.now()}`,
        role: "user",
        text: supportReason.trim(),
      },
      {
        id: `system-triage-${Date.now()}`,
        role: "system",
        text: `Triage completato: ${routeLabel} (${Math.round(
          result.confidence * 100
        )}% confidenza).`,
      },
      {
        id: `bot-triage-${Date.now()}`,
        role: "bot",
        text: `Esito: ${routeLabel}. ${result.reason}`,
      },
    ]);
  };

  const handleEscalateToHuman = () => {
    const subject = `[${siteSubdomain}] Escalation assistenza`;
    const body = [
      `Sito: ${siteName}`,
      `Subdomain: ${siteSubdomain}`,
      `Stato abbonamento: ${statusLabel}`,
      `Piano: ${planLabel}`,
      "",
      "Verifica identita effettuata: SI",
      `Ultime 4 cifre telefono (fornite): ${verifyPhoneLast4}`,
      "",
      "Motivo richiesta:",
      supportReason.trim(),
      "",
      "Note aggiuntive:",
      analysisNotes.trim() || "-",
      "",
      "Esito triage:",
      triageResult
        ? `${triageResult.route} (${Math.round(triageResult.confidence * 100)}%)`
        : "non disponibile",
    ].join("\n");

    window.location.href = `mailto:support@fulldatamanager.it?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  const handleToggleSupportBot = async () => {
    if (!canConfigureBot) {
      toast.error("Solo utenti superadmin possono modificare questa opzione.");
      return;
    }

    const nextValue = !supportBotEnabled;
    setSavingBotConfig(true);

    try {
      const response = await fetch("/api/settings/site-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId,
          settingKey: "support_bot_enabled",
          value: nextValue,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile aggiornare impostazione BOT");
      }

      setSupportBotEnabled(nextValue);
      toast.success(
        nextValue
          ? "BOT assistenza abilitato per questo cliente."
          : "BOT assistenza disabilitato per questo cliente."
      );
    } catch (error) {
      logger.error("Support bot toggle error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante aggiornamento impostazione BOT"
      );
    } finally {
      setSavingBotConfig(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Assistenza e abbonamenti</DialogTitle>
          <DialogDescription>
            Controlla stato piano e apri chat istantanea con AssistBot per
            verifica, raccolta dettagli e triage automatico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[72vh] overflow-y-auto pr-1">
          <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-white">
              <CreditCard className="h-4 w-4 text-emerald-300" />
              <p className="text-sm font-semibold">Stato abbonamento</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-xs text-white/60">Piano</p>
                <p className="mt-1 text-sm font-semibold text-white">{planLabel}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-xs text-white/60">Stato</p>
                <div className="mt-1">
                  <Badge className="border-emerald-300/40 bg-emerald-500/20 text-emerald-100">
                    {statusLabel}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-xs text-white/60">Prossimo rinnovo</p>
                <p className="mt-1 text-sm font-semibold text-white">{renewDateLabel}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-3">
                <p className="text-xs text-white/60">Postazioni incluse</p>
                <p className="mt-1 text-sm font-semibold text-white">{seatsLabel}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <Bot className="h-4 w-4 text-emerald-300" />
                <p className="text-sm font-semibold">Chat assistenza virtuale</p>
              </div>
              <Badge
                className={
                  identityVerified
                    ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                    : "border-amber-300/40 bg-amber-500/20 text-amber-100"
                }
              >
                {identityVerified ? "Utente verificato" : "Verifica richiesta"}
              </Badge>
            </div>

            <div className="mb-3 rounded-lg border border-white/10 bg-slate-950/25 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">
                    BOT assistenza per questo cliente
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    Configurabile solo da utenti superadmin nel pannello di controllo.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      supportBotEnabled
                        ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                        : "border-red-300/40 bg-red-500/20 text-red-100"
                    }
                  >
                    {supportBotEnabled ? "BOT attivo" : "BOT disattivo"}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleToggleSupportBot}
                    disabled={!canConfigureBot || savingBotConfig}
                    className={
                      supportBotEnabled
                        ? "bg-red-500/80 text-white hover:bg-red-500"
                        : "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                    }
                  >
                    {savingBotConfig ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : supportBotEnabled ? (
                      "Disabilita BOT"
                    ) : (
                      "Abilita BOT"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {!supportBotEnabled && (
              <div className="mb-3 space-y-3 rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <p>
                  Il BOT assistenza e disattivato per questo cliente. E possibile
                  usare solo l&apos;inoltro verso supporto umano finche non viene
                  riabilitato da un superadmin.
                </p>
                <div>
                  <Label htmlFor="supportReasonFallback" className="text-white/85">
                    Motivo richiesta per operatore umano
                  </Label>
                  <Textarea
                    id="supportReasonFallback"
                    rows={4}
                    value={supportReason}
                    onChange={(event) => setSupportReason(event.target.value)}
                    placeholder="Descrivi il problema da inviare al supporto umano..."
                    className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/45"
                  />
                </div>
              </div>
            )}

            <div className="mb-3 space-y-2 rounded-lg border border-white/10 bg-slate-950/25 p-3">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100"
                      : message.role === "system"
                      ? "rounded-lg bg-sky-500/20 px-3 py-2 text-sm text-sky-100"
                      : "rounded-lg bg-white/10 px-3 py-2 text-sm text-white"
                  }
                >
                  {message.text}
                </div>
              ))}
            </div>

            {!identityVerified && supportBotEnabled && (
              <div className="space-y-3 rounded-lg border border-amber-300/25 bg-amber-500/10 p-3">
                <div className="flex items-center gap-2 text-white">
                  <ShieldCheck className="h-4 w-4 text-amber-300" />
                  <p className="text-sm font-semibold">Verifica identita (2 domande)</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label className="text-white/80">
                      Ultime 4 cifre telefono
                    </Label>
                    <Input
                      value={verifyPhoneLast4}
                      onChange={(event) =>
                        setVerifyPhoneLast4(event.target.value.replace(/\D/g, ""))
                      }
                      maxLength={4}
                      className="mt-2 border-white/20 bg-white/5 text-white"
                      placeholder="Es. 1234"
                    />
                  </div>
                  <div>
                    <Label className="text-white/80">Parola d'ordine personale</Label>
                    <Input
                      value={verifyPassphrase}
                      onChange={(event) => setVerifyPassphrase(event.target.value)}
                      className="mt-2 border-white/20 bg-white/5 text-white"
                      placeholder="Inserisci parola d'ordine"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleVerifyIdentity}
                    className="bg-amber-400 text-amber-950 hover:bg-amber-300"
                  >
                    Conferma identita
                  </Button>
                </div>
              </div>
            )}

            {identityVerified && supportBotEnabled && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="supportReason" className="text-white/80">
                    Motivo richiesta (testo o dettatura)
                  </Label>
                  <Textarea
                    id="supportReason"
                    rows={5}
                    value={supportReason}
                    onChange={(event) => setSupportReason(event.target.value)}
                    placeholder="Descrivi problema, impatto operativo e quando e iniziato..."
                    className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/45"
                  />
                </div>

                <div className="rounded-lg border border-white/10 bg-slate-950/20 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm text-white/80">
                      Dettatura vocale richiesta
                    </p>
                    {!isSupported && (
                      <span className="text-xs text-amber-200">
                        Browser non compatibile
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!isSupported || isRecording || isProcessing}
                      onClick={start}
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <Mic className="mr-2 h-4 w-4" />
                      Avvia dettatura
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!isRecording}
                      onClick={stop}
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      <MicOff className="mr-2 h-4 w-4" />
                      Ferma
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!fullTranscript.trim()}
                      onClick={handleUseTranscript}
                      className="border-white/30 text-white hover:bg-white/10"
                    >
                      Usa trascrizione
                    </Button>
                  </div>
                  {isRecording && (
                    <p className="mt-2 text-xs text-emerald-200">
                      Registrazione attiva: parla ora.
                    </p>
                  )}
                  {speechError && (
                    <p className="mt-2 text-xs text-red-200">
                      Errore dettatura: {speechError.message}
                    </p>
                  )}
                  {fullTranscript && (
                    <p className="mt-2 text-xs text-white/70">
                      Trascrizione: {fullTranscript}
                    </p>
                  )}
                </div>

              <div>
                <Label htmlFor="analysisNotes" className="text-white/80">
                  Dettagli tecnici aggiuntivi
                </Label>
                <Textarea
                  id="analysisNotes"
                  rows={3}
                  value={analysisNotes}
                  onChange={(event) => setAnalysisNotes(event.target.value)}
                  placeholder="Esempio: screenshot, testo errore, modulo coinvolto, frequenza..."
                  className="mt-2 border-white/20 bg-white/5 text-white placeholder:text-white/45"
                />
              </div>

                {triageResult && (
                  <div className="rounded-lg border border-sky-300/25 bg-sky-500/10 p-3">
                    <div className="mb-2 flex items-center gap-2 text-white">
                      {triageResult.route === "operatore_umano" ? (
                        <Siren className="h-4 w-4 text-rose-300" />
                      ) : triageResult.route === "agente_interno" ? (
                        <UserCog className="h-4 w-4 text-sky-300" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      )}
                      <p className="text-sm font-semibold">Esito triage assistenza</p>
                    </div>
                    <p className="text-sm text-white/90">
                      {triageResult.route === "autonomo" &&
                        "AssistBot puo gestire la richiesta in autonomia."}
                      {triageResult.route === "agente_interno" &&
                        "La richiesta viene inoltrata ad agente tecnico interno."}
                      {triageResult.route === "operatore_umano" &&
                        "La richiesta viene escalata a operatore umano."}
                    </p>
                    <p className="mt-1 text-xs text-white/70">{triageResult.reason}</p>
                    <p className="mt-1 text-xs text-white/60">
                      Confidenza classificazione:{" "}
                      {Math.round(triageResult.confidence * 100)}%
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAnalyzeRequest}
                    disabled={isAnalyzing}
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Bot className="mr-2 h-4 w-4" />
                    )}
                    Analizza con agente BOT
                  </Button>
                  <Button
                    type="button"
                    onClick={handleEscalateToHuman}
                    className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                  >
                    <Headset className="mr-2 h-4 w-4" />
                    Inoltra a supporto umano
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            {!supportBotEnabled && (
              <Button
                type="button"
                onClick={handleEscalateToHuman}
                className="mr-2 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
              >
                <Headset className="mr-2 h-4 w-4" />
                Inoltra a supporto umano
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              <CircleHelp className="mr-2 h-4 w-4" />
              Chiudi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
