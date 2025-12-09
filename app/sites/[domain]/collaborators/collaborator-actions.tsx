"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Key,
  UserMinus,
  Loader2,
  Power,
  PowerOff,
  Briefcase,
} from "lucide-react";
import { Collaborator } from "./columns";
import { EditCollaboratorDialog } from "./edit-collaborator-dialog";
import { RoleManagementDialog } from "./role-management-dialog";
import {
  removeCollaboratorFromSite,
  sendPasswordResetEmail,
  toggleCollaboratorStatus,
} from "./actions";

interface CollaboratorActionsProps {
  collaborator: Collaborator;
  siteId: string;
  domain: string;
  isAdmin: boolean;
}

export function CollaboratorActions({
  collaborator,
  siteId,
  domain,
  isAdmin,
}: CollaboratorActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRolesOpen, setIsRolesOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [isToggleStatusOpen, setIsToggleStatusOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Non mostrare azioni per admin dell'organizzazione (non possono essere rimossi dal sito)
  const isOrgAdmin = collaborator.is_org_admin;

  if (!isAdmin) {
    return null;
  }

  const handleRemove = async () => {
    setIsLoading(true);
    try {
      const result = await removeCollaboratorFromSite(
        siteId,
        collaborator.authId || "",
        domain
      );
      if (result.success) {
        toast({
          title: "Successo",
          description: result.message,
        });
        setIsRemoveOpen(false);
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

  const handlePasswordReset = async () => {
    setIsLoading(true);
    try {
      const result = await sendPasswordResetEmail(siteId, collaborator.email);
      if (result.success) {
        toast({
          title: "Successo",
          description: result.message,
        });
        setIsPasswordResetOpen(false);
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

  const handleToggleStatus = async () => {
    setIsLoading(true);
    try {
      const result = await toggleCollaboratorStatus(
        siteId,
        collaborator.authId || "",
        !collaborator.enabled,
        domain
      );
      if (result.success) {
        toast({
          title: "Successo",
          description: result.message,
        });
        setIsToggleStatusOpen(false);
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Apri menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifica
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsRolesOpen(true)}>
            <Briefcase className="h-4 w-4 mr-2" />
            Gestione Ruoli
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsPasswordResetOpen(true)}>
            <Key className="h-4 w-4 mr-2" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsToggleStatusOpen(true)}>
            {collaborator.enabled ? (
              <>
                <PowerOff className="h-4 w-4 mr-2" />
                Disabilita
              </>
            ) : (
              <>
                <Power className="h-4 w-4 mr-2" />
                Abilita
              </>
            )}
          </DropdownMenuItem>
          {!isOrgAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsRemoveOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Rimuovi dal sito
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <EditCollaboratorDialog
        collaborator={collaborator}
        siteId={siteId}
        domain={domain}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
      />

      {/* Role Management Dialog */}
      <RoleManagementDialog
        collaborator={collaborator}
        siteId={siteId}
        domain={domain}
        isOpen={isRolesOpen}
        onClose={() => setIsRolesOpen(false)}
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi Collaboratore</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere <strong>{fullName}</strong> da
              questo sito? L&apos;utente non avrà più accesso a questo sito, ma
              rimarrà nell&apos;organizzazione.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rimozione...
                </>
              ) : (
                "Rimuovi"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Reset Confirmation Dialog */}
      <AlertDialog
        open={isPasswordResetOpen}
        onOpenChange={setIsPasswordResetOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Verrà inviata un&apos;email di reset password a{" "}
              <strong>{collaborator.email}</strong>. L&apos;utente riceverà un
              link per impostare una nuova password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePasswordReset}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio...
                </>
              ) : (
                "Invia Email"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Confirmation Dialog */}
      <AlertDialog
        open={isToggleStatusOpen}
        onOpenChange={setIsToggleStatusOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {collaborator.enabled ? "Disabilita" : "Abilita"} Collaboratore
            </AlertDialogTitle>
            <AlertDialogDescription>
              {collaborator.enabled
                ? `Vuoi disabilitare l'account di ${fullName}? L'utente non potrà più accedere al sistema.`
                : `Vuoi abilitare l'account di ${fullName}? L'utente potrà nuovamente accedere al sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isLoading}
              className={
                collaborator.enabled
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {collaborator.enabled
                    ? "Disabilitazione..."
                    : "Abilitazione..."}
                </>
              ) : collaborator.enabled ? (
                "Disabilita"
              ) : (
                "Abilita"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
