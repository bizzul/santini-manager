"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { WHISPER_SAFE_MAX_FILE_BYTES } from "@/lib/speech/server/types";

type SpeechProvider = "web-speech" | "whisper";
type AiProvider = "openai" | "anthropic" | string;

interface SiteAiSettings {
  speechProvider: SpeechProvider;
  aiProvider: AiProvider;
  hasAiApiKey: boolean;
  hasWhisperApiKey: boolean;
}

export interface VoiceDictationButtonProps {
  siteId: string;
  domain: string;
  /** Called when the user confirms the transcribed text */
  onTranscript: (text: string) => void;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Button title tooltip */
  buttonTitle?: string;
  /** Button variant */
  variant?: "outline" | "ghost" | "default";
  /** Button size */
  size?: "default" | "sm" | "icon";
  className?: string;
}

function canUseWhisper(settings: SiteAiSettings | null): boolean {
  if (!settings || settings.speechProvider !== "whisper") {
    return false;
  }

  if (settings.hasWhisperApiKey) {
    return true;
  }

  return settings.aiProvider === "openai" && settings.hasAiApiKey;
}

export function VoiceDictationButton({
  siteId,
  domain,
  onTranscript,
  title = "Dettatura vocale",
  description = "Parla per dettare il testo. Potrai rivederlo prima di confermare.",
  buttonTitle = "Dettatura vocale",
  variant = "outline",
  size = "icon",
  className,
}: VoiceDictationButtonProps) {
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteAiSettings | null>(null);
  const [whisperProcessing, setWhisperProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const { toast } = useToast();

  const useWhisper = canUseWhisper(siteSettings);

  useEffect(() => {
    if (open && domain) {
      fetch(`/api/sites/${domain}/ai-settings`)
        .then((res) => res.json())
        .then((data) => {
          setSiteSettings({
            speechProvider: data.speechProvider || "web-speech",
            aiProvider: data.aiProvider || "openai",
            hasAiApiKey: data.hasAiApiKey || false,
            hasWhisperApiKey: data.hasWhisperApiKey || false,
          });
        })
        .catch(() => {
          setSiteSettings({
            speechProvider: "web-speech",
            aiProvider: "openai",
            hasAiApiKey: false,
            hasWhisperApiKey: false,
          });
        });
    }
  }, [open, domain]);

  const startWebSpeechRecording = useCallback(() => {
    setError(null);
    setTranscript("");

    const win = window as Window & {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((event: {
          resultIndex: number;
          results: Array<{ isFinal: boolean; 0: { transcript: string } }>;
        }) => void) | null;
        onerror: ((event: { error?: string }) => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: Window["SpeechRecognition"];
    };

    const SpeechRecognitionCtor =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setError("Web Speech API non supportata in questo browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "it-IT";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }
      if (final) {
        setTranscript((prev) => (prev ? `${prev} ${final}` : final));
      }
    };

    recognition.onerror = (e) => {
      setError(e.error || "Errore riconoscimento");
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, []);

  const startWhisperRecording = useCallback(async () => {
    setError(null);
    setTranscript("");

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          "Microfono non disponibile. Usa HTTPS e un browser che supporta l'accesso al microfono.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setWhisperProcessing(true);

        try {
          const blob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType,
          });

          if (blob.size > WHISPER_SAFE_MAX_FILE_BYTES) {
            throw new Error(
              "Il file audio supera il limite di 25 MB di Whisper. Registra un audio piu' breve.",
            );
          }

          const formData = new FormData();
          formData.append("audio", blob, "audio.webm");
          formData.append("siteId", siteId);
          formData.append("language", "it");

          const res = await fetch("/api/voice-input/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || data.error || "Errore trascrizione");
          }

          if (data.transcript) {
            setTranscript((prev) =>
              prev ? `${prev} ${data.transcript}` : data.transcript,
            );
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Errore trascrizione");
        } finally {
          setWhisperProcessing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Permesso microfono negato",
      );
    }
  }, [siteId]);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");

    try {
      if (useWhisper) {
        await startWhisperRecording();
      } else if (
        (window as Window & { webkitSpeechRecognition?: unknown })
          .SpeechRecognition ||
        (window as Window & { webkitSpeechRecognition?: unknown })
          .webkitSpeechRecognition
      ) {
        startWebSpeechRecording();
      } else {
        await startWhisperRecording();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Permesso microfono negato",
      );
    }
  }, [useWhisper, startWebSpeechRecording, startWhisperRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
    }

    setIsRecording(false);
  }, []);

  const handleConfirm = useCallback(() => {
    const text = transcript.trim();
    if (!text) {
      toast({ variant: "destructive", description: "Registra prima qualcosa" });
      return;
    }

    onTranscript(text);
    setOpen(false);
    setTranscript("");
    setError(null);
    toast({ description: "Testo inserito nel campo" });
  }, [transcript, onTranscript, toast]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (isRecording) {
        stopRecording();
      }
      setTranscript("");
      setError(null);
    }
    setOpen(newOpen);
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title={buttonTitle}
        aria-label={buttonTitle}
      >
        <Mic className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Badge variant="secondary">
              {useWhisper ? "Whisper (OpenAI)" : "Web Speech API"}
            </Badge>

            <div className="flex gap-2">
              {!isRecording ? (
                <Button
                  type="button"
                  onClick={startRecording}
                  className="flex-1"
                  disabled={whisperProcessing}
                >
                  {whisperProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="mr-2 h-4 w-4" />
                  )}
                  Avvia registrazione
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={stopRecording}
                  variant="destructive"
                  className="flex-1"
                >
                  Stop
                </Button>
              )}
            </div>

            {useWhisper && !isRecording && !transcript && (
              <p className="text-xs text-muted-foreground">
                Con Whisper la trascrizione avviene dopo aver fermato la
                registrazione.
              </p>
            )}

            {transcript && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <p className="mb-1 text-xs text-muted-foreground">
                  Anteprima trascrizione:
                </p>
                <p>{transcript}</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={
                !transcript.trim() ||
                isRecording ||
                whisperProcessing
              }
            >
              Inserisci nel campo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
