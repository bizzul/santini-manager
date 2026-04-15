"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

type AssistanceLevel = "basic_tutorial" | "smart_support" | "advanced_support";

interface AssistanceLevelSelectorProps {
  userId: string;
  initialLevel: AssistanceLevel;
  disabled?: boolean;
}

export default function AssistanceLevelSelector({
  userId,
  initialLevel,
  disabled = false,
}: AssistanceLevelSelectorProps) {
  const { toast } = useToast();
  const [selectedLevel, setSelectedLevel] = useState<AssistanceLevel>(initialLevel);
  const [saving, setSaving] = useState(false);

  const hasChanges = selectedLevel !== initialLevel;

  const save = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/users/${userId}/assistance-level`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assistanceLevel: selectedLevel }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Impossibile aggiornare livello assistenza");
      }

      toast({
        title: "Livello assistenza aggiornato",
        description: "Impostazione salvata con successo.",
      });
      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante aggiornamento livello assistenza",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedLevel}
        onValueChange={(value) => setSelectedLevel(value as AssistanceLevel)}
        disabled={disabled || saving}
      >
        <SelectTrigger className="w-[210px] border-white/30 bg-white/10 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="basic_tutorial">Livello A - Tutorial</SelectItem>
          <SelectItem value="smart_support">Livello B - Supporto</SelectItem>
          <SelectItem value="advanced_support">Livello C - Advanced</SelectItem>
        </SelectContent>
      </Select>

      <Button
        size="sm"
        type="button"
        onClick={save}
        disabled={!hasChanges || disabled || saving}
        className="border border-white/30 bg-white/15 text-white hover:bg-white/25"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Save className="h-4 w-4 mr-1" />
            Salva
          </>
        )}
      </Button>
    </div>
  );
}
