"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPermissionsDialog } from "@/components/permissions/user-permissions-dialog";

interface HrSettingsModalProps {
  siteId: string;
  subdomain: string;
  users: any[];
  trigger: React.ReactNode;
}

type HrSettings = {
  hourlyRates?: Record<string, number | null>;
};

export default function HrSettingsModal({
  siteId,
  subdomain,
  users,
  trigger,
}: HrSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hourlyRates, setHourlyRates] = useState<Record<string, string>>({});
  const [permissionsUser, setPermissionsUser] = useState<any | null>(null);

  const activeRoleCounts = useMemo(
    () =>
      users.reduce<Record<string, number>>((acc, user) => {
        const role = user.role || "user";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {}),
    [users]
  );

  useEffect(() => {
    if (!open) return;
    loadSettings();
  }, [open, siteId]);

  async function loadSettings() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/settings/site-config?siteId=${siteId}&settingKey=hr_settings`
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile caricare le impostazioni HR");
      }
      const value: HrSettings = result.value || {};
      const nextRates = users.reduce<Record<string, string>>((acc, user) => {
        const rawValue = value.hourlyRates?.[user.id];
        acc[user.id] =
          rawValue === null || rawValue === undefined ? "" : String(rawValue);
        return acc;
      }, {});
      setHourlyRates(nextRates);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore nel caricamento"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          settingKey: "hr_settings",
          value: {
            hourlyRates: Object.fromEntries(
              Object.entries(hourlyRates).map(([userId, value]) => [
                userId,
                value === "" ? null : Number(value),
              ])
            ),
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile salvare le impostazioni");
      }
      toast.success("Impostazioni HR salvate");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">HR</DialogTitle>
            <DialogDescription className="text-white/70">
              Visualizza utenti attivi, gestisci costo orario e apri i permessi
              individuali.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <Card className="border-white/15 bg-white/5 text-white">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Users className="h-5 w-5 text-blue-300" />
                    <div>
                      <p className="text-xs text-white/55">Utenti attivi</p>
                      <p className="text-lg font-semibold">{users.length}</p>
                    </div>
                  </CardContent>
                </Card>
                {Object.entries(activeRoleCounts).map(([role, count]) => (
                  <Card
                    key={role}
                    className="border-white/15 bg-white/5 text-white"
                  >
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-white/55">
                        {role}
                      </p>
                      <p className="text-lg font-semibold">{count}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4">
                {users.map((user) => (
                  <Card
                    key={user.id}
                    className="border-white/15 bg-white/5 text-white"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">
                            {user.userData?.given_name || user.email || user.id}
                            {user.userData?.family_name
                              ? ` ${user.userData.family_name}`
                              : ""}
                          </CardTitle>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className="border-white/20 text-white/75"
                            >
                              {user.role || "user"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="border-white/20 text-white/75"
                            >
                              {user.email || "Nessuna email"}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPermissionsUser(user)}
                          className="border-white/30 text-white hover:bg-white/10"
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Gestisci permessi
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 md:max-w-xs">
                        <Label className="text-white/80">Costo orario</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={hourlyRates[user.id] || ""}
                          onChange={(event) =>
                            setHourlyRates((current) => ({
                              ...current,
                              [user.id]: event.target.value,
                            }))
                          }
                          placeholder="es. 35"
                          className="bg-white/10 border-white/30 text-white"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/30 text-white hover:bg-white/10"
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-white/20 text-white hover:bg-white/30"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                "Salva impostazioni"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {permissionsUser && (
        <UserPermissionsDialog
          isOpen={Boolean(permissionsUser)}
          onClose={() => setPermissionsUser(null)}
          userId={permissionsUser.id}
          userName={permissionsUser.email || permissionsUser.id}
          domain={`${subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}
          siteId={siteId}
        />
      )}
    </>
  );
}
