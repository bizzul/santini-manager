"use client";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { useState } from "react";

interface TimelineClientProps {
  snapshots: {
    timestamp: Date;
    taskCount: number;
  }[];
  onPreviewSnapshot: (timestamp: Date | null) => void;
}

export default function TimelineClient({
  snapshots,
  onPreviewSnapshot,
}: TimelineClientProps) {
  const [activeSnapshot, setActiveSnapshot] = useState<Date | null>(null);

  const handleSelectSnapshot = async (timestamp: Date) => {
    if (activeSnapshot?.getTime() === timestamp.getTime()) {
      setActiveSnapshot(null);
      onPreviewSnapshot(null);
    } else {
      setActiveSnapshot(timestamp);
      onPreviewSnapshot(timestamp);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-row gap-2 overflow-x-auto ">
        {snapshots.map((snapshot) => (
          <li key={snapshot.timestamp.toString()}>
            <Button
              variant={
                activeSnapshot?.getTime() ===
                new Date(snapshot.timestamp).getTime()
                  ? "default"
                  : "outline-solid"
              }
              size="sm"
              onClick={() => handleSelectSnapshot(new Date(snapshot.timestamp))}
              className="whitespace-nowrap"
            >
              {new Date(snapshot.timestamp).toLocaleString()}
              <span className="ml-2 text-xs opacity-70">
                ({snapshot.taskCount} tasks)
              </span>
            </Button>
          </li>
        ))}
      </ul>
      {activeSnapshot && (
        <div className="text-sm text-muted-foreground px-2 flex items-center justify-between">
          <span>
            Visualizzazione timeline del{" "}
            {new Date(activeSnapshot).toLocaleString()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveSnapshot(null);
              onPreviewSnapshot(null);
            }}
          >
            Rimuovi Visualizzazione
          </Button>
        </div>
      )}
    </div>
  );
}
