"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { MetricsSummary } from "@/components/personal-manager/focus/MetricsSummary";
import { VoiceFeed } from "@/components/personal-manager/focus/VoiceFeed";
import { PmScreenHeader } from "@/components/personal-manager/MobileShell";
import { usePmContext } from "@/components/personal-manager/pm-context";
import type {
  FocusAreaTile,
  PmVoiceNoteWithChecklist,
} from "@/lib/personal-manager/voice-types";

/**
 * Schermata Voice-First: riepilogo aree + feed note vocali.
 * Nessuna tab bar dedicata oltre a MobileShell; bottone vocale nel layout.
 */
export function FocusScreen() {
  const { base } = usePmContext();
  const [areas, setAreas] = useState<FocusAreaTile[]>([]);
  const [notes, setNotes] = useState<PmVoiceNoteWithChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessione scaduta");
      setLoading(false);
      return;
    }

    const [{ data: aree }, { data: voiceNotes, error: notesErr }] =
      await Promise.all([
        supabase
          .from("aree_vita")
          .select("id, slug, nome, colore, punteggio, ordine")
          .eq("utente_id", user.id)
          .is("deleted_at", null)
          .order("ordine", { ascending: true })
          .limit(4),
        supabase
          .from("pm_voice_notes")
          .select(
            "*, pm_checklist_items(*, pm_entities(id, name, type))",
          )
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    if (notesErr) {
      // Tabelle non ancora migrate: non bloccare la UI
      console.warn("[FocusScreen]", notesErr.message);
    }

    setAreas((aree ?? []) as FocusAreaTile[]);

    const raw = (voiceNotes ?? []) as PmVoiceNoteWithChecklist[];
    setNotes(
      raw.map((n) => ({
        ...n,
        pm_checklist_items: (n.pm_checklist_items ?? [])
          .filter((i) => i.deleted_at == null)
          .sort((a, b) => a.position - b.position),
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("pm-focus-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pm_voice_notes" },
        () => {
          void load();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pm_checklist_items" },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <div>
      <PmScreenHeader
        title="Focus"
        subtitle="Riepilogo e note vocali"
        action={
          <div className="flex items-center gap-2">
            <Link
              href={base}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Vista completa
            </Link>
            <Link
              href={`${base}/settings`}
              aria-label="Impostazioni"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <MetricsSummary areas={areas} loading={loading} />

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Note vocali
        </h2>
        <VoiceFeed notes={notes} loading={loading} />
      </section>
    </div>
  );
}
