"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { logProjectHours } from "@/app/(administration)/administration/projects/actions";

interface ProjectHoursFormProps {
  projectId: string;
}

export function ProjectHoursForm({ projectId }: ProjectHoursFormProps) {
  const [hours, setHours] = React.useState("");
  const [minutes, setMinutes] = React.useState("0");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const router = useRouter();

  const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const canSubmit = totalMinutes > 0 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    const result = await logProjectHours({
      projectId,
      hours: Number(hours) || 0,
      minutes: Number(minutes) || 0,
      description,
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error("Impossibile registrare le ore", {
        description: result.message,
      });
      return;
    }
    toast.success("Ore registrate sul progetto");
    setHours("");
    setMinutes("0");
    setDescription("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Registra ore di gestione</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="project-hours">Ore</Label>
              <Input
                id="project-hours"
                type="number"
                min={0}
                max={24}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-minutes">Minuti</Label>
              <Input
                id="project-minutes"
                type="number"
                min={0}
                max={59}
                step={5}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-description">Nota (opzionale)</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Attività svolta sul progetto"
              rows={3}
            />
          </div>
          <Button type="submit" disabled={!canSubmit} className="w-full">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Registra ore
          </Button>
          <p className="text-xs text-muted-foreground">
            Le ore vengono salvate nel modulo ore dello spazio come attività
            interna &quot;gestione_progetto&quot;, così restano distinguibili
            dalle ore operative.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
