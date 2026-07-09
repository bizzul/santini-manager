"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { updateProjectNotes } from "@/app/(administration)/administration/projects/actions";

interface ProjectNotesFormProps {
  projectId: string;
  initialNotes: string | null;
}

export function ProjectNotesForm({
  projectId,
  initialNotes,
}: ProjectNotesFormProps) {
  const [notes, setNotes] = React.useState(initialNotes || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const router = useRouter();
  const isDirty = notes !== (initialNotes || "");

  async function handleSave() {
    setIsSaving(true);
    const result = await updateProjectNotes(projectId, notes);
    setIsSaving(false);
    if (!result.success) {
      toast.error("Salvataggio note non riuscito", {
        description: result.message,
      });
      return;
    }
    toast.success("Note aggiornate");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Note progetto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Referente cliente, prossima milestone, accordi..."
          rows={4}
        />
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          size="sm"
          variant="outline"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salva note
        </Button>
      </CardContent>
    </Card>
  );
}
