"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

function ConfirmPageContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        const supabase = createClient();

        // Get the token from URL parameters or hash
        let token = searchParams.get("token");
        const type = searchParams.get("type");

        // If no token in query params, try to get it from URL hash
        if (!token && type === "invite") {
          // Extract token from URL hash (access_token)
          const hash = window.location.hash;
          if (hash) {
            const hashParams = new URLSearchParams(hash.substring(1));
            token = hashParams.get("access_token");
          }
        }

        if (!token) {
          setStatus("error");
          setMessage(
            "No confirmation token found. Please check your invitation link."
          );
          return;
        }

        // Handle confirmation types (email, recovery, etc.)
        // Invitations now go directly to complete-signup
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "email",
        });

        if (error) {
          setStatus("error");
          setMessage(`Failed to verify email: ${error.message}`);
          return;
        }

        setStatus("success");
        setMessage("Email confirmed successfully!");
      } catch (error) {
        console.error("Confirmation error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    handleConfirmation();
  }, [searchParams, router]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-600 mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Confirming your invitation...
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </div>
        );

      case "error":
        return (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {message}
            </p>
            <Button
              variant="outline"
              onClick={() => router.push("/auth/login")}
            >
              Go to Login
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Confirming Email
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please wait while we process your confirmation
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Email Confirmation</CardTitle>
            <CardDescription>
              We&apos;re processing your email confirmation
            </CardDescription>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Confirming Email
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Please wait while we process your confirmation
              </p>
            </div>
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-600 mb-4" />
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Loading...
              </p>
            </div>
          </div>
        </div>
      }
    >
      <ConfirmPageContent />
    </Suspense>
  );
}
