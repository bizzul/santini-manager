"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createUser } from "../actions";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, KeyRound } from "lucide-react";

const initialState = {
  success: false,
  message: "",
};

interface CreateUserFormProps {
  organizations: any[];
  sites: any[];
  userRole?: string;
}

export function CreateUserForm({
  organizations,
  sites,
  userRole,
}: CreateUserFormProps) {
  const [state, formAction] = useActionState(createUser, initialState);
  const searchParams = useSearchParams();

  // Filter roles based on user's role
  const availableRoles =
    userRole === "superadmin"
      ? ["user", "admin", "superadmin"]
      : ["user", "admin"];

  const defaultRole = searchParams.get("role") || "user";
  const [selectedRole, setSelectedRole] = useState(
    availableRoles.includes(defaultRole) ? defaultRole : "user"
  );

  // Password fields state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (confirmPassword && value !== confirmPassword) {
      setPasswordError("Le password non corrispondono");
    } else if (value.length > 0 && value.length < 6) {
      setPasswordError("La password deve essere di almeno 6 caratteri");
    } else {
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (password && value !== password) {
      setPasswordError("Le password non corrispondono");
    } else {
      setPasswordError("");
    }
  };

  // Check if password fields are valid for "create with password" action
  const isPasswordValid = password.length >= 6 && password === confirmPassword && !passwordError;

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-white/80 mb-2"
        >
          Email
        </label>
        <input
          type="email"
          name="email"
          id="email"
          required
          className="w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
          placeholder="utente@esempio.com"
        />
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-white/80 mb-2"
        >
          Nome
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          className="w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
          placeholder="Nome"
        />
      </div>

      <div>
        <label
          htmlFor="last_name"
          className="block text-sm font-medium text-white/80 mb-2"
        >
          Cognome
        </label>
        <input
          type="text"
          name="last_name"
          id="last_name"
          required
          className="w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
          placeholder="Cognome"
        />
      </div>

      <div>
        <label
          htmlFor="role"
          className="block text-sm font-medium text-white/80 mb-2"
        >
          Ruolo
        </label>
        <select
          name="role"
          id="role"
          required
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full bg-white/10 border border-white/30 text-white rounded-lg px-4 py-3 backdrop-blur-sm"
        >
          {availableRoles.map((role) => (
            <option key={role} value={role} className="bg-gray-900 text-white">
              {role === "user"
                ? "Utente"
                : role === "admin"
                ? "Admin"
                : "Superadmin"}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-white/60">
          {selectedRole === "user" &&
            "Gli utenti normali vengono assegnati a siti specifici"}
          {selectedRole === "admin" &&
            "Gli admin gestiscono tutti i siti di un'organizzazione"}
          {selectedRole === "superadmin" &&
            "I superadmin possono vedere e gestire tutto"}
        </p>
      </div>

      {/* Show sites selector for regular users */}
      {selectedRole === "user" && (
        <div>
          <label
            htmlFor="site"
            className="block text-sm font-medium text-white/80 mb-2"
          >
            Siti
          </label>
          <select
            name="site"
            id="site"
            required
            multiple
            size={Math.min(sites.length, 6)}
            className="w-full bg-white/10 border border-white/30 text-white rounded-lg px-4 py-3 backdrop-blur-sm"
          >
            {sites?.map((site: any) => (
              <option
                key={site.id}
                value={site.id}
                className="bg-gray-900 text-white"
              >
                {site.name}{" "}
                {site.organization?.name ? `(${site.organization.name})` : ""}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-white/60">
            Tieni premuto Ctrl (o Cmd su Mac) per selezionare più siti
          </p>
        </div>
      )}

      {/* Show organization selector for admin users */}
      {selectedRole === "admin" && (
        <div>
          <label
            htmlFor="organization"
            className="block text-sm font-medium text-white/80 mb-2"
          >
            Organizzazione
          </label>
          <select
            name="organization"
            id="organization"
            required
            className="w-full bg-white/10 border border-white/30 text-white rounded-lg px-4 py-3 backdrop-blur-sm"
          >
            <option value="" className="bg-gray-900 text-white">
              Seleziona un'organizzazione
            </option>
            {organizations?.map((org: any) => (
              <option
                key={org.id}
                value={org.id}
                className="bg-gray-900 text-white"
              >
                {org.name}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-white/60">
            L'admin avrà accesso a tutti i siti di questa organizzazione
          </p>
        </div>
      )}

      {/* Info for superadmin */}
      {selectedRole === "superadmin" && (
        <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-4">
          <p className="text-yellow-200 text-sm">
            ⚠️ I superadmin hanno accesso completo a tutte le organizzazioni e
            siti. Non è necessario assegnarli a organizzazioni o siti specifici.
          </p>
        </div>
      )}

      {/* Optional password fields for direct creation */}
      <div className="bg-white/5 border border-white/20 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="h-4 w-4 text-white/60" />
          <span className="text-sm font-medium text-white/80">
            Password (opzionale)
          </span>
        </div>
        <p className="text-xs text-white/50 -mt-2 mb-3">
          Compila per creare l'utente con password diretta, altrimenti lascia vuoto per inviare invito via email
        </p>
        
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-white/80 mb-2"
          >
            Password
          </label>
          <input
            type="password"
            name="password"
            id="password"
            minLength={6}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            className="w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
            placeholder="Inserisci password (min. 6 caratteri)"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-white/80 mb-2"
          >
            Conferma Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            id="confirmPassword"
            minLength={6}
            value={confirmPassword}
            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
            className="w-full bg-white/10 border border-white/30 text-white placeholder:text-white/50 focus:border-white/60 focus:bg-white/15 rounded-lg px-4 py-3 backdrop-blur-sm"
            placeholder="Conferma la password"
          />
        </div>

        {passwordError && (
          <p className="text-sm text-red-300">{passwordError}</p>
        )}
      </div>

      {/* Two action buttons */}
      <div className="pt-4 space-y-3">
        {/* Hidden input to pass the mode - will be set by button click */}
        <input type="hidden" name="createWithPassword" id="createWithPasswordInput" value="false" />
        
        <Button
          type="submit"
          variant="outline"
          onClick={() => {
            const input = document.getElementById('createWithPasswordInput') as HTMLInputElement;
            if (input) input.value = "false";
          }}
          className="w-full border-2 border-white/40 text-white hover:bg-white/30 hover:border-white transition-all duration-300 py-3 font-semibold flex items-center justify-center gap-2"
        >
          <Mail className="h-4 w-4" />
          Invia Invito via Email
        </Button>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative px-3 bg-transparent">
            <span className="text-xs text-white/40 bg-[#1a1a2e] px-2">oppure</span>
          </div>
        </div>

        <Button
          type="submit"
          variant="outline"
          disabled={!isPasswordValid}
          onClick={() => {
            const input = document.getElementById('createWithPasswordInput') as HTMLInputElement;
            if (input) input.value = "true";
          }}
          className="w-full border-2 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all duration-300 py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-emerald-500/50"
        >
          <KeyRound className="h-4 w-4" />
          Crea con Password
        </Button>
        
        {!isPasswordValid && (password.length > 0 || confirmPassword.length > 0) && (
          <p className="text-xs text-white/50 text-center">
            Inserisci una password valida per abilitare la creazione diretta
          </p>
        )}
      </div>

      {state?.message && (
        <div
          className={`mt-4 p-4 rounded-xl ${
            state.success
              ? "bg-green-500/20 text-green-200 border border-green-400/50"
              : "bg-red-500/20 text-red-200 border border-red-400/50"
          }`}
        >
          {state.message}
        </div>
      )}
    </form>
  );
}
