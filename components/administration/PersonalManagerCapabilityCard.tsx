"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRound } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "@/components/ui/use-toast";
import {
  GENERE_LABELS,
  LANDING_PREFERITA_LABELS,
  isLandingPreferita,
  isUtenteGenere,
  type LandingPreferita,
  type UtenteGenere,
} from "@/lib/personal-manager/types";
import {
  setPersonalManagerEnabled,
  updateUserPersonalSettings,
  type PersonalManagerState,
} from "@/app/(administration)/administration/users/personal-manager.actions";

const GENERE_OPTIONS = Object.keys(GENERE_LABELS) as UtenteGenere[];
const LANDING_OPTIONS = Object.keys(
  LANDING_PREFERITA_LABELS,
) as LandingPreferita[];

export function PersonalManagerCapabilityCard({
  userAuthId,
  userDisplayName,
  initialState,
  isSuperadmin,
}: {
  userAuthId: string;
  userDisplayName: string;
  initialState: PersonalManagerState;
  isSuperadmin: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [pendingToggle, setPendingToggle] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);

  const applyToggle = async (enabled: boolean) => {
    setPendingToggle(true);
    try {
      await setPersonalManagerEnabled(userAuthId, enabled);
      setState((prev) => ({
        ...prev,
        abilitato: enabled,
        abilitatoAt: enabled ? new Date().toISOString() : prev.abilitatoAt,
      }));
      toast({
        title: enabled ? "Manager Personale abilitato" : "Manager Personale disabilitato",
        description: enabled
          ? "Le 8 aree di vita standard sono state predisposte."
          : "Le aree di vita sono state conservate (soft delete).",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Errore",
        description:
          error instanceof Error ? error.message : "Operazione non riuscita",
        variant: "destructive",
      });
    } finally {
      setPendingToggle(false);
    }
  };

  const handleToggle = (enabled: boolean) => {
    if (!isSuperadmin || pendingToggle) return;
    if (!enabled) {
      // Disattivazione: conferma esplicita, i dati restano (soft delete).
      setConfirmDisableOpen(true);
      return;
    }
    void applyToggle(true);
  };

  const saveSettings = async (
    genere: UtenteGenere,
    landingPreferita: LandingPreferita,
  ) => {
    setSavingSettings(true);
    try {
      await updateUserPersonalSettings(userAuthId, {
        genere,
        landingPreferita,
      });
      setState((prev) => ({ ...prev, genere, landingPreferita }));
      toast({ title: "Impostazioni personali salvate" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Errore",
        description:
          error instanceof Error ? error.message : "Salvataggio non riuscito",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 border-2 border-white/30 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-white/10">
          <UserRound className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Manager Personale</h2>
        {(pendingToggle || savingSettings) && (
          <Loader2 className="h-4 w-4 animate-spin text-white/60" />
        )}
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/5 p-4">
          <div>
            <Label className="text-white/90">Abilita Manager Personale</Label>
            <p className="mt-1 text-sm text-white/55">
              Vista personale aggregata sugli spazi a cui l&apos;utente è già
              abilitato. Non allarga il perimetro dati.
            </p>
            {!isSuperadmin && (
              <p className="mt-1 text-xs text-white/45">
                Solo un superadmin può modificare questa impostazione.
              </p>
            )}
          </div>
          <Switch
            checked={state.abilitato}
            onCheckedChange={handleToggle}
            disabled={!isSuperadmin || pendingToggle}
          />
        </div>

        {state.abilitato && state.abilitatoAt && (
          <p className="text-sm text-white/55">
            Abilitato il{" "}
            {new Date(state.abilitatoAt).toLocaleDateString("it-IT", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
            {state.abilitatoDaNome ? ` da ${state.abilitatoDaNome}` : ""}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-white/80">Genere</Label>
            <Select
              value={state.genere}
              onValueChange={(value) => {
                if (isUtenteGenere(value)) {
                  void saveSettings(value, state.landingPreferita);
                }
              }}
              disabled={savingSettings}
            >
              <SelectTrigger className="bg-white/10 border-white/30 text-white">
                <SelectValue placeholder="Seleziona genere..." />
              </SelectTrigger>
              <SelectContent>
                {GENERE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {GENERE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-white/45">
              Opzionale: usato solo per la scansione visiva del pannello admin.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Landing preferita</Label>
            <Select
              value={state.landingPreferita}
              onValueChange={(value) => {
                if (isLandingPreferita(value)) {
                  void saveSettings(state.genere, value);
                }
              }}
              disabled={savingSettings}
            >
              <SelectTrigger className="bg-white/10 border-white/30 text-white">
                <SelectValue placeholder="Seleziona landing..." />
              </SelectTrigger>
              <SelectContent>
                {LANDING_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {LANDING_PREFERITA_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDisableOpen} onOpenChange={setConfirmDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disabilitare il Manager Personale?</AlertDialogTitle>
            <AlertDialogDescription>
              Le aree di vita di {userDisplayName} verranno conservate ma non
              più accessibili. Confermi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDisableOpen(false);
                void applyToggle(false);
              }}
            >
              Disabilita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
