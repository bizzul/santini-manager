"use client";

import { useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  TASK_COMMENT_TYPES,
  TASK_COMMENT_TYPE_META,
  type TaskCommentType,
} from "@/lib/task-typed-comments";

type ProjectTypedCommentsFieldProps<T extends FieldValues> = {
  control: Control<T>;
  disabled?: boolean;
};

export function ProjectTypedCommentsField<T extends FieldValues>({
  control,
  disabled,
}: ProjectTypedCommentsFieldProps<T>) {
  const [activeType, setActiveType] = useState<TaskCommentType>("produzione");

  return (
    <div className="space-y-3">
      <FormLabel>Commenti</FormLabel>
      <div className="grid grid-cols-3 gap-2">
        {TASK_COMMENT_TYPES.map((type) => {
          const meta = TASK_COMMENT_TYPE_META[type];
          const isActive = activeType === type;
          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              onClick={() => setActiveType(type)}
              className={cn(
                "rounded-md border px-2 py-2 text-center text-xs font-semibold transition-colors",
                "bg-background/60 hover:bg-accent disabled:opacity-50",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
              style={{
                borderColor: isActive ? meta.color : undefined,
                boxShadow: isActive ? `inset 0 0 0 1px ${meta.color}` : undefined,
                backgroundColor: isActive ? `${meta.color}22` : undefined,
                color: isActive ? meta.color : undefined,
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
      {TASK_COMMENT_TYPES.map((type) => (
        <FormField
          key={type}
          control={control}
          name={`typed_comments.${type}` as Path<T>}
          render={({ field }) => (
            <FormItem className={type === activeType ? "space-y-0" : "hidden"}>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  rows={4}
                  placeholder={`Commento ${TASK_COMMENT_TYPE_META[type].label.toLowerCase()}`}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
