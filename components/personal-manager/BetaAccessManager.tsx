"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  getBetaAccess,
  getSiteUsers,
  saveBetaAccess,
  type BetaAccessState,
  type SiteOption,
  type SiteUserOption,
} from "@/app/(administration)/administration/personal-manager/actions";
import {
  LIFE_AREAS,
  type AreaPermissions,
  type AreaSlug,
  type PermissionsMatrix,
} from "@/lib/personal-manager/types";

const ACTIONS: (keyof AreaPermissions)[] = ["read", "edit", "create"];
const ACTION_LABELS: Record<keyof AreaPermissions, string> = {
  read: "Read",
  edit: "Edit",
  create: "Create",
};

export function BetaAccessManager({ sites }: { sites: SiteOption[] }) {
  const { toast } = useToast();
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? "");
  const [users, setUsers] = useState<SiteUserOption[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [betaEnabled, setBetaEnabled] = useState(false);
  const [visible, setVisible] = useState<Set<AreaSlug>>(new Set());
  const [perms, setPerms] = useState<PermissionsMatrix>({});
  const [loadingUsers, startLoadUsers] = useTransition();
  const [loadingAccess, startLoadAccess] = useTransition();
  const [saving, startSaving] = useTransition();

  // Carica utenti quando cambia lo spazio.
  useEffect(() => {
    if (!siteId) return;
    startLoadUsers(async () => {
      try {
        const list = await getSiteUsers(siteId);
        setUsers(list);
        setUserId(list[0]?.userId ?? "");
      } catch (err) {
        toast({
          title: "Errore",
          description: err instanceof Error ? err.message : "Impossibile caricare gli utenti",
          variant: "destructive",
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // Carica accesso quando cambia utente.
  useEffect(() => {
    if (!siteId || !userId) {
      setBetaEnabled(false);
      setVisible(new Set());
      setPerms({});
      return;
    }
    startLoadAccess(async () => {
      try {
        const state = await getBetaAccess(siteId, userId);
        setBetaEnabled(state.beta_app_enabled);
        setVisible(new Set(state.areas_visible));
        setPerms(state.permissions);
      } catch (err) {
        toast({
          title: "Errore",
          description: err instanceof Error ? err.message : "Impossibile caricare l'accesso",
          variant: "destructive",
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, userId]);

  const toggleVisible = (slug: AreaSlug) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
        setPerms((p) => ({
          ...p,
          [slug]: p[slug] ?? { read: true, edit: false, create: false },
        }));
      }
      return next;
    });
  };

  const toggleAction = (slug: AreaSlug, action: keyof AreaPermissions) => {
    setPerms((prev) => {
      const current = prev[slug] ?? { read: true, edit: false, create: false };
      return { ...prev, [slug]: { ...current, [action]: !current[action] } };
    });
  };

  const save = () => {
    if (!siteId || !userId) return;
    const state: BetaAccessState = {
      beta_app_enabled: betaEnabled,
      areas_visible: Array.from(visible),
      permissions: perms,
    };
    startSaving(async () => {
      try {
        await saveBetaAccess(siteId, userId, state);
        toast({ title: "Accesso salvato" });
      } catch (err) {
        toast({
          title: "Errore",
          description: err instanceof Error ? err.message : "Salvataggio non riuscito",
          variant: "destructive",
        });
      }
    });
  };

  const selectClass =
    "w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white [&>option]:text-black";

  return (
    <div className="space-y-6">
      {/* Selettori spazio + utente */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-white/70">
            Spazio
          </label>
          <select
            className={selectClass}
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.subdomain ? `(${s.subdomain})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-white/70">
            Utente
          </label>
          <select
            className={selectClass}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={loadingUsers || users.length === 0}
          >
            {users.length === 0 ? (
              <option value="">Nessun utente nello spazio</option>
            ) : (
              users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.email}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {userId ? (
        <>
          {/* Toggle beta */}
          <label className="flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-3">
            <div>
              <p className="font-semibold text-white">App Beta abilitata</p>
              <p className="text-sm text-white/60">
                Consente l&apos;accesso allo spazio Manager Personale su mobile.
              </p>
            </div>
            <input
              type="checkbox"
              className="h-6 w-6 accent-emerald-500"
              checked={betaEnabled}
              disabled={loadingAccess}
              onChange={(e) => setBetaEnabled(e.target.checked)}
            />
          </label>

          {/* Matrice permessi */}
          <div className="overflow-hidden rounded-xl border border-white/20 bg-white/5">
            <div className="grid grid-cols-[1.6fr_repeat(3,1fr)] gap-2 border-b border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase text-white/70">
              <span>Area (visibile)</span>
              {ACTIONS.map((a) => (
                <span key={a} className="text-center">
                  {ACTION_LABELS[a]}
                </span>
              ))}
            </div>
            {LIFE_AREAS.map((area) => {
              const isVisible = visible.has(area.slug);
              const p = perms[area.slug];
              return (
                <div
                  key={area.slug}
                  className="grid grid-cols-[1.6fr_repeat(3,1fr)] items-center gap-2 border-b border-white/10 px-4 py-2.5 last:border-b-0"
                >
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-500"
                      checked={isVisible}
                      onChange={() => toggleVisible(area.slug)}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: area.accent }}
                    />
                    {area.label}
                  </label>
                  {ACTIONS.map((action) => (
                    <div key={action} className="flex justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-emerald-500 disabled:opacity-30"
                        disabled={!isVisible}
                        checked={isVisible ? Boolean(p?.[action]) : false}
                        onChange={() => toggleAction(area.slug, action)}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={save}
              disabled={saving || loadingAccess}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {saving ? "Salvataggio…" : "Salva accesso"}
            </Button>
          </div>
        </>
      ) : (
        <p className="rounded-xl border border-white/20 bg-white/5 px-4 py-6 text-center text-white/70">
          Seleziona uno spazio con almeno un utente per configurare l&apos;accesso.
        </p>
      )}
    </div>
  );
}
