"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { formatMinutesAsHours } from "@/components/calendar/calendar-utils";
import type {
  AssignedTaskOption,
  CollaboratorRoleOption,
} from "@/app/sites/[domain]/area-collaboratore/page";

interface HoursEntryFormProps {
  domain: string;
  siteId: string;
  userAuthId: string;
  assignedTasks: AssignedTaskOption[];
  roles: CollaboratorRoleOption[];
}

interface MyEntry {
  id: number;
  hours: number | null;
  minutes: number | null;
  totalTime: number | null;
  description: string | null;
  created_at: string;
  task?: { unique_code?: string | null } | null;
}

export function HoursEntryForm({
  domain,
  siteId,
  userAuthId,
  assignedTasks,
  roles,
}: HoursEntryFormProps) {
  const [taskCode, setTaskCode] = useState<string>("");
  const [roleId, setRoleId] = useState<string>("");
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("0");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [entries, setEntries] = useState<MyEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  const loadEntries = useCallback(async () => {
    setIsLoadingEntries(true);
    try {
      const response = await fetch("/api/time-tracking/my-entries", {
        headers: { "x-site-id": siteId },
      });
      const data = await response.json();
      setEntries(Array.isArray(data?.entries) ? data.entries : []);
    } catch (error) {
      console.error("Failed to load my time entries:", error);
    } finally {
      setIsLoadingEntries(false);
    }
  }, [siteId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const canSubmit = useMemo(() => {
    const h = Number(hours);
    const m = Number(minutes);
    const totalMinutes = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
    return Boolean(taskCode) && Boolean(roleId) && totalMinutes > 0 && !isSubmitting;
  }, [hours, isSubmitting, minutes, roleId, taskCode]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!canSubmit) return;

      const selectedRole = roles.find((role) => String(role.id) === roleId);
      if (!selectedRole) {
        toast.error("Seleziona un reparto valido");
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/time-tracking/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-site-id": siteId,
            "x-site-domain": domain,
          },
          body: JSON.stringify([
            {
              description: description.trim() || undefined,
              hours: Number(hours) || 0,
              minutes: Number(minutes) || 0,
              task: taskCode,
              userId: userAuthId,
              roles: { id: selectedRole.id, name: selectedRole.name },
              activityType: "project",
            },
          ]),
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => null);
          throw new Error(detail?.error || "Salvataggio non riuscito");
        }

        toast.success("Ore registrate", {
          description: `${taskCode}: ${formatMinutesAsHours(
            (Number(hours) || 0) * 60 + (Number(minutes) || 0)
          )}.`,
        });

        setHours("");
        setMinutes("0");
        setDescription("");
        void loadEntries();
      } catch (error) {
        console.error("Failed to create time entry:", error);
        toast.error("Impossibile registrare le ore", {
          description:
            error instanceof Error ? error.message : "Riprova più tardi.",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      canSubmit,
      description,
      domain,
      hours,
      loadEntries,
      minutes,
      roleId,
      roles,
      siteId,
      taskCode,
      userAuthId,
    ]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inserisci ore</CardTitle>
        </CardHeader>
        <CardContent>
          {assignedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Non risultano progetti assegnati a te. Le ore possono essere
              registrate solo sui progetti a cui sei assegnato.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="task">Progetto</Label>
                <Select value={taskCode} onValueChange={setTaskCode}>
                  <SelectTrigger id="task">
                    <SelectValue placeholder="Seleziona un progetto" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedTasks.map((task) => (
                      <SelectItem key={task.uniqueCode} value={task.uniqueCode}>
                        {task.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Reparto</Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Seleziona un reparto" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hours">Ore</Label>
                  <Input
                    id="hours"
                    type="number"
                    min={0}
                    max={24}
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minutes">Minuti</Label>
                  <Input
                    id="minutes"
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={minutes}
                    onChange={(event) => setMinutes(event.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Nota (opzionale)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descrizione dell'attività svolta"
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
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Le mie ore recenti</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingEntries ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Caricamento...
            </div>
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nessuna ora registrata.
            </p>
          ) : (
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {entries.slice(0, 30).map((entry) => {
                const totalMinutes =
                  (entry.hours || 0) * 60 + (entry.minutes || 0);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {entry.task?.unique_code || "Attività"}
                      </p>
                      {entry.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                      {formatMinutesAsHours(totalMinutes)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
