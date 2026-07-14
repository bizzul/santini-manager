"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Phase = "idle" | "recording" | "uploading";

/**
 * Bottone vocale Voice-First nel Manager Personale.
 * Idle 🎙️ / recording ⏹ con pulse; rispetta prefers-reduced-motion.
 * Angolo basso-destra riservato (sopra la tab bar).
 */
export function PmVoiceButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopAndUpload = useCallback(async () => {
    const recorder = mediaRef.current;
    if (!recorder) return;

    setPhase("uploading");
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });

    const blob = new Blob(chunksRef.current, {
      type: recorder.mimeType || "audio/webm",
    });
    chunksRef.current = [];
    mediaRef.current = null;

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessione scaduta");

      const path = `${user.id}/${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("pm-voice-notes")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (upErr) throw upErr;

      const { data: note, error: noteErr } = await supabase
        .from("pm_voice_notes")
        .insert({
          user_id: user.id,
          status: "pending",
          audio_path: path,
        })
        .select("id")
        .single();
      if (noteErr) throw noteErr;

      await supabase.functions.invoke("process-note", {
        body: { voice_note_id: note.id },
      });
    } catch (err) {
      console.error("[PmVoiceButton]", err);
    } finally {
      setPhase("idle");
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRef.current = recorder;
      recorder.start();
      setPhase("recording");
    } catch (err) {
      console.error("[PmVoiceButton] microfono:", err);
      setPhase("idle");
    }
  }, []);

  const onClick = () => {
    if (phase === "uploading") return;
    if (phase === "recording") {
      void stopAndUpload();
    } else {
      void startRecording();
    }
  };

  const isRec = phase === "recording";
  const label =
    phase === "uploading"
      ? "Caricamento…"
      : isRec
        ? "Interrompi registrazione"
        : "Registra nota vocale";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={phase === "uploading"}
      className={[
        "absolute bottom-[72px] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-xl text-primary-foreground shadow-lg",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        isRec ? "bg-destructive animate-pulse" : "bg-primary",
        phase === "uploading" ? "opacity-70" : "",
      ].join(" ")}
    >
      {phase === "uploading" ? "…" : isRec ? "⏹" : "🎙️"}
    </button>
  );
}
