"use client";

import React, { useState, useCallback, useRef } from "react";
import { Mic, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import type { ExtractedTimetracking } from "@/validation/voice-input/extracted-timetracking";

interface InternalActivity {
  id: string;
  code: string;
  label: string;
}

interface VoiceInputButtonProps {
  siteId: string;
  domain: string;
  onAddEntry: (entry: {
    task?: string;
    taskLabel?: string;
    hours: string;
    minutes: string;
    activityType: "project" | "internal";
    internalActivity?: string;
    description?: string;
  }) => void;
  tasks: { id: number; unique_code?: string; client?: { businessName?: string } }[];
  internalActivities?: InternalActivity[];
}

export function VoiceInputButton({
  siteId,
  domain,
  onAddEntry,
  tasks,
  internalActivities = [],
}: VoiceInputButtonProps) {
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    try {
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "it-IT";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let final = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            final += event.results[i][0].transcript;
          }
          setTranscript((prev) => prev + final);
        };
        recognition.onerror = (e: any) => setError(e.error || "Errore riconoscimento");
        recognition.start();
        recognitionRef.current = recognition;
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
        });
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          try {
            const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
            const formData = new FormData();
            formData.append("audio", blob, "audio.webm");
            formData.append("siteId", siteId);
            const res = await fetch("/api/voice-input/transcribe", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Errore trascrizione");
            if (data.transcript) setTranscript((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Errore trascrizione");
          }
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
      }
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permesso microfono negato");
    }
  }, [siteId]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  }, []);

  const handleExtractAndAdd = useCallback(async () => {
    if (!transcript.trim()) {
      toast({ variant: "destructive", description: "Registra prima qualcosa" });
      return;
    }
    setIsExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/voice-input/extract-timetracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, siteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore estrazione");
      const reg: ExtractedTimetracking = data.registrazione;
      const norm = (s: string) => (s || "").replace(/\s+/g, "-").toLowerCase();
      const projectCodeNorm = norm(reg.projectCode || "");
      const task = reg.projectCode
        ? tasks.find((t) => norm(t.unique_code || "") === projectCodeNorm)
        : null;
      const internalCode =
        reg.activityType === "internal" && reg.internalActivity
          ? internalActivities.find(
              (a) =>
                norm(a.code) === norm(reg.internalActivity || "") ||
                norm(a.label).includes(norm(reg.internalActivity || ""))
            )?.code ?? reg.internalActivity
          : undefined;
      onAddEntry({
        task: task?.unique_code || reg.projectCode || "",
        taskLabel: task?.client?.businessName
          ? `${task.unique_code} - ${task.client.businessName}`
          : task?.unique_code || reg.projectCode || "",
        hours: String(reg.hours),
        minutes: String(reg.minutes),
        activityType: reg.activityType,
        internalActivity: internalCode || reg.internalActivity || undefined,
        description: reg.description || undefined,
      });
      toast({ description: "Registrazione aggiunta" });
      setOpen(false);
      setTranscript("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
      toast({ variant: "destructive", description: "Errore durante l'estrazione" });
    } finally {
      setIsExtracting(false);
    }
  }, [transcript, siteId, tasks, onAddEntry, toast]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (isRecording) stopRecording();
      setTranscript("");
      setError(null);
    }
    setOpen(newOpen);
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        title="Registra ore con la voce"
      >
        <Mic className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registra ore con la voce</DialogTitle>
            <DialogDescription>
              Parla per registrare le ore. Es: &quot;2 ore sul progetto 25-090&quot; o &quot;1 ora e 30 minuti attività interna ufficio&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              {!isRecording ? (
                <Button onClick={startRecording} className="flex-1">
                  <Mic className="h-4 w-4 mr-2" />
                  Avvia registrazione
                </Button>
              ) : (
                <Button onClick={stopRecording} variant="destructive" className="flex-1">
                  Stop
                </Button>
              )}
            </div>
            {transcript && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Trascrizione:</p>
                <p>{transcript}</p>
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleExtractAndAdd} disabled={!transcript.trim() || isExtracting}>
              {isExtracting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Estrai e aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
