"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  generateTimetrackingInstructions,
  type TimetrackingInstructionsInput,
  type TimetrackingInstructionStatus,
} from "@/lib/timetracking-instructions";
import { cn } from "@/lib/utils";

function getStatusMeta(status: TimetrackingInstructionStatus) {
  switch (status) {
    case "done":
      return {
        label: "Fatto",
        icon: CheckCircle2,
        badgeClassName:
          "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300",
        iconClassName: "text-green-600",
      };
    case "active":
      return {
        label: "Adesso",
        icon: AlertCircle,
        badgeClassName:
          "border-primary/20 bg-primary/10 text-primary",
        iconClassName: "text-primary",
      };
    case "todo":
    default:
      return {
        label: "Dopo",
        icon: Clock,
        badgeClassName:
          "border-border bg-muted text-muted-foreground",
        iconClassName: "text-muted-foreground",
      };
  }
}

export function TimetrackingInstructionsCard(
  props: TimetrackingInstructionsInput
) {
  const content = generateTimetrackingInstructions(props);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              {content.eyebrow}
            </div>
            <CardTitle className="text-lg">{content.title}</CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              {content.description}
            </CardDescription>
          </div>

          <Badge variant="secondary" className="w-fit">
            {content.viewLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-2">
          {content.items.map((item) => {
            const statusMeta = getStatusMeta(item.status);
            const StatusIcon = statusMeta.icon;

            return (
              <div
                key={item.id}
                className="rounded-xl border bg-background/80 p-4"
              >
                <div className="flex items-start gap-3">
                  <StatusIcon
                    className={cn("mt-0.5 h-4 w-4 shrink-0", statusMeta.iconClassName)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <Badge
                        variant="outline"
                        className={cn("text-[11px]", statusMeta.badgeClassName)}
                      >
                        {statusMeta.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          {content.tip}
        </div>
      </CardContent>
    </Card>
  );
}
