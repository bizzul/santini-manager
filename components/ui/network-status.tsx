import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWifi,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface NetworkStatusProps {
  showLastSync?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function NetworkStatus({
  showLastSync = true,
  className = "",
  size = "md",
}: NetworkStatusProps) {
  const { isOnline, lastOnlineTime } = useOnlineStatus();

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={`flex items-center gap-2 ${sizeClasses[size]} ${className}`}
    >
      <FontAwesomeIcon
        icon={isOnline ? faWifi : faExclamationTriangle}
        className={isOnline ? "text-green-500" : "text-red-500"}
      />
      <span className={isOnline ? "text-green-500" : "text-red-500"}>
        {isOnline ? "Online" : "Offline"}
      </span>
      {showLastSync && lastOnlineTime && (
        <span className="text-muted-foreground ml-auto">
          {lastOnlineTime.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
