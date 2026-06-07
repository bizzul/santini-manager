"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { LayoutDashboard, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DASHBOARD_EXPERIENCE_DASHBOARDS,
  DASHBOARD_EXPERIENCE_QUESTIONS,
  DASHBOARD_SETTINGS_KEY,
  getDefaultQuestionSequence,
  normalizeDashboardExperienceSettings,
  type DashboardExperienceSettings,
} from "@/lib/dashboard-question-config";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type SiteDashboardSettingsUser = {
  id: string;
  email?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  role?: string | null;
};

interface SiteDashboardSettingsModalProps {
  siteId: string;
  siteName: string;
  users: SiteDashboardSettingsUser[];
  trigger: React.ReactNode;
  canConfigure: boolean;
}

function getUserName(user: SiteDashboardSettingsUser) {
  const fullName = `${user.given_name || ""} ${user.family_name || ""}`.trim();
  return fullName || user.email || `Utente ${user.id.slice(0, 8)}`;
}

export function SiteDashboardSettingsModal({
  siteId,
  siteName,
  users,
  trigger,
  canConfigure,
}: SiteDashboardSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeUserId, setActiveUserId] = useState(users[0]?.id ?? "");
  const [settings, setSettings] = useState<DashboardExperienceSettings>(
    normalizeDashboardExperienceSettings(null),
  );

  const activeUser = users.find((user) => user.id === activeUserId) ?? users[0];
  const activeSequence = useMemo(() => {
    if (!activeUser) return [];
    return settings.userSequences[activeUser.id] ?? getDefaultQuestionSequence(50);
  }, [activeUser, settings.userSequences]);

  const selectedQuestionSet = useMemo(
    () => new Set(activeSequence),
    [activeSequence],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/settings/site-config?siteId=${encodeURIComponent(
            siteId,
          )}&settingKey=${encodeURIComponent(DASHBOARD_SETTINGS_KEY)}`,
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.error || "Impossibile caricare le impostazioni Dashboard",
          );
        }

        if (!cancelled) {
          setSettings(normalizeDashboardExperienceSettings(result.value));
          if (!activeUserId && users[0]?.id) {
            setActiveUserId(users[0].id);
          }
        }
      } catch (error) {
        logger.error("Dashboard settings load error:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Errore durante il caricamento Dashboard",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, open, siteId, users]);

  const toggleDashboard = (dashboardId: string) => {
    setSettings((current) => {
      const isActive = current.activeDashboardIds.includes(dashboardId);
      const activeDashboardIds = isActive
        ? current.activeDashboardIds.filter((id) => id !== dashboardId)
        : [...current.activeDashboardIds, dashboardId];

      return {
        ...current,
        activeDashboardIds,
      };
    });
  };

  const setUserSequence = (userId: string, questionIds: string[]) => {
    setSettings((current) => ({
      ...current,
      userSequences: {
        ...current.userSequences,
        [userId]: questionIds,
      },
    }));
  };

  const toggleQuestion = (questionId: string) => {
    if (!activeUser) return;

    const exists = selectedQuestionSet.has(questionId);
    const nextSequence = exists
      ? activeSequence.filter((id) => id !== questionId)
      : [
          ...activeSequence,
          questionId,
        ].sort((a, b) => {
          const indexA = DASHBOARD_EXPERIENCE_QUESTIONS.findIndex(
            (question) => question.id === a,
          );
          const indexB = DASHBOARD_EXPERIENCE_QUESTIONS.findIndex(
            (question) => question.id === b,
          );
          return indexA - indexB;
        });

    setUserSequence(activeUser.id, nextSequence);
  };

  const applyPreset = (limit: 40 | 50) => {
    if (!activeUser) return;
    setUserSequence(activeUser.id, getDefaultQuestionSequence(limit));
  };

  const clearUserSequence = () => {
    if (!activeUser) return;
    setUserSequence(activeUser.id, []);
  };

  const saveSettings = async () => {
    if (!canConfigure) {
      toast.error("Solo utenti superadmin possono modificare questa sezione.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/settings/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          settingKey: DASHBOARD_SETTINGS_KEY,
          value: settings,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error || "Impossibile salvare le impostazioni Dashboard",
        );
      }

      toast.success("Impostazioni Dashboard salvate.");
    } catch (error) {
      logger.error("Dashboard settings save error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore durante il salvataggio Dashboard",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-[980px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-violet-300" />
            Dashboard
          </DialogTitle>
          <DialogDescription>
            Configura dashboard attive e sequenza domande immersive per gli
            utenti dello spazio{" "}
            <span className="font-semibold text-white/90">{siteName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-violet-300/20 bg-violet-500/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">Dashboard attive</h3>
                  <p className="mt-1 text-xs text-white/65">
                    Scegli quali dashboard possono essere usate nell’esperienza
                    personalizzata.
                  </p>
                </div>
                <Badge className="border-violet-300/30 bg-violet-500/20 text-violet-100">
                  {settings.activeDashboardIds.length} attive
                </Badge>
              </div>

              <div className="mt-4 grid gap-2">
                {DASHBOARD_EXPERIENCE_DASHBOARDS.map((dashboard) => {
                  const checked = settings.activeDashboardIds.includes(dashboard.id);
                  return (
                    <button
                      key={dashboard.id}
                      type="button"
                      onClick={() => toggleDashboard(dashboard.id)}
                      disabled={!canConfigure}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                        checked
                          ? "border-violet-300/45 bg-violet-400/15"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                      )}
                    >
                      <Checkbox checked={checked} className="mt-0.5" />
                      <span>
                        <span className="block text-sm font-medium text-white">
                          {dashboard.name}
                        </span>
                        <span className="mt-1 block text-xs text-white/60">
                          {dashboard.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-white/70" />
                <h3 className="font-semibold text-white">Utenti</h3>
              </div>
              <div className="mt-3 grid gap-2">
                {users.map((user) => {
                  const selected = user.id === activeUser?.id;
                  const count =
                    settings.userSequences[user.id]?.length ??
                    getDefaultQuestionSequence(50).length;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setActiveUserId(user.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition",
                        selected
                          ? "border-sky-300/45 bg-sky-400/15"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                      )}
                    >
                      <span className="block text-sm font-medium text-white">
                        {getUserName(user)}
                      </span>
                      <span className="mt-1 block text-xs text-white/60">
                        {user.role || "user"} · {count} domande
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="min-h-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-white">
                  Sequenza domande per {activeUser ? getUserName(activeUser) : "utente"}
                </h3>
                <p className="mt-1 text-xs text-white/65">
                  Le prime 40/50 domande sono volutamente semplici per capire
                  bisogni, preferenze e priorita in meno di 2 minuti.
                </p>
              </div>
              <Badge className="border-sky-300/30 bg-sky-500/20 text-sky-100">
                {activeSequence.length}/50
              </Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyPreset(40)}
                disabled={!canConfigure || !activeUser}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Usa prime 40
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyPreset(50)}
                disabled={!canConfigure || !activeUser}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Usa prime 50
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearUserSequence}
                disabled={!canConfigure || !activeUser}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Svuota sequenza
              </Button>
            </div>

            <ScrollArea className="mt-4 h-[430px] pr-3">
              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Caricamento impostazioni...
                  </div>
                ) : (
                  DASHBOARD_EXPERIENCE_QUESTIONS.map((question, index) => {
                    const checked = selectedQuestionSet.has(question.id);
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => toggleQuestion(question.id)}
                        disabled={!canConfigure || !activeUser}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                          checked
                            ? "border-sky-300/40 bg-sky-500/15"
                            : "border-white/10 bg-white/5 hover:bg-white/10",
                        )}
                      >
                        <Checkbox checked={checked} className="mt-1" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-white/45">
                              #{String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
                              {question.category}
                            </span>
                          </span>
                          <span className="mt-1 block text-sm font-medium text-white">
                            {question.prompt}
                          </span>
                          <span className="mt-1 block text-xs text-white/55">
                            {question.options.join(" · ")}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-white/55">
            La configurazione viene salvata in `site_settings` e potra essere
            usata dal wizard My 1° Dashboard.
          </p>
          <Button
            type="button"
            onClick={saveSettings}
            disabled={!canConfigure || saving}
            className="bg-violet-300 text-violet-950 hover:bg-violet-200"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Salva Dashboard"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SiteDashboardSettingsModal;
