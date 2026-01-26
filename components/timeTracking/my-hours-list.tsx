"use client";
import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Clock,
  Calendar,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Wrench,
  X,
} from "lucide-react";
import { InternalActivity } from "./create-page";

// Types
interface TimetrackingEntry {
  id: number;
  hours: number;
  minutes: number;
  totalTime: number;
  description?: string;
  description_type?: string;
  activity_type?: string;
  internal_activity?: string;
  created_at: string;
  task?: {
    unique_code?: string;
    client?: {
      businessName?: string;
    };
  };
  roles?: {
    id?: number;
    name?: string;
  }[];
}

interface MyHoursListProps {
  entries: TimetrackingEntry[];
  internalActivities: InternalActivity[];
  onDelete?: (ids: number[]) => Promise<void>;
}

const ITEMS_PER_PAGE = 10;

export const MyHoursList: React.FC<MyHoursListProps> = ({
  entries,
  internalActivities,
  onDelete,
}) => {
  const { toast } = useToast();
  
  // Filters state
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Create activity labels lookup
  const activityLabels = useMemo(
    () => new Map(internalActivities.map((a) => [a.code, a.label])),
    [internalActivities]
  );

  // Get unique projects for filter
  const uniqueProjects = useMemo(() => {
    const projects = new Set<string>();
    entries.forEach((entry) => {
      if (entry.activity_type === "project" && entry.task?.unique_code) {
        const label = entry.task.client?.businessName
          ? `${entry.task.unique_code} - ${entry.task.client.businessName}`
          : entry.task.unique_code;
        projects.add(label);
      }
    });
    return Array.from(projects).sort();
  }, [entries]);

  // Get unique internal activities for filter
  const uniqueInternalActivities = useMemo(() => {
    const activities = new Set<string>();
    entries.forEach((entry) => {
      if (entry.activity_type === "internal" && entry.internal_activity) {
        activities.add(entry.internal_activity);
      }
    });
    return Array.from(activities);
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Date filter
      if (dateFrom) {
        const entryDate = new Date(entry.created_at);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (entryDate < fromDate) return false;
      }
      if (dateTo) {
        const entryDate = new Date(entry.created_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (entryDate > toDate) return false;
      }

      // Activity type filter
      if (activityTypeFilter !== "all") {
        if (entry.activity_type !== activityTypeFilter) return false;
      }

      // Project/Activity filter
      if (projectFilter !== "all") {
        if (entry.activity_type === "project") {
          const label = entry.task?.client?.businessName
            ? `${entry.task?.unique_code} - ${entry.task.client.businessName}`
            : entry.task?.unique_code || "";
          if (label !== projectFilter) return false;
        } else if (entry.activity_type === "internal") {
          if (entry.internal_activity !== projectFilter) return false;
        }
      }

      return true;
    });
  }, [entries, dateFrom, dateTo, activityTypeFilter, projectFilter]);

  // Sort by date descending
  const sortedEntries = useMemo(
    () =>
      [...filteredEntries].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [filteredEntries]
  );

  // Pagination
  const totalPages = Math.ceil(sortedEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedEntries, currentPage]);

  // Calculate totals for filtered entries
  const filteredTotals = useMemo(() => {
    const totalMinutes = filteredEntries.reduce(
      (acc, entry) => acc + (entry.hours || 0) * 60 + (entry.minutes || 0),
      0
    );
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      count: filteredEntries.length,
    };
  }, [filteredEntries]);

  // Selection handlers
  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedEntries.map((e) => e.id)));
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (selectedIds.size === 0 || !onDelete) return;

    const confirmDelete = window.confirm(
      `Sei sicuro di voler eliminare ${selectedIds.size} registrazion${
        selectedIds.size === 1 ? "e" : "i"
      }?`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(Array.from(selectedIds));
      toast({
        description: `${selectedIds.size} registrazion${
          selectedIds.size === 1 ? "e eliminata" : "i eliminate"
        }`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        description: "Errore durante l'eliminazione. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setActivityTypeFilter("all");
    setProjectFilter("all");
    setCurrentPage(1);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const hasActiveFilters = dateFrom || dateTo || activityTypeFilter !== "all" || projectFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Le mie ore</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {filteredTotals.count} registrazion{filteredTotals.count === 1 ? "e" : "i"}
                  {hasActiveFilters && " (filtrate)"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {filteredTotals.hours}
                <span className="text-lg font-normal">h </span>
                {filteredTotals.minutes}
                <span className="text-lg font-normal">m</span>
              </p>
              <p className="text-xs text-muted-foreground">Totale ore filtrate</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtri
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {[dateFrom, dateTo, activityTypeFilter !== "all", projectFilter !== "all"].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Cancella filtri
              </Button>
            )}
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0 space-y-4">
            {/* Date filters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Dal
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Al
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9"
                />
              </div>
            </div>

            {/* Activity type filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Tipo attività
              </label>
              <Select
                value={activityTypeFilter}
                onValueChange={(v) => {
                  setActivityTypeFilter(v);
                  setProjectFilter("all");
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="project">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-3 w-3" />
                      Progetti
                    </span>
                  </SelectItem>
                  <SelectItem value="internal">
                    <span className="flex items-center gap-2">
                      <Wrench className="h-3 w-3" />
                      Attività interne
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Project/Activity filter */}
            {activityTypeFilter !== "all" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {activityTypeFilter === "project" ? "Progetto" : "Attività"}
                </label>
                <Select
                  value={projectFilter}
                  onValueChange={(v) => {
                    setProjectFilter(v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Tutt{activityTypeFilter === "project" ? "i" : "e"}
                    </SelectItem>
                    {activityTypeFilter === "project"
                      ? uniqueProjects.map((project) => (
                          <SelectItem key={project} value={project}>
                            {project}
                          </SelectItem>
                        ))
                      : uniqueInternalActivities.map((activity) => (
                          <SelectItem key={activity} value={activity}>
                            {activityLabels.get(activity) || activity}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Selection actions */}
      {selectedIds.size > 0 && onDelete && (
        <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} selezionat{selectedIds.size === 1 ? "a" : "e"}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Elimina
          </Button>
        </div>
      )}

      {/* Entries list */}
      <div className="space-y-2">
        {paginatedEntries.length > 0 ? (
          <>
            {/* Select all */}
            {onDelete && (
              <div className="flex items-center gap-2 px-3 py-2">
                <Checkbox
                  checked={
                    paginatedEntries.length > 0 &&
                    selectedIds.size === paginatedEntries.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Seleziona tutti in questa pagina
                </span>
              </div>
            )}

            {paginatedEntries.map((entry) => (
              <Card
                key={entry.id}
                className={`transition-colors ${
                  selectedIds.has(entry.id)
                    ? "bg-red-500/5 border-red-500/30"
                    : ""
                }`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-3">
                    {onDelete && (
                      <Checkbox
                        checked={selectedIds.has(entry.id)}
                        onCheckedChange={() => toggleSelection(entry.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {entry.activity_type === "project" ? (
                            <Briefcase className="h-4 w-4 text-blue-500 shrink-0" />
                          ) : (
                            <Wrench className="h-4 w-4 text-orange-500 shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            {entry.activity_type === "internal"
                              ? activityLabels.get(entry.internal_activity || "") ||
                                entry.internal_activity
                              : entry.task?.client?.businessName
                              ? `${entry.task.unique_code} - ${entry.task.client.businessName}`
                              : entry.task?.unique_code || "Progetto"}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary shrink-0"
                        >
                          {entry.hours}h {entry.minutes}m
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>{formatDate(entry.created_at)}</span>
                        {entry.roles?.[0]?.name && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs h-5">
                              {entry.roles[0].name}
                            </Badge>
                          </>
                        )}
                        {entry.description && (
                          <>
                            <span>•</span>
                            <span className="truncate">{entry.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nessuna registrazione trovata</p>
              <p className="text-sm">
                {hasActiveFilters
                  ? "Prova a modificare i filtri"
                  : "Non hai ancora registrazioni"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Pagina {currentPage} di {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyHoursList;
