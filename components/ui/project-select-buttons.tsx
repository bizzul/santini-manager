"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Task } from "@/types/supabase";

interface ProjectSelectButtonsProps {
  projects: Task[];
  selectedProjectIds?: number[];
  onSelectionChange?: (selectedIds: number[]) => void;
  disabled?: boolean;
  className?: string;
  // Optional: function to get color for each project
  getProjectColor?: (project: Task) => string;
  // Optional: function to get display name for each project
  getProjectName?: (project: Task) => string;
}

// Default color palette for projects
const DEFAULT_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // orange
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
];

export function ProjectSelectButtons({
  projects,
  selectedProjectIds = [],
  onSelectionChange,
  disabled = false,
  className,
  getProjectColor,
  getProjectName,
}: ProjectSelectButtonsProps) {
  const [selectedIds, setSelectedIds] = React.useState<number[]>(
    selectedProjectIds || []
  );

  React.useEffect(() => {
    setSelectedIds(selectedProjectIds || []);
  }, [selectedProjectIds]);

  const handleToggle = (projectId: number) => {
    if (disabled) return;

    const newSelectedIds = selectedIds.includes(projectId)
      ? selectedIds.filter((id) => id !== projectId)
      : [...selectedIds, projectId];

    setSelectedIds(newSelectedIds);
    onSelectionChange?.(newSelectedIds);
  };

  const getColor = (project: Task, index: number): string => {
    if (getProjectColor) {
      return getProjectColor(project);
    }
    // Try to get color from SellProduct category if available
    const categoryColor =
      (project as any).SellProduct?.category?.color ||
      (project as any).sellProduct?.category?.color;
    if (categoryColor) {
      return categoryColor;
    }
    // Use default color based on index
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  const getDisplayName = (project: Task): string => {
    if (getProjectName) {
      return getProjectName(project);
    }
    // Default: use unique_code or title
    const clientName =
      (project as any).Client?.businessName ||
      (project as any).client?.businessName;
    if (clientName && project.unique_code) {
      return `${project.unique_code} - ${clientName}`;
    }
    return project.unique_code || project.title || `Progetto ${project.id}`;
  };

  if (projects.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Nessun progetto disponibile
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {projects.map((project, index) => {
        const isSelected = selectedIds.includes(project.id);
        const color = getColor(project, index);
        const displayName = getDisplayName(project);

        return (
          <Button
            key={project.id}
            type="button"
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "h-auto min-h-[40px] px-4 py-2 flex items-center gap-2",
              "hover:opacity-90 transition-opacity",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            style={
              isSelected
                ? {
                    backgroundColor: color,
                    borderColor: color,
                    color: "white",
                  }
                : {
                    borderColor: color,
                    color: color,
                  }
            }
            onClick={() => handleToggle(project.id)}
            disabled={disabled}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => handleToggle(project.id)}
              className="pointer-events-none"
              style={
                isSelected
                  ? {
                      borderColor: "white",
                      backgroundColor: "white",
                    }
                  : {
                      borderColor: color,
                    }
              }
            />
            <span className="text-sm font-medium">{displayName}</span>
          </Button>
        );
      })}
    </div>
  );
}
