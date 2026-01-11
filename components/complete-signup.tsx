"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { updateUserPassword } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { UserCheck, Loader2, XCircle, ArrowLeft } from "lucide-react";

export function CompleteSignupForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAuthId, setUserAuthId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [organizationNames, setOrganizationNames] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchOrganizationNames = async (orgIds: string[]) => {
    if (!orgIds || orgIds.length === 0) return;

    const supabase = createClient();
    const { data: orgs, error } = await supabase
      .from("organizations")
      .select("name")
      .in("id", orgIds);

    if (!error && orgs) {
      const names = orgs
        .map((org: { name: string | null }) => org.name)
        .filter(Boolean);
      setOrganizationNames(names);
    }
  };

  useEffect(() => {
    const validateInvitation = async () => {
      const supabase = createClient();

      try {
        // Get invitation data from URL parameters
        const email = searchParams.get("email");
        const name = searchParams.get("name");
        const last_name = searchParams.get("last_name");
        const role = searchParams.get("role");
        const organizations = searchParams.get("organizations");
        const sites = searchParams.get("sites");

        logger.debug("URL params:", {
          email,
          name,
          last_name,
          role,
          organizations,
          sites,
        });

        // Try to get the current session (set by callback route)
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          logger.error("Errore nel recupero utente:", userError.message);
        }

        if (user) {
          logger.debug("Utente autenticato:", user.id, user.email);
          setUserAuthId(user.id);
          setUserEmail(user.email || email || null);

          // Pre-fill form with URL params or user metadata
          if (name) setFirstName(name);
          else if (user.user_metadata?.name)
            setFirstName(user.user_metadata.name);

          if (last_name) setLastName(last_name);
          else if (user.user_metadata?.last_name)
            setLastName(user.user_metadata.last_name);

          if (role) setUserRole(role);
          else if (user.user_metadata?.role)
            setUserRole(user.user_metadata.role);

          // Fetch organization names
          if (organizations) {
            await fetchOrganizationNames(organizations.split(","));
          } else if (sites) {
            const siteIds = sites.split(",");
            const { data: sitesData } = await supabase
              .from("sites")
              .select("organization_id")
              .in("id", siteIds);

            if (sitesData) {
              const orgIds = Array.from(
                new Set(
                  sitesData
                    .map(
                      (s: { organization_id: string | null }) =>
                        s.organization_id
                    )
                    .filter(Boolean)
                )
              ) as string[];
              if (orgIds.length > 0) {
                await fetchOrganizationNames(orgIds);
              }
            }
          }

          setIsValidating(false);
          return;
        }

        // Fallback: use URL params without session
        if (email) {
          setUserEmail(email);
          if (name) setFirstName(name);
          if (last_name) setLastName(last_name);
          if (role) setUserRole(role);

          if (organizations) {
            await fetchOrganizationNames(organizations.split(","));
          }

          setIsValidating(false);
          return;
        }

        // No user and no email - invalid state
        setError("Invito non valido o scaduto. Contatta l'amministratore.");
        setIsValidating(false);
      } catch (error) {
        logger.error("Errore nella validazione dell'invito:", error);
        setError(
          "Errore nella validazione dell'invito. Contatta l'amministratore."
        );
        setIsValidating(false);
      }
    };

    validateInvitation();
  }, [router, searchParams]);

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== repeatPassword) {
      setError("Le password non corrispondono");
      return;
    }

    if (password.length < 6) {
      setError("La password deve essere di almeno 6 caratteri");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("Nome e cognome sono obbligatori");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get the current user from session
      let authId = userAuthId;

      if (!authId) {
        // Try to get from session
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          authId = user.id;
        }
      }

      if (!authId) {
        // Fallback: lookup by email
        if (userEmail) {
          const { data: existingUser, error: lookupError } = await supabase
            .from("User")
            .select("authId")
            .eq("email", userEmail)
            .single();

          if (!lookupError && existingUser) {
            authId = existingUser.authId;
          }
        }
      }

      if (!authId) {
        throw new Error(
          "Profilo utente non trovato. Contatta l'amministratore."
        );
      }

      logger.debug("Aggiornamento profilo per authId:", authId);

      // Update the user profile
      const { error: profileError } = await supabase
        .from("User")
        .update({
          given_name: firstName.trim(),
          family_name: lastName.trim(),
          enabled: true,
        })
        .eq("authId", authId);

      if (profileError) {
        throw new Error(
          `Errore nell'aggiornamento del profilo: ${profileError.message}`
        );
      }

      // Update the password
      try {
        const passwordResult = await updateUserPassword(authId, password);

        if (passwordResult.success) {
          logger.debug("Password aggiornata con successo");
          toast.success(
            organizationNames.length > 0
              ? `Profilo completato! Benvenuto in ${organizationNames.join(
                  ", "
                )}!`
              : "Profilo completato con successo!"
          );
          router.push("/sites/select");
        } else {
          logger.error(
            "Aggiornamento password fallito:",
            passwordResult.message
          );
          toast.success(
            "Profilo completato! Usa 'Password dimenticata' per impostare la password."
          );
          router.push("/login");
        }
      } catch (passwordError) {
        logger.error("Errore aggiornamento password:", passwordError);
        toast.success(
          "Profilo completato! Usa 'Password dimenticata' per impostare la password."
        );
        router.push("/login");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Si è verificato un errore";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
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
              Validazione Invito
            </h1>
          </div>
          <div className="text-center space-y-4">
            <p className="text-white/70 text-sm">
              Attendi mentre validiamo il tuo invito...
            </p>
            <div className="flex justify-center py-4">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userEmail && !userAuthId) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
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
              Errore Invito
            </h1>
          </div>

          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-400/50 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <p className="text-white/80 text-sm">{error}</p>
            <p className="text-white/60 text-xs">
              Se ritieni che si tratti di un errore, contatta l&apos;amministratore di sistema.
            </p>
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
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
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
            Completa il Profilo
          </h1>
          {organizationNames.length > 0 && (
            <p className="text-white/70 text-sm text-center">
              Benvenuto in{" "}
              <span className="text-white font-medium">
                {organizationNames.join(", ")}
              </span>
            </p>
          )}
          {userRole && (
            <p className="text-white/60 text-xs">
              Ruolo:{" "}
              <span className="font-medium">
                {userRole === "user"
                  ? "Utente"
                  : userRole === "admin"
                  ? "Amministratore"
                  : userRole === "superadmin"
                  ? "Super Amministratore"
                  : userRole}
              </span>
            </p>
          )}
        </div>

        <form onSubmit={handleCompleteSignup} className="flex flex-col gap-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-white">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={userEmail || ""}
              disabled
              className="bg-white/5 border-white/20 text-white/70 cursor-not-allowed"
            />
            <p className="text-white/50 text-xs">
              Questa è l&apos;email con cui sei stato invitato
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium text-white">
              Nome *
            </label>
            <Input
              id="firstName"
              type="text"
              placeholder="Inserisci il tuo nome"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isLoading}
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 backdrop-blur-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium text-white">
              Cognome *
            </label>
            <Input
              id="lastName"
              type="text"
              placeholder="Inserisci il tuo cognome"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isLoading}
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 backdrop-blur-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-white">
              Password *
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 backdrop-blur-sm"
            />
            <p className="text-white/50 text-xs">
              La password deve essere di almeno 6 caratteri
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="repeatPassword" className="text-sm font-medium text-white">
              Conferma Password *
            </label>
            <Input
              id="repeatPassword"
              type="password"
              placeholder="••••••••"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              disabled={isLoading}
              className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 backdrop-blur-sm"
            />
          </div>

          {error && (
            <div className="text-white text-sm text-center bg-red-500/20 border border-red-400/50 rounded-lg p-3 backdrop-blur-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            variant="outline"
            className="mt-4 w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white hover:scale-105 shadow-lg hover:shadow-2xl transition-all duration-300 text-lg py-6 font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Completamento in corso...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Completa Profilo
              </div>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
