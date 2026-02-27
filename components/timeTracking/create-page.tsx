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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
  Wrench,
  X,
  List,
} from "lucide-react";
import { MyHoursList } from "./my-hours-list";
import { VoiceInputButton } from "./VoiceInputButton";

// Internal activity type from database
export interface InternalActivity {
  id: string;
  code: string;
  label: string;
  site_id: string | null;
  sort_order: number;
}

// Define types based on Supabase schema
interface Roles {
  id: number;
  name: string;
}

interface Task {
  id: number;
  unique_code?: string;
  title?: string;
  client?: {
    businessName?: string;
  };
}

interface TodayEntry {
  id: number;
  hours: number;
  minutes: number;
  totalTime: number;
  description?: string;
  activity_type?: string;
  internal_activity?: string;
  task?: {
    unique_code?: string;
    client?: {
      businessName?: string;
    };
  };
  roles?: {
    name?: string;
  }[];
  created_at: string;
}

// Extended type for all user entries (includes additional fields)
interface AllUserEntry extends TodayEntry {
  description_type?: string;
}

interface Session {
  user: {
    id: string;
    sub?: string; // Legacy support
    given_name?: string;
    family_name?: string;
    email?: string;
    user_metadata?: {
      name?: string;
      full_name?: string;
    };
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
  roles: Roles | {};
  userId: string;
  activityType: "project" | "internal";
  internalActivity?: string;
  lunchOffsite: boolean;
  lunchLocation: string;
}

const QUICK_TIMES = [
  { hours: 0, minutes: 30, label: "30m" },
  { hours: 1, minutes: 0, label: "1h" },
  { hours: 1, minutes: 30, label: "1h 30m" },
  { hours: 2, minutes: 0, label: "2h" },
  { hours: 4, minutes: 0, label: "4h" },
  { hours: 8, minutes: 0, label: "8h" },
];

// Ore obiettivo per giorno: Lun-Gio 9h, Ven 6h
function getWorkHoursTarget(): number {
  const day = new Date().getDay(); // 0=Dom, 1=Lun, ..., 5=Ven, 6=Sab
  return day === 5 ? 6 : 9; // Venerdì 6h, altri giorni 9h
}

const CreatePage = ({
  data,
  session,
  internalActivities = [],
  allUserEntries = [],
  domain,
  siteId,
}: {
  data: { roles: Roles[]; tasks: Task[]; todayEntries?: TodayEntry[] };
  session: Session;
  internalActivities?: InternalActivity[];
  allUserEntries?: AllUserEntry[];
  domain?: string;
  siteId?: string;
}) => {
  const [activeTab, setActiveTab] = useState("create");
  const rolesOptions = data.roles;
  const todayEntries = data.todayEntries || [];

  // Create a lookup map for activity labels
  const activityLabels = new Map(
    internalActivities.map((a) => [a.code, a.label])
  );
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(
    new Set()
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle selection for a single entry
  const toggleEntrySelection = (entryId: number) => {
    setSelectedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  // Select/deselect all entries
  const toggleAllEntries = () => {
    if (selectedEntries.size === todayEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(todayEntries.map((e) => e.id)));
    }
  };

  // Delete selected entries
  const handleDeleteSelected = async () => {
    if (selectedEntries.size === 0) return;

    const confirmDelete = window.confirm(
      `Sei sicuro di voler eliminare ${selectedEntries.size} registrazion${
        selectedEntries.size === 1 ? "e" : "i"
      }?`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/time-tracking/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedEntries) }),
      });

      if (!response.ok) {
        throw new Error("Errore durante l'eliminazione");
      }

      toast({
        description: `${selectedEntries.size} registrazion${
          selectedEntries.size === 1 ? "e eliminata" : "i eliminate"
        }`,
      });

      setSelectedEntries(new Set());
      // Reload page to refresh data
      window.location.reload();
    } catch (error) {
      logger.error("Error deleting entries:", error);
      toast({
        description: "Errore durante l'eliminazione. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate saved hours from today's entries
  const savedTodayMinutes = todayEntries.reduce((acc, entry) => {
    return acc + (entry.hours || 0) * 60 + (entry.minutes || 0);
  }, 0);
  const savedTodayHours = Math.floor(savedTodayMinutes / 60);
  const savedTodayRemaining = savedTodayMinutes % 60;

  const createEmptyRow = useCallback(
    (): TimeRow => ({
      task: "",
      taskLabel: "",
      start: "",
      end: "",
      hours: "",
      minutes: "",
      description: "",
      roles: {},
      userId: session.user.id,
      activityType: "project",
      internalActivity: undefined,
      lunchOffsite: false,
      lunchLocation: "",
    }),
    [session.user.id]
  );

  const [rows, setRows] = useState<TimeRow[]>([createEmptyRow()]);

  // Load from localStorage on mount
  useEffect(() => {
    const storedData = localStorage.getItem(`timetracking-${session.user.id}`);
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure each row has userId (might be missing from old localStorage data)
          const rowsWithUserId = parsed.map((row: TimeRow) => ({
            ...row,
            userId: row.userId || session.user.id,
          }));
          setRows(rowsWithUserId);
        }
      } catch {
        // Invalid data, start fresh
      }
    }
  }, [session.user.id]);

  // Calculate totals (including both new entries and saved entries)
  const calculateTotals = useCallback(() => {
    // Minutes from new entries being created
    let newMinutes = 0;
    rows.forEach((row) => {
      // Count both project and internal activities
      const hasActivity =
        row.activityType === "project" ? row.task : row.internalActivity;
      if (hasActivity) {
        newMinutes +=
          (parseInt(row.hours) || 0) * 60 + (parseInt(row.minutes) || 0);
      }
    });

    // Total includes both saved and new entries
    const totalMinutes = savedTodayMinutes + newMinutes;
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const targetMinutes = getWorkHoursTarget() * 60;
    const remainingToTarget = Math.max(0, targetMinutes - totalMinutes);
    const progress = Math.min(100, (totalMinutes / targetMinutes) * 100);

    return {
      totalHours,
      totalMinutes: remainingMinutes,
      remainingHours: Math.floor(remainingToTarget / 60),
      remainingMinutes: Math.round(remainingToTarget % 60),
      progress,
      totalInMinutes: totalMinutes,
      newMinutes,
      newHours: Math.floor(newMinutes / 60),
      newRemainingMinutes: newMinutes % 60,
    };
  }, [rows, savedTodayMinutes]);

  const totals = calculateTotals();

  // Get completed entries (rows with task or internal activity filled)
  const completedEntries = rows.filter((row) =>
    row.activityType === "project" ? row.task : row.internalActivity
  ).length;

  // Save to localStorage
  const handleSaveTemp = useCallback(() => {
    localStorage.setItem(
      `timetracking-${session.user.id}`,
      JSON.stringify(rows)
    );
    toast({ description: "Bozza salvata temporaneamente" });
  }, [rows, session.user.id, toast]);

  // Handle task selection for a row
  const handleTaskChange = (value: string, index: number) => {
    const selectedTask = data.tasks.find((t) => t.id.toString() === value);
    if (selectedTask) {
      const updatedRows = [...rows];
      const taskLabel = [selectedTask.unique_code, selectedTask.title || selectedTask.client?.businessName]
        .filter(Boolean)
        .join(" - ") || selectedTask.unique_code || "";
      updatedRows[index] = {
        ...updatedRows[index],
        task: selectedTask.unique_code || "",
        taskLabel,
      };
      setRows(updatedRows);
    }
  };

  // Handle activity type change
  const handleActivityTypeChange = (
    value: "project" | "internal",
    index: number
  ) => {
    const updatedRows = [...rows];
    updatedRows[index] = {
      ...updatedRows[index],
      activityType: value,
      // Clear the other field when switching
      task: value === "project" ? updatedRows[index].task : "",
      taskLabel: value === "project" ? updatedRows[index].taskLabel : "",
      internalActivity:
        value === "internal" ? updatedRows[index].internalActivity : undefined,
    };
    setRows(updatedRows);
  };

  // Handle internal activity change
  const handleInternalActivityChange = (value: string, index: number) => {
    const updatedRows = [...rows];
    updatedRows[index] = {
      ...updatedRows[index],
      internalActivity: value,
      taskLabel: activityLabels.get(value) || value,
    };
    setRows(updatedRows);
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

    if (lastRow.activityType === "project") {
      // Project requires both task and role
      if (!lastRow.task) {
        toast({
          description:
            "Seleziona un progetto prima di aggiungere una nuova registrazione",
          variant: "destructive",
        });
        return;
      }
      if (!lastRow.roles || Object.keys(lastRow.roles).length === 0) {
        toast({
          description:
            "Seleziona un reparto prima di aggiungere una nuova registrazione",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Internal activity only requires the activity type
      if (!lastRow.internalActivity) {
        toast({
          description:
            "Seleziona un'attività interna prima di aggiungere una nuova registrazione",
          variant: "destructive",
        });
        return;
      }
    }

    handleSaveTemp();
    setRows([...rows, createEmptyRow()]);
  };

  // Add row from voice input
  const handleAddFromVoice = useCallback(
    (entry: {
      task?: string;
      taskLabel?: string;
      hours: string;
      minutes: string;
      activityType: "project" | "internal";
      internalActivity?: string;
      description?: string;
    }) => {
      const taskLabel =
        entry.activityType === "internal" && entry.internalActivity
          ? activityLabels.get(entry.internalActivity) || entry.internalActivity
          : entry.taskLabel || entry.task || "";
      const newRow: TimeRow = {
        ...createEmptyRow(),
        task: entry.task || "",
        taskLabel,
        hours: entry.hours,
        minutes: entry.minutes,
        activityType: entry.activityType,
        internalActivity: entry.internalActivity,
        description: entry.description || "",
      };
      setRows((prev) => [...prev, newRow]);
      handleSaveTemp();
    },
    [createEmptyRow, activityLabels, handleSaveTemp]
  );

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (rows.length === 1) {
      setRows([createEmptyRow()]);
    } else {
      const newRows = rows.filter((_, i) => i !== index);
      setRows(newRows);
    }
    localStorage.setItem(
      `timetracking-${session.user.id}`,
      JSON.stringify(rows.filter((_, i) => i !== index))
    );
  };

  // Clear all
  const handleClearAll = () => {
    if (
      window.confirm("Sei sicuro di voler eliminare tutte le registrazioni?")
    ) {
      localStorage.removeItem(`timetracking-${session.user.id}`);
      setRows([createEmptyRow()]);
      toast({ description: "Tutte le registrazioni sono state eliminate" });
    }
  };

  // Submit all entries
  const handleSubmit = async () => {
    setIsSaved(true);

    // Filter rows that have either a task (for project) or internal activity (for internal)
    const validRows = rows.filter((row) =>
      row.activityType === "project" ? row.task : row.internalActivity
    );

    if (validRows.length === 0) {
      toast({
        description: "Devi avere almeno una registrazione da inviare",
        variant: "destructive",
      });
      setIsSaved(false);
      return;
    }

    // Check for missing roles only for project activities
    const hasMissingRoles = validRows.some(
      (row) =>
        row.activityType === "project" &&
        (!row.roles || Object.keys(row.roles).length === 0)
    );

    if (hasMissingRoles) {
      toast({
        description: "Seleziona un reparto per le registrazioni su progetto",
        variant: "destructive",
      });
      setIsSaved(false);
      return;
    }

    try {
      // Clean up roles and ensure userId is present
      const cleanedRows = validRows.map((row) => ({
        ...row,
        userId: row.userId || session.user.id,
        roles:
          row.roles && Object.keys(row.roles).length > 0
            ? row.roles
            : undefined,
      }));

      console.log("Sending timetracking data:", cleanedRows);

      const response = await fetch("/api/time-tracking/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(domain && { "x-site-domain": domain }),
        },
        body: JSON.stringify(cleanedRows),
      });

      const responseData = await response.json();

      if (!response.ok || responseData.error) {
        console.error("API Error:", responseData);
        throw new Error(
          responseData.error || responseData.details || "Errore sconosciuto"
        );
      }

      setIsSuccess(true);
      toast({
        description: `${validRows.length} registrazioni salvate! Totale: ${totals.totalHours}h ${totals.totalMinutes}m`,
      });

      setTimeout(() => {
        localStorage.removeItem(`timetracking-${session.user.id}`);
        window.location.reload();
      }, 3000);
    } catch (error) {
      logger.error("Error saving time tracking:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Errore nel salvataggio";
      toast({
        description: errorMessage,
        variant: "destructive",
      });
      setIsSaved(false);
    }
  };

  // Check if a row is complete (has activity, and role if project)
  const isRowComplete = (row: TimeRow) => {
    if (row.activityType === "project") {
      // Project requires both task and role
      return !!row.task && row.roles && Object.keys(row.roles).length > 0;
    } else {
      // Internal activity only requires the activity type
      return !!row.internalActivity;
    }
  };

  // Handle delete from MyHoursList
  const handleDeleteEntries = async (ids: number[]) => {
    const response = await fetch("/api/time-tracking/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    if (!response.ok) {
      throw new Error("Errore durante l'eliminazione");
    }

    // Reload page to refresh data
    window.location.reload();
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Tabs Navigation */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-2">
            <TabsList className="grid flex-1 grid-cols-2">
              <TabsTrigger value="create" className="gap-2">
                <Plus className="h-4 w-4" />
                Registra ore
              </TabsTrigger>
              <TabsTrigger value="my-hours" className="gap-2">
                <List className="h-4 w-4" />
                Le mie ore
                {allUserEntries.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {allUserEntries.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            {domain && siteId && activeTab === "create" && (
              <VoiceInputButton
                domain={domain}
                siteId={siteId}
                tasks={data.tasks}
                internalActivities={internalActivities}
                onAddEntry={handleAddFromVoice}
              />
            )}
          </div>

          {/* Create Tab Content */}
          <TabsContent value="create" className="mt-4 space-y-6">
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
                    {todayEntries.length > 0 && (
                      <span className="text-green-600">
                        {todayEntries.length} già salvat
                        {todayEntries.length === 1 ? "a" : "e"} •{" "}
                      </span>
                    )}
                    {completedEntries} nuov{completedEntries === 1 ? "a" : "e"}{" "}
                    da salvare
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
                <p className="text-sm text-muted-foreground mb-1">
                  Ore totali oggi
                </p>
                <p className="text-2xl font-bold text-primary">
                  {totals.totalHours}
                  <span className="text-lg font-normal">h </span>
                  {totals.totalMinutes}
                  <span className="text-lg font-normal">m</span>
                </p>
                {savedTodayMinutes > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    ({savedTodayHours}h {savedTodayRemaining}m già salvate)
                  </p>
                )}
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
                <span className="text-muted-foreground">
                  Progresso giornaliero
                </span>
                <span className="font-medium">
                  {Math.round(totals.progress)}%
                </span>
              </div>
              <Progress value={totals.progress} className="h-2" />
            </div>

            {/* Today's Saved Entries */}
            {todayEntries.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        selectedEntries.size === todayEntries.length &&
                        todayEntries.length > 0
                      }
                      onCheckedChange={toggleAllEntries}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Ore già salvate oggi
                    </label>
                  </div>
                  {selectedEntries.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                      className="h-7 px-2 text-xs"
                    >
                      {isDeleting ? (
                        <span className="animate-spin mr-1">⏳</span>
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1" />
                      )}
                      Elimina ({selectedEntries.size})
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {todayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        selectedEntries.has(entry.id)
                          ? "bg-red-500/10 border border-red-500/30"
                          : "bg-green-500/5"
                      }`}
                    >
                      <Checkbox
                        id={`entry-${entry.id}`}
                        checked={selectedEntries.has(entry.id)}
                        onCheckedChange={() => toggleEntrySelection(entry.id)}
                      />
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge
                            variant="outline"
                            className="text-xs bg-background shrink-0"
                          >
                            {entry.hours}h {entry.minutes}m
                          </Badge>
                          <span className="text-muted-foreground truncate">
                            {entry.activity_type === "internal"
                              ? activityLabels.get(
                                  entry.internal_activity || ""
                                ) || entry.internal_activity
                              : entry.task?.client?.businessName
                              ? `${entry.task.unique_code} - ${entry.task.client.businessName}`
                              : entry.task?.unique_code || "Progetto"}
                          </span>
                        </div>
                        {entry.roles?.[0]?.name && (
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0 ml-2"
                          >
                            {entry.roles[0].name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                {/* Activity Type Toggle */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo Attività</label>
                  <RadioGroup
                    value={row.activityType}
                    onValueChange={(v) =>
                      handleActivityTypeChange(
                        v as "project" | "internal",
                        index
                      )
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="project" id={`project-${index}`} />
                      <Label
                        htmlFor={`project-${index}`}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <Briefcase className="h-4 w-4" />
                        Progetto
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="internal"
                        id={`internal-${index}`}
                      />
                      <Label
                        htmlFor={`internal-${index}`}
                        className="flex items-center gap-1 cursor-pointer"
                      >
                        <Wrench className="h-4 w-4" />
                        Attività Interna
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Project/Internal Activity & Role Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {row.activityType === "project" ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          Progetto
                        </label>
                        <SearchSelect
                          value={
                            data.tasks
                              .find((t) => t.unique_code === row.task)
                              ?.id.toString() || ""
                          }
                          onValueChange={(v) =>
                            handleTaskChange(v.toString(), index)
                          }
                          placeholder="Seleziona progetto..."
                          options={data.tasks.map((t) => ({
                            value: t.id.toString(),
                            label: [t.unique_code, t.title || t.client?.businessName]
                              .filter(Boolean)
                              .join(" - ") || t.unique_code || "",
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
                              <SelectItem
                                key={role.id}
                                value={role.id.toString()}
                              >
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        Attività Interna
                      </label>
                      <Select
                        value={row.internalActivity || ""}
                        onValueChange={(v) =>
                          handleInternalActivityChange(v, index)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona attività..." />
                        </SelectTrigger>
                        <SelectContent>
                          {internalActivities.map((activity) => (
                            <SelectItem
                              key={activity.code}
                              value={activity.code}
                            >
                              {activity.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Time Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Tempo impiegato
                    </label>
                    {/* Display selected time */}
                    {(parseInt(row.hours) > 0 || parseInt(row.minutes) > 0) && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary font-semibold"
                      >
                        {parseInt(row.hours) > 0 && `${row.hours}h `}
                        {parseInt(row.minutes) > 0 && `${row.minutes}m`}
                        {parseInt(row.hours) === 0 &&
                          parseInt(row.minutes) === 0 &&
                          "0m"}
                      </Badge>
                    )}
                  </div>
                  {/* Quick time buttons */}
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TIMES.map((qt) => {
                      const isSelected =
                        parseInt(row.hours || "0") === qt.hours &&
                        parseInt(row.minutes || "0") === qt.minutes;
                      return (
                        <Button
                          key={qt.label}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className={`text-xs transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-md scale-105"
                              : "hover:bg-primary/10 hover:border-primary"
                          }`}
                          onClick={() =>
                            handleQuickTime(qt.hours, qt.minutes, index)
                          }
                        >
                          {qt.label}
                        </Button>
                      );
                    })}
                  </div>
                  {/* Manual input */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={row.hours}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "");
                            const updatedRows = [...rows];
                            updatedRows[index] = {
                              ...updatedRows[index],
                              hours: v === "" ? "" : String(Math.min(24, parseInt(v, 10) || 0)),
                            };
                            setRows(updatedRows);
                          }}
                          className="pr-10 text-center font-medium"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                          ore
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Select
                        value={row.minutes || "0"}
                        onValueChange={(v) => {
                          const updatedRows = [...rows];
                          updatedRows[index] = {
                            ...updatedRows[index],
                            minutes: v,
                          };
                          setRows(updatedRows);
                        }}
                      >
                        <SelectTrigger className="font-medium">
                          <SelectValue>{row.minutes || "0"} min</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">00 min</SelectItem>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="45">45 min</SelectItem>
                        </SelectContent>
                      </Select>
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
                      onChange={(e) =>
                        handleInputChange(e, index, "description")
                      }
                    />
                  </div>
                </div>

                {/* Lunch off-site */}
                <div className="mt-4 p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`lunch-${index}`}
                      checked={row.lunchOffsite}
                      onCheckedChange={(checked) => {
                        const updatedRows = [...rows];
                        updatedRows[index] = {
                          ...updatedRows[index],
                          lunchOffsite: checked as boolean,
                          lunchLocation: checked
                            ? updatedRows[index].lunchLocation
                            : "",
                        };
                        setRows(updatedRows);
                      }}
                    />
                    <Label
                      htmlFor={`lunch-${index}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      Pranzo fuori sede
                    </Label>
                  </div>
                  {row.lunchOffsite && (
                    <div className="mt-3">
                      <Input
                        placeholder="Inserisci il luogo del pranzo..."
                        value={row.lunchLocation}
                        onChange={(e) => {
                          const updatedRows = [...rows];
                          updatedRows[index] = {
                            ...updatedRows[index],
                            lunchLocation: e.target.value,
                          };
                          setRows(updatedRows);
                        }}
                      />
                    </div>
                  )}
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
      </TabsContent>

      {/* My Hours Tab Content */}
      <TabsContent value="my-hours" className="mt-4">
        <MyHoursList
          entries={allUserEntries}
          internalActivities={internalActivities}
          onDelete={handleDeleteEntries}
        />
      </TabsContent>
    </Tabs>
  </div>

      {/* Fixed Bottom Action Bar - Only show on create tab */}
      {activeTab === "create" && (
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
      )}
    </div>
  );
};

export default CreatePage;
