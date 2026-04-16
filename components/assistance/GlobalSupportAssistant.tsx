"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useUserContext } from "@/hooks/use-user-context";
import { useSiteId } from "@/hooks/use-site-id";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantsChatResponse } from "@/types/assistants";

type AssistantId = "vera" | "mira" | "aura";
const AVAILABLE_ASSISTANTS: AssistantId[] = ["vera", "mira", "aura"];

type ChatRole = "assistant" | "user" | "system";

interface ChatMessage {
  id: string;
  role: ChatRole;
  assistant: AssistantId;
  content: string;
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

function getAssistantMeta(id: AssistantId) {
  if (id === "mira") {
    return {
      label: "Mira",
      subtitle: "Assistente tecnico-operativa",
      avatar: "/api/assistant/avatar?assistant=mira&variant=chat",
    };
  }
  if (id === "aura") {
    return {
      label: "Aura",
      subtitle: "Assistente relazionale/commerciale",
      avatar: "/api/assistant/avatar?assistant=aura&variant=chat",
    };
  }
  return {
    label: "Vera",
    subtitle: "Assistente generale",
    avatar: "/api/assistant/avatar?assistant=vera&variant=chat",
  };
}

function extractDomain(pathname?: string | null): string | null {
  if (!pathname) return null;
  const match = pathname.match(/\/sites\/([^/]+)/);
  return match?.[1] || null;
}

function createMessage(
  role: ChatRole,
  assistant: AssistantId,
  content: string
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    assistant,
    content,
  };
}

