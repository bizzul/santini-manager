"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  RotateCcw,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildSiteThemeStyleVars,
  DEFAULT_SITE_THEME_COLORS_ADAPTIVE,
  DEFAULT_SITE_THEME_COLORS_DARK,
  DEFAULT_SITE_THEME_COLORS_LIGHT,
  getEstimatedSunlightLevel,
  resolveAdaptiveThemeColors,
  resolveSiteThemeColors,
  resolveSiteThemeSettings,
  SITE_THEME_PRESETS,
  SITE_THEME_MODE_VALUES,
  SITE_THEME_SETTING_KEY,
  validateSiteThemeColors,
  type SiteThemeMode,
  type SiteThemeColors,
  type SiteThemeSettings,
} from "@/lib/site-theme";

type SiteThemeColorsConfiguratorProps = {
  siteId: string;
  initialSettings: SiteThemeSettings;
};

const COLOR_FIELDS: Array<{
  key: keyof SiteThemeColors;
  label: string;
  description: string;
}> = [
  {
    key: "sidebarCard",
    label: "Card menu",
    description: "Riquadri e blocchi del laterale",
  },
  {
    key: "sidebarBackground",
    label: "Sfondo menu",
    description: "Canvas della barra laterale",
  },
  {
    key: "pageCard",
    label: "Card schermate",
    description: "Riquadri e tabelle delle pagine",
  },
  {
    key: "pageBackground",
    label: "Sfondo schermate",
    description: "Sfondo generale delle pagine",
  },
];

