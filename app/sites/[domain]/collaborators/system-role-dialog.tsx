"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Shield } from "lucide-react";
import { updateCollaboratorSystemRole } from "./actions";
import { Collaborator } from "./columns";

interface SystemRoleDialogProps {
  collaborator: Collaborator;
  siteId: string;
  domain: string;
  currentUserRole: string;
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: "user", label: "Utente", description: "Accesso base al sistema" },
  {
    value: "admin",
    label: "Amministratore",
    description: "Può gestire utenti e organizzazioni",
  },
  {
    value: "superadmin",
    label: "Super Admin",
    description: "Accesso completo a tutto il sistema",
  },
];

export function SystemRoleDialog({
  collaborator,
  siteId,
  domain,
  currentUserRole,
  isOpen,
  onClose,
}: SystemRoleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(collaborator.role || "user");
  const { toast } = useToast();

  // Sync state when collaborator changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(collaborator.role || "user");
    }
  }, [collaborator.role, isOpen]);

  // Determine available roles based on current user's role
  const availableRoles = ROLE_OPTIONS.filter((role) => {
    // Superadmins can assign any role
    if (currentUserRole === "superadmin") {
      return true;
    }
    // Admins can only assign user and admin roles
    if (currentUserRole === "admin") {
      return role.value !== "superadmin";
    }
    return false;
  });

  // Check if the target user is a superadmin (admins can't modify superadmins)
  const isTargetSuperadmin = collaborator.role === "superadmin";
  const canModify = currentUserRole === "superadmin" || !isTargetSuperadmin;

  const handleSave = async () => {
    if (selectedRole === collaborator.role) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateCollaboratorSystemRole(
        siteId,
        collaborator.authId || "",
        selectedRole,
        domain
      );

      if (result.success) {
        toast({
          title: "Successo",
          description: result.message,
        });
        onClose();
      } else {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fullName =
    [collaborator.given_name, collaborator.family_name]
      .filter(Boolean)
      .join(" ") || collaborator.email;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Modifica Ruolo di Sistema
          </DialogTitle>
          <DialogDescription>
            Modifica il ruolo di sistema per <strong>{fullName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!canModify ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              Non puoi modificare il ruolo di un superadmin. Solo altri
              superadmin possono farlo.
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="systemRole">Ruolo di Sistema</Label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
                disabled={!canModify}
              >
                <SelectTrigger id="systemRole">
                  <SelectValue placeholder="Seleziona ruolo" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{role.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {role.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole !== collaborator.role && (
                <p className="text-xs text-muted-foreground mt-1">
                  Il ruolo cambierà da{" "}
                  <strong>
                    {ROLE_OPTIONS.find((r) => r.value === collaborator.role)
                      ?.label || collaborator.role}
                  </strong>{" "}
                  a{" "}
                  <strong>
                    {ROLE_OPTIONS.find((r) => r.value === selectedRole)
                      ?.label || selectedRole}
                  </strong>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annulla
          </Button>
          {canModify && (
            <Button
              onClick={handleSave}
              disabled={isLoading || selectedRole === collaborator.role}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva Modifiche"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
