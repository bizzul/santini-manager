"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

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
            "Token di conferma non trovato. Controlla il link dell'invito."
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
          setMessage(`Verifica email fallita: ${error.message}`);
          return;
        }

        setStatus("success");
        setMessage("Email confermata con successo!");
      } catch (error) {
        console.error("Confirmation error:", error);
        setStatus("error");
        setMessage("Si è verificato un errore. Riprova.");
      }
    };

    handleConfirmation();
  }, [searchParams, router]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
            <p className="text-white/80 text-sm">
              Conferma del tuo invito in corso...
            </p>
          </div>
        );

      case "success":
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-400/50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <p className="text-white/80 text-sm">{message}</p>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Vai al Login
              </Button>
            </Link>
          </div>
        );

      case "error":
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-400/50 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <p className="text-white/80 text-sm">{message}</p>
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Vai al Login
              </Button>
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="w-full px-4">
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8 space-y-4">
          <Image
            src="/logo-bianco.svg"
            alt="Logo"
            width={80}
            height={80}
            className="drop-shadow-2xl"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-white">
            Conferma Email
          </h1>
          <p className="text-white/70 text-sm text-center">
            Stiamo elaborando la tua conferma
          </p>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full px-4">
          <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 max-w-md mx-auto">
            <div className="flex flex-col items-center justify-center mb-8 space-y-4">
              <Image
                src="/logo-bianco.svg"
                alt="Logo"
                width={80}
                height={80}
                className="drop-shadow-2xl"
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-center text-white">
                Conferma Email
              </h1>
              <p className="text-white/70 text-sm text-center">
                Stiamo elaborando la tua conferma
              </p>
            </div>
            <div className="flex justify-center py-8">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
          </div>
        </div>
      }
    >
      <ConfirmPageContent />
    </Suspense>
  );
}
