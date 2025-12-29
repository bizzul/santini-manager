"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "../ui/use-toast";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { SearchSelect } from "../ui/search-select";
import { logger } from "@/lib/logger";
import {
  Clock,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Briefcase,
  Timer,
  MessageSquare,
  Tag,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Define types based on Supabase schema
interface Roles {
  id: number;
  name: string;
}

interface Task {
  id: number;
  unique_code?: string;
  client?: {
    businessName?: string;
  };
}

interface Session {
  user: {
    sub: string;
    given_name?: string;
    family_name?: string;
  };
}

interface TimeRow {
  task: string;
  taskLabel?: string;
  start: string;
  end: string;
  hours: string;
  minutes: string;
  description: string;
  descriptionCat: string;
  roles: Roles | {};
  userId: string;
}

const QUICK_TIMES = [
  { hours: 0, minutes: 30, label: "30m" },
  { hours: 1, minutes: 0, label: "1h" },
  { hours: 1, minutes: 30, label: "1h 30m" },
  { hours: 2, minutes: 0, label: "2h" },
  { hours: 4, minutes: 0, label: "4h" },
  { hours: 8, minutes: 0, label: "8h" },
];

const WORK_HOURS_TARGET = 8.5; // 8h 30m

const CreatePage = ({
  data,
  session,
}: {
  data: { roles: Roles[]; tasks: Task[] };
  session: Session;
}) => {
  const rolesOptions = data.roles;
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const createEmptyRow = useCallback(
    (): TimeRow => ({
      task: "",
      taskLabel: "",
      start: "",
      end: "",
      hours: "",
      minutes: "",
      description: "",
      descriptionCat: "",
      roles: {},
      userId: session.user.sub,
    }),
    [session.user.sub]
  );

  const [rows, setRows] = useState<TimeRow[]>([createEmptyRow()]);

  // Load from localStorage on mount
  useEffect(() => {
    const storedData = localStorage.getItem(
      `timetracking-${session.user.sub}`
    );
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed);
        }
      } catch {
        // Invalid data, start fresh
      }
    }
  }, [session.user.sub]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    let totalMinutes = 0;
    rows.forEach((row) => {
      if (row.task) {
        totalMinutes += (parseInt(row.hours) || 0) * 60 + (parseInt(row.minutes) || 0);
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const targetMinutes = WORK_HOURS_TARGET * 60;
    const remainingToTarget = Math.max(0, targetMinutes - totalMinutes);
    const progress = Math.min(100, (totalMinutes / targetMinutes) * 100);

    return {
      totalHours,
      totalMinutes: remainingMinutes,
      remainingHours: Math.floor(remainingToTarget / 60),
      remainingMinutes: Math.round(remainingToTarget % 60),
      progress,
      totalInMinutes: totalMinutes,
    };
  }, [rows]);

  const totals = calculateTotals();

  // Get completed entries (rows with task filled)
  const completedEntries = rows.filter((row) => row.task).length;

  // Save to localStorage
  const handleSaveTemp = useCallback(() => {
    localStorage.setItem(
      `timetracking-${session.user.sub}`,
      JSON.stringify(rows)
    );
    toast({ description: "Bozza salvata temporaneamente" });
  }, [rows, session.user.sub, toast]);

  // Handle task selection for a row
  const handleTaskChange = (value: string, index: number) => {
    const selectedTask = data.tasks.find((t) => t.id.toString() === value);
    if (selectedTask) {
      const updatedRows = [...rows];
      updatedRows[index] = {
        ...updatedRows[index],
        task: selectedTask.unique_code || "",
        taskLabel: selectedTask.client?.businessName
          ? `${selectedTask.unique_code} - ${selectedTask.client.businessName}`
          : selectedTask.unique_code || "",
      };
      setRows(updatedRows);
    }
  };

  // Handle role selection
  const handleRoleChange = (value: string, index: number) => {
    const selectedRole = rolesOptions.find((r) => r.id.toString() === value);
    if (selectedRole) {
      const updatedRows = [...rows];
      updatedRows[index] = {
        ...updatedRows[index],
        roles: selectedRole,
      };
      setRows(updatedRows);
    }
  };

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof TimeRow
  ) => {
    const updatedRows = [...rows];
    updatedRows[index] = {
      ...updatedRows[index],
      [field]: e.target.value,
    };
    setRows(updatedRows);
  };

  // Handle description category change
  const handleDescCatChange = (value: string, index: number) => {
    const updatedRows = [...rows];
    updatedRows[index] = {
      ...updatedRows[index],
      descriptionCat: value,
    };
    setRows(updatedRows);
  };

  // Quick time selection
  const handleQuickTime = (hours: number, minutes: number, index: number) => {
    const updatedRows = [...rows];
    updatedRows[index] = {
      ...updatedRows[index],
      hours: hours.toString(),
      minutes: minutes.toString(),
    };
    setRows(updatedRows);
  };

  // Add new row
  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];

    if (!lastRow.task) {
      toast({
        description: "Seleziona un progetto prima di aggiungere una nuova registrazione",
        variant: "destructive",
      });
      return;
    }

    if (!lastRow.roles || Object.keys(lastRow.roles).length === 0) {
      toast({
        description: "Seleziona un reparto prima di aggiungere una nuova registrazione",
        variant: "destructive",
      });
      return;
    }

    handleSaveTemp();
    setRows([...rows, createEmptyRow()]);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (rows.length === 1) {
      setRows([createEmptyRow()]);
    } else {
      const newRows = rows.filter((_, i) => i !== index);
      setRows(newRows);
    }
    localStorage.setItem(
      `timetracking-${session.user.sub}`,
      JSON.stringify(rows.filter((_, i) => i !== index))
    );
  };

  // Clear all
  const handleClearAll = () => {
    if (window.confirm("Sei sicuro di voler eliminare tutte le registrazioni?")) {
      localStorage.removeItem(`timetracking-${session.user.sub}`);
      setRows([createEmptyRow()]);
      toast({ description: "Tutte le registrazioni sono state eliminate" });
    }
  };

  // Submit all entries
  const handleSubmit = async () => {
    setIsSaved(true);

    const validRows = rows.filter((row) => row.task);

    if (validRows.length === 0) {
      toast({
        description: "Devi avere almeno una registrazione da inviare",
        variant: "destructive",
      });
      setIsSaved(false);
      return;
    }

    // Check for missing roles
    const hasMissingRoles = validRows.some(
      (row) => !row.roles || Object.keys(row.roles).length === 0
    );

    if (hasMissingRoles) {
      toast({
        description: "Seleziona un reparto per tutte le registrazioni",
        variant: "destructive",
      });
      setIsSaved(false);
      return;
    }

    try {
      const response = await fetch("/api/time-tracking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validRows),
      });

      if (!response.ok) throw new Error("Network error");

      const responseData = await response.json();
      if (responseData.error) {
        throw new Error(responseData.error);
      }

      setIsSuccess(true);
      toast({
        description: `${validRows.length} registrazioni salvate! Totale: ${totals.totalHours}h ${totals.totalMinutes}m`,
      });

      setTimeout(() => {
        localStorage.removeItem(`timetracking-${session.user.sub}`);
        window.location.reload();
      }, 3000);
    } catch (error) {
      logger.error("Error saving time tracking:", error);
      toast({
        description: "Errore nel salvataggio. Riprova.",
        variant: "destructive",
      });
      setIsSaved(false);
    }
  };

  const isRowComplete = (row: TimeRow) =>
    row.task && row.roles && Object.keys(row.roles).length > 0;

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Summary Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Timer className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Riepilogo giornata</CardTitle>
                  <CardDescription>
                    {completedEntries} registrazion{completedEntries === 1 ? "e" : "i"} completat{completedEntries === 1 ? "a" : "e"}
                  </CardDescription>
                </div>
              </div>
              {isSuccess && (
                <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Salvato
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/60 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground mb-1">Ore registrate</p>
                <p className="text-2xl font-bold text-primary">
                  {totals.totalHours}
                  <span className="text-lg font-normal">h </span>
                  {totals.totalMinutes}
                  <span className="text-lg font-normal">m</span>
                </p>
              </div>
              <div className="bg-background/60 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-sm text-muted-foreground mb-1">Rimanenti</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {totals.remainingHours}
                  <span className="text-lg font-normal">h </span>
                  {totals.remainingMinutes}
                  <span className="text-lg font-normal">m</span>
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso giornaliero</span>
                <span className="font-medium">{Math.round(totals.progress)}%</span>
              </div>
              <Progress value={totals.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Time Entries */}
        <div className="space-y-4">
          {rows.map((row, index) => (
            <Card
              key={index}
              className={`transition-all duration-300 ${
                isRowComplete(row)
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isRowComplete(row)
                          ? "bg-green-500/20 text-green-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isRowComplete(row) ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {row.taskLabel || row.task || "Nuova registrazione"}
                      </CardTitle>
                      {(row.roles as Roles)?.name && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {(row.roles as Roles).name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project & Role Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      Progetto
                    </label>
                    <SearchSelect
                      value={
                        data.tasks.find((t) => t.unique_code === row.task)?.id.toString() || ""
                      }
                      onValueChange={(v) => handleTaskChange(v.toString(), index)}
                      placeholder="Seleziona progetto..."
                      options={data.tasks.map((t) => ({
                        value: t.id.toString(),
                        label: t.client?.businessName
                          ? `${t.unique_code} - ${t.client.businessName}`
                          : t.unique_code || "",
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Reparto
                    </label>
                    <Select
                      value={(row.roles as Roles)?.id?.toString() || ""}
                      onValueChange={(v) => handleRoleChange(v, index)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona reparto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {rolesOptions.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Time Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Tempo impiegato
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {QUICK_TIMES.map((qt) => (
                      <Button
                        key={qt.label}
                        variant="outline"
                        size="sm"
                        className={`text-xs ${
                          row.hours === qt.hours.toString() &&
                          row.minutes === qt.minutes.toString()
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }`}
                        onClick={() => handleQuickTime(qt.hours, qt.minutes, index)}
                      >
                        {qt.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          max="24"
                          value={row.hours}
                          onChange={(e) => handleInputChange(e, index, "hours")}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          h
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          max="59"
                          value={row.minutes}
                          onChange={(e) => handleInputChange(e, index, "minutes")}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          m
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Commento
                    </label>
                    <Input
                      placeholder="Descrizione attività..."
                      value={row.description}
                      onChange={(e) => handleInputChange(e, index, "description")}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      Tipologia
                    </label>
                    <Select
                      value={row.descriptionCat}
                      onValueChange={(v) => handleDescCatChange(v, index)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipologia..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nessuna">Nessuna</SelectItem>
                        <SelectItem value="Logistica">Logistica</SelectItem>
                        <SelectItem value="Speciale">Speciale</SelectItem>
                        <SelectItem value="Errore">Errore</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Row Button */}
        <Button
          variant="outline"
          className="w-full border-dashed border-2 h-14 text-muted-foreground hover:text-foreground hover:border-primary"
          onClick={handleAddRow}
        >
          <Plus className="h-5 w-5 mr-2" />
          Aggiungi registrazione
        </Button>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-50">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClearAll}
            disabled={isSaved}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Azzera
          </Button>
          <Button
            className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            onClick={handleSubmit}
            disabled={isSaved || completedEntries === 0}
          >
            {isSaved ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salva ({completedEntries})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
