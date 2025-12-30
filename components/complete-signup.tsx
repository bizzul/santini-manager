"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { updateUserPassword } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

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
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Validazione Invito</CardTitle>
            <CardDescription>
              Attendi mentre validiamo il tuo invito...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !userEmail && !userAuthId) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-red-600">
              Errore Invito
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Se ritieni che si tratti di un errore, contatta l'amministratore
                di sistema.
              </p>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/login")}
              >
                Vai al Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Completa il tuo Profilo</CardTitle>
          <CardDescription>
            {organizationNames.length > 0 ? (
              <>
                Benvenuto in{" "}
                <span className="font-medium text-primary">
                  {organizationNames.join(", ")}
                </span>
                {userRole && (
                  <>
                    <br />
                    <span className="text-sm text-muted-foreground">
                      Ruolo assegnato:{" "}
                      <span className="font-medium">
                        {userRole === "user"
                          ? "Utente"
                          : userRole === "admin"
                          ? "Amministratore"
                          : userRole === "superadmin"
                          ? "Super Amministratore"
                          : userRole}
                      </span>
                    </span>
                  </>
                )}
                <br />
                Completa il tuo profilo per iniziare.
              </>
            ) : (
              "Benvenuto! Completa il tuo profilo per iniziare."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCompleteSignup}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail || ""}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500">
                  Questa è l'email con cui sei stato invitato
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Inserisci il tuo nome"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName">Cognome *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Inserisci il tuo cognome"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Inserisci la tua password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  La password deve essere di almeno 6 caratteri
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="repeatPassword">Conferma Password *</Label>
                <Input
                  id="repeatPassword"
                  type="password"
                  placeholder="Conferma la tua password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Completamento in corso..." : "Completa Profilo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