export default function SiteThemeColorsConfigurator({
  siteId,
  initialSettings,
}: SiteThemeColorsConfiguratorProps) {
  const router = useRouter();
  const resolvedInitialSettings = useMemo(
    () => resolveSiteThemeSettings(initialSettings),
    [initialSettings]
  );

  const [settings, setSettings] = useState<SiteThemeSettings>(
    resolvedInitialSettings
  );
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(resolvedInitialSettings);

  const activeMode = settings.mode;
  const activeColors = settings[activeMode];
  const previewColors =
    activeMode === "adaptive"
      ? resolveAdaptiveThemeColors(activeColors, getEstimatedSunlightLevel())
      : activeColors;
  const previewVars = useMemo(
    () => buildSiteThemeStyleVars(previewColors),
    [previewColors]
  );
  const validation = useMemo(
    () => validateSiteThemeColors(activeColors),
    [activeColors]
  );

  const handleColorChange = (
    key: keyof SiteThemeColors,
    value: string
  ) => {
    setSettings((current) => {
      const currentMode = current.mode;
      const updatedModeColors = resolveSiteThemeColors({
        ...current[currentMode],
        [key]: value.toUpperCase(),
      });

      return {
        ...current,
        [currentMode]: updatedModeColors,
      };
    });
  };

  const handleModeChange = (mode: SiteThemeMode) => {
    setSettings((current) => ({ ...current, mode }));
  };

  const handleReset = () => {
    setSettings((current) => ({
      ...current,
      [current.mode]:
        current.mode === "dark"
          ? DEFAULT_SITE_THEME_COLORS_DARK
          : current.mode === "adaptive"
          ? DEFAULT_SITE_THEME_COLORS_ADAPTIVE
          : DEFAULT_SITE_THEME_COLORS_LIGHT,
    }));
  };

  const handleApplyRecommended = () => {
    const recommendedPreset =
      activeMode === "dark"
        ? SITE_THEME_PRESETS.find((preset) => preset.id === "dark-slate")
        : SITE_THEME_PRESETS.find((preset) => preset.id === "neutral-balanced");

    if (!recommendedPreset) return;
    applyPreset(recommendedPreset.colors);
  };

  const handleSave = async () => {
    if (!validation.canSave) {
      toast.error("Correggi i vincoli di contrasto prima di salvare.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/settings/site-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId,
          settingKey: SITE_THEME_SETTING_KEY,
          value: settings,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Impossibile salvare i colori");
      }

      toast.success("Colori del sito aggiornati");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore nel salvataggio dei colori"
      );
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (presetColors: SiteThemeColors) => {
    setSettings((current) => ({
      ...current,
      [current.mode]: resolveSiteThemeColors(presetColors),
    }));
    toast.success("Preset applicato alla modalità corrente");
  };

  const renderPreviewPicker = (
    key: keyof SiteThemeColors,
    label: string,
    className: string
  ) => (
    <label
      className={`absolute z-20 flex items-center gap-1.5 rounded-md border border-black/20 bg-black/42 px-1.5 py-1 text-[10px] font-medium text-white/92 shadow-md backdrop-blur-sm ${className}`}
      title={`Seleziona ${label}`}
    >
      <Input
        type="color"
        value={activeColors[key]}
        onChange={(event) => handleColorChange(key, event.target.value)}
        className="h-5 w-6 cursor-pointer border-white/35 bg-transparent p-0.5"
        aria-label={`Anteprima ${label}`}
      />
      <span className="whitespace-nowrap leading-none">{label}</span>
    </label>
  );

  return (
    <div className="w-full rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm xl:max-w-[720px]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {SITE_THEME_MODE_VALUES.map((mode) => (
          <Button
            key={mode}
            type="button"
            variant={activeMode === mode ? "secondary" : "ghost"}
            onClick={() => handleModeChange(mode)}
            className={
              activeMode === mode
                ? "bg-white text-slate-950 hover:bg-white/90"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }
          >
            {mode === "light"
              ? "Modalita light"
              : mode === "dark"
              ? "Modalita dark"
              : "Modalita adaptive"}
          </Button>
        ))}
      </div>

      {activeMode === "adaptive" && (
        <div className="mb-3 rounded-xl border border-amber-200/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
          In modalita adaptive, sfondo e card si regolano automaticamente in base
          alla luce solare stimata del momento.
        </div>
      )}

      <div className="mb-3 rounded-xl border border-white/12 bg-slate-950/15 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Lightbulb className="h-4 w-4 text-amber-300" />
          Consigli impostazioni
        </div>
        <div className="mb-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleApplyRecommended}
            className="h-8 bg-white text-slate-950 hover:bg-white/90"
          >
            Applica base ottimizzata
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SITE_THEME_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="ghost"
              onClick={() => applyPreset(preset.colors)}
              className="h-auto rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-white/85 hover:bg-white/12"
              title={preset.description}
            >
              <span className="text-xs font-semibold">{preset.label}</span>
            </Button>
          ))}
        </div>
        <div className="mt-2 space-y-1">
          {validation.suggestions.map((suggestion) => (
            <p key={suggestion} className="text-[11px] text-white/60">
              - {suggestion}
            </p>
          ))}
        </div>
      </div>

      {(validation.issues.length > 0 || validation.warnings.length > 0) && (
        <div className="mb-3 space-y-2 rounded-xl border border-white/12 bg-slate-950/20 p-3">
          {validation.issues.map((issue) => (
            <div
              key={issue}
              className="flex items-start gap-2 text-xs text-red-200/95"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
          {validation.warnings.map((warning) => (
            <div
              key={warning}
              className="flex items-start gap-2 text-xs text-amber-100/90"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {COLOR_FIELDS.map((field) => (
          <div
            key={field.key}
            className="rounded-xl border border-white/12 bg-slate-950/15 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {field.label}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-white/55">
                  {field.description}
                </p>
              </div>

              <div
                className="h-10 w-10 shrink-0 rounded-lg border border-white/20 shadow-inner"
                style={{ backgroundColor: activeColors[field.key] }}
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Input
                type="color"
                value={activeColors[field.key]}
                onChange={(event) =>
                  handleColorChange(field.key, event.target.value)
                }
                className="h-10 w-14 cursor-pointer rounded-lg border-white/20 bg-transparent p-1"
                aria-label={field.label}
              />
              <Input
                type="text"
                value={activeColors[field.key]}
                onChange={(event) =>
                  handleColorChange(field.key, event.target.value)
                }
                className="h-10 border-white/15 bg-white/5 px-3 py-2 text-xs font-medium tracking-wide text-white/90"
              />
            </div>
          </div>
        ))}
      </div>

      {showPreview && (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/15">
          <div
            className="grid min-h-[220px] grid-cols-[220px_minmax(0,1fr)]"
            style={previewVars}
          >
            <div className="relative border-r border-[hsl(var(--sidebar-border)/0.7)] bg-[hsl(var(--sidebar))] p-3">
              {renderPreviewPicker(
                "sidebarBackground",
                "Menu sfondo",
                "left-2 top-2"
              )}
              <div className="relative space-y-2 rounded-xl border border-[hsl(var(--sidebar-border)/0.75)] bg-[hsl(var(--sidebar-card)/0.95)] p-3 shadow-[0_8px_20px_hsl(var(--sidebar-card-shadow)/0.18)]">
                {renderPreviewPicker("sidebarCard", "Menu card", "right-2 top-2")}
                <div className="h-3 w-24 rounded bg-[hsl(var(--sidebar-foreground)/0.18)]" />
                <div className="h-9 rounded-lg bg-[hsl(var(--sidebar-card-strong)/0.9)]" />
                <div className="h-8 rounded-lg bg-[hsl(var(--sidebar-card)/0.85)]" />
                <div className="h-8 rounded-lg bg-[hsl(var(--sidebar-card)/0.85)]" />
              </div>
            </div>
            <div className="relative space-y-3 bg-[hsl(var(--page))] p-3 text-[hsl(var(--foreground))]">
              {renderPreviewPicker(
                "pageBackground",
                "Pagina sfondo",
                "right-2 top-2"
              )}
              <div className="h-9 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))]" />
              <div className="relative rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-sm">
                {renderPreviewPicker(
                  "pageCard",
                  "Pagina card",
                  "right-2 top-2"
                )}
                <div className="mb-2 h-3 w-32 rounded bg-[hsl(var(--foreground)/0.14)]" />
                <div className="mb-3 h-2 w-full rounded bg-[hsl(var(--muted))]" />
                <div className="h-2 w-2/3 rounded bg-[hsl(var(--muted))]" />
              </div>
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2">
                <div className="mb-2 h-7 rounded-md bg-[hsl(var(--background))]" />
                <div className="h-14 rounded-md bg-[hsl(var(--background))]" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowPreview((current) => !current)}
          className="text-white/75 hover:bg-white/10 hover:text-white"
        >
          {showPreview ? (
            <EyeOff className="mr-2 h-4 w-4" />
          ) : (
            <Eye className="mr-2 h-4 w-4" />
          )}
          {showPreview ? "Nascondi anteprima" : "Visualizza anteprima"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleReset}
          disabled={saving}
          className="text-white/70 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Default
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving || !validation.canSave}
          className="bg-white text-slate-950 hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salva colori
        </Button>
      </div>
    </div>
  );
}
