"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Key, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

interface PasswordResetButtonProps {
  userEmail: string;
  userName: string;
}

export default function PasswordResetButton({
  userEmail,
  userName,
}: PasswordResetButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handlePasswordReset = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/users/passChange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userEmail),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password Reset Email Sent",
          description: `A password reset email has been sent to ${userEmail}`,
        });
        setIsOpen(false);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send password reset email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          Reset Password
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send Password Reset Email</AlertDialogTitle>
          <AlertDialogDescription>
            This will send a password reset email to{" "}
            <strong>{userEmail}</strong>
            {userName && userName !== "-" && ` (${userName})`}. The user will
            receive an email with instructions to reset their password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePasswordReset}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Email"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