export function GlobalSupportAssistant() {
  const pathname = usePathname();
  const { userContext, loading } = useUserContext();
  const isSiteRoute = Boolean(pathname?.startsWith("/sites/"));
  const [open, setOpen] = useState(false);
  const [activeAssistant, setActiveAssistant] = useState<AssistantId>(
    resolveAssistantFromPathname(pathname)
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const domain = extractDomain(pathname);
  const { siteId } = useSiteId(domain || undefined);

  const assistantMeta = getAssistantMeta(activeAssistant);

  useEffect(() => {
    if (!isSiteRoute) {
      setOpen(false);
      return;
    }
    const next = resolveAssistantFromPathname(pathname);
    setActiveAssistant(next);
  }, [isSiteRoute, pathname]);

  useEffect(() => {
    if (!isSiteRoute) return;
    const greeting = `Ciao, sono ${getAssistantMeta(activeAssistant).label}. Come posso aiutarti in questa schermata?`;
    setMessages((current) => {
      const hasGreetingForAssistant = current.some(
        (message) => message.assistant === activeAssistant && message.role === "assistant"
      );
      if (hasGreetingForAssistant) return current;
      return [...current, createMessage("assistant", activeAssistant, greeting)];
    });
  }, [isSiteRoute, activeAssistant]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ assistant?: AssistantId }>;
      const forced = custom?.detail?.assistant;
      if (forced) {
        setActiveAssistant(forced);
      }
      setOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    };

    window.addEventListener("open-support-assistant", handler as EventListener);
    return () => {
      window.removeEventListener("open-support-assistant", handler as EventListener);
    };
  }, []);

  const visibleMessages = useMemo(() => {
    return messages.filter((message) => message.assistant === activeAssistant);
  }, [messages, activeAssistant]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending, isTranscribing]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "0px";
    inputRef.current.style.height = `${Math.min(
      inputRef.current.scrollHeight,
      180
    )}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  const canSubmit = useMemo(() => {
    return !isSending && !isTranscribing && (input.trim().length > 0 || !!audioFile);
  }, [input, audioFile, isSending, isTranscribing]);

  if (loading || !userContext || !isSiteRoute) {
    return null;
  }
  const requesterUserId = userContext.userId || userContext.user?.id;
  const assistantDock = (
    <div className="fixed right-4 top-14 z-[70] flex items-center gap-2 rounded-full border border-slate-700/90 bg-slate-950/92 px-2 py-1.5 shadow-[0_16px_42px_rgba(2,6,23,0.55)] backdrop-blur">
      {AVAILABLE_ASSISTANTS.map((assistantId) => {
        const meta = getAssistantMeta(assistantId);
        const isSelected = assistantId === activeAssistant;
        return (
          <button
            key={assistantId}
            type="button"
            title={`Apri ${meta.label}`}
            onClick={() => {
              setActiveAssistant(assistantId);
              setOpen(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className={`inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border transition hover:scale-105 ${
              isSelected
                ? "border-cyan-400/90 ring-2 ring-cyan-400/50"
                : "border-slate-600/90 hover:border-slate-400"
            }`}
          >
            <img
              src={meta.avatar}
              alt={`${meta.label} avatar`}
              className="h-full w-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );

  async function transcribeAudio(file: File): Promise<string> {
    if (!siteId) {
      throw new Error("Site ID non disponibile per la trascrizione audio.");
    }

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);
      formData.append("siteId", siteId);
      formData.append("language", "it");

      const response = await fetch("/api/voice-input/transcribe", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok || !payload?.transcript) {
        throw new Error(payload?.error || "Trascrizione audio non disponibile.");
      }

      return String(payload.transcript);
    } finally {
      setIsTranscribing(false);
    }
  }

  function handleAudioSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast.error("Allega un file audio valido.");
      return;
    }

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    setAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
  }

  function removeAudio() {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioPreviewUrl(null);
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function sendMessage() {
    if (!canSubmit) return;
    if (!domain) {
      toast.error("Dominio sito non rilevato.");
      return;
    }
    if (!siteId) {
      toast.error("Attendi: caricamento configurazione sito in corso.");
      return;
    }
    if (!requesterUserId) {
      toast.error("Contesto utente non disponibile. Ricarica la pagina.");
      return;
    }

    let effectiveMessage = input.trim();
    const fileToSend = audioFile;

    try {
      setIsSending(true);

      if (!effectiveMessage && fileToSend) {
        effectiveMessage = await transcribeAudio(fileToSend);
      }

      if (!effectiveMessage) {
        toast.error("Inserisci un messaggio o allega un audio trascrivibile.");
        return;
      }

      const userBubbleText = fileToSend
        ? `${effectiveMessage}\n\n[Audio allegato: ${fileToSend.name}]`
        : effectiveMessage;

      const userMessage = createMessage("user", activeAssistant, userBubbleText);
      setMessages((prev) => [...prev, userMessage]);
      setOpen(false);

      setInput("");
      removeAudio();

      const response = await fetch("/api/assistants/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: effectiveMessage,
          siteId,
          domain,
          pathname: pathname || "",
          userId: requesterUserId,
          moduleName: undefined,
          requestedAssistant: activeAssistant,
          audioAttachment: fileToSend
            ? {
                name: fileToSend.name,
                mimeType: fileToSend.type,
                size: fileToSend.size,
              }
            : null,
        }),
      });

      const payload = (await response.json()) as AssistantsChatResponse & {
        error?: string;
      };

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Risposta assistente non disponibile.");
      }

      const answer =
        payload?.response?.answer?.trim() ||
        "Ricevuto. Sto ancora completando il motore risposta.";

      const assistantMessage = createMessage(
        "assistant",
        payload.assistant || activeAssistant,
        answer
      );
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore chat assistente.");
      setMessages((prev) => [
        ...prev,
        createMessage(
          "system",
          activeAssistant,
          "Non riesco a completare la richiesta adesso. Riprova tra qualche istante."
        ),
      ]);
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter") return;
    if (event.shiftKey) return;
    event.preventDefault();
    void sendMessage();
  }

  if (!open) return assistantDock;

  return (
    <>
      {assistantDock}
      <div className="fixed right-4 top-[104px] z-50 w-[352px] max-w-[calc(100vw-1rem)] rounded-2xl border border-slate-700/80 bg-slate-950/95 text-slate-100 shadow-[0_24px_70px_rgba(2,6,23,0.72)] backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 overflow-hidden rounded-full border border-slate-600">
            <img
              src={assistantMeta.avatar}
              alt={`${assistantMeta.label} avatar`}
              className="h-full w-full object-cover"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{assistantMeta.label}</p>
            <p className="truncate text-[11px] text-slate-400">{assistantMeta.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-slate-600 text-[10px] text-slate-300">
            Chat AI
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => {
              setOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[52vh] min-h-[320px] overflow-y-auto px-3 py-3">
        <div className="space-y-2.5">
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                message.role === "user"
                  ? "ml-8 bg-slate-800 text-slate-100"
                  : message.role === "system"
                  ? "border border-amber-500/30 bg-amber-500/10 text-amber-100"
                  : "mr-8 border border-slate-700 bg-slate-900 text-slate-100"
              }`}
            >
              {message.content}
            </div>
          ))}

          {(isSending || isTranscribing) && (
            <div className="mr-8 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isTranscribing ? "Trascrivo audio..." : "Sto elaborando..."}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-slate-800/80 p-3">
        {audioFile && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300">
            <div className="min-w-0">
              <p className="truncate">{audioFile.name}</p>
              <p className="text-[10px] text-slate-400">
                {(audioFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={removeAudio}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioSelected}
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            onClick={() => fileInputRef.current?.click()}
            title="Allega audio"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onInputKeyDown}
            rows={1}
            placeholder={`Scrivi a ${assistantMeta.label}...`}
            className="min-h-[40px] max-h-[180px] resize-none border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
          />

          <Button
            type="button"
            className="h-10 w-10 shrink-0"
            onClick={() => void sendMessage()}
            disabled={!canSubmit}
            title="Invia"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Invio: Enter. Nuova riga: Shift+Enter.
        </p>
      </div>
      </div>
    </>
  );
}
