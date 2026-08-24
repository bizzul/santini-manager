"use client";

import { cn } from "@/lib/utils";
import type { SupportMessage } from "@/lib/support/types";

export function SupportChatThread({
  messages,
  className,
}: {
  messages: SupportMessage[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {messages.map((message) => {
        const isUser = message.role === "user";
        const isSystem = message.role === "system";
        return (
          <div
            key={message.id}
            className={cn(
              "max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
              isUser && "ml-auto bg-primary text-primary-foreground",
              message.role === "bot" && "bg-card border border-border",
              message.role === "agent" && "bg-info/15 border border-info/30",
              isSystem && "mx-auto bg-muted text-muted-foreground text-xs",
            )}
          >
            {!isUser && !isSystem ? (
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {message.role === "agent" ? "Assistenza" : "Assistente"}
              </p>
            ) : null}
            {message.body}
          </div>
        );
      })}
    </div>
  );
}
