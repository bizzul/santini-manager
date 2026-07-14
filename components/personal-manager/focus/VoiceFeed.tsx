"use client";

import { useState } from "react";
import type { PmVoiceNoteWithChecklist } from "@/lib/personal-manager/voice-types";
import { ChecklistCard } from "@/components/personal-manager/focus/ChecklistCard";

type Props = {
  notes: PmVoiceNoteWithChecklist[];
  loading?: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "In coda",
  transcribing: "Trascrizione…",
  processing: "Elaborazione…",
  ready: "Pronta",
  error: "Errore",
};

export function VoiceFeed({ notes, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        Registra la tua prima nota
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notes.map((note) => (
        <VoiceNoteCard key={note.id} note={note} />
      ))}
    </ul>
  );
}

function VoiceNoteCard({ note }: { note: PmVoiceNoteWithChecklist }) {
  const [open, setOpen] = useState(false);
  const when = new Date(note.created_at).toLocaleString("it-CH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="rounded-2xl border border-border bg-card p-3.5 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{when}</div>
          <div className="text-sm font-semibold text-foreground">
            {STATUS_LABEL[note.status] ?? note.status}
          </div>
        </div>
        {note.summary && (
          <p className="max-w-[60%] text-right text-xs text-muted-foreground">
            {note.summary}
          </p>
        )}
      </div>

      {note.status === "error" && (
        <p className="mb-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          {note.error_message || "Errore di trascrizione"}
        </p>
      )}

      {note.transcription && (
        <div className="mb-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            {open ? "Nascondi trascrizione" : "Mostra trascrizione"}
          </button>
          {open && (
            <p className="mt-1.5 whitespace-pre-wrap rounded-xl bg-surface px-3 py-2 text-sm text-foreground/85">
              {note.transcription}
            </p>
          )}
        </div>
      )}

      <ChecklistCard
        voiceNoteId={note.id}
        items={note.pm_checklist_items ?? []}
      />
    </li>
  );
}
