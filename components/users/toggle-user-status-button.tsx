"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BadgeCheck, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ToggleUserStatusButtonProps {
  userId: string;
  isActive: boolean;
  userEmail: string;
}

export default function ToggleUserStatusButton({
  userId,
  isActive,
  userEmail,
}: ToggleUserStatusButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleToggleStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/toggle-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !isActive }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "User Status Updated",
          description: `${userEmail} is now ${
            !isActive ? "active" : "inactive"
          }`,
        });
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update user status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant={isActive ? "outline" : "secondary"}
      onClick={handleToggleStatus}
      disabled={isLoading}
      className={`flex items-center gap-2 ${
        isActive
          ? "text-red-600 border-red-600 hover:bg-red-50"
          : "text-green-600 hover:bg-green-50"
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isActive ? (
        <>
          <XCircle className="h-4 w-4" />
          Deactivate
        </>
      ) : (
        <>
          <BadgeCheck className="h-4 w-4" />
          Activate
        </>
      )}
    </Button>
  );
}
