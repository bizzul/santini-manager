import type { CSSProperties } from "react";

export const SITE_THEME_SETTING_KEY = "theme_colors";
export const SITE_THEME_MODE_VALUES = ["light", "dark", "adaptive"] as const;
export const SITE_THEME_MODE_STORAGE_KEY = "site_theme_mode_override";

export type SiteThemeMode = (typeof SITE_THEME_MODE_VALUES)[number];

export type SiteThemeColors = {
  pageCard: string;
  pageBackground: string;
  sidebarCard: string;
  sidebarBackground: string;
};

export type SiteThemeSettings = {
  mode: SiteThemeMode;
  light: SiteThemeColors;
  dark: SiteThemeColors;
  adaptive: SiteThemeColors;
};

export type SiteThemePreset = {
  id: string;
  label: string;
  description: string;
  colors: SiteThemeColors;
};

export const DEFAULT_SITE_THEME_COLORS_LIGHT: SiteThemeColors = {
  pageCard: "#E7EBF1",
  pageBackground: "#F6F8FB",
  sidebarCard: "#E8EDF3",
  sidebarBackground: "#DCE3EB",
};

export const DEFAULT_SITE_THEME_COLORS_DARK: SiteThemeColors = {
  pageCard: "#1B1E24",
  pageBackground: "#101217",
  sidebarCard: "#222730",
  sidebarBackground: "#151921",
};

export const DEFAULT_SITE_THEME_COLORS_ADAPTIVE: SiteThemeColors = {
  pageCard: "#E5DCCB",
  pageBackground: "#F3EDE2",
  sidebarCard: "#EDE3D2",
  sidebarBackground: "#E1D6C2",
};

export const SITE_THEME_PRESETS: SiteThemePreset[] = [
  {
    id: "neutral-balanced",
    label: "Base consigliata",
    description: "Bilanciata per leggibilità e gerarchia",
    colors: {
      pageCard: "#E7EBF1",
      pageBackground: "#F6F8FB",
      sidebarCard: "#E8EDF3",
      sidebarBackground: "#DCE3EB",
    },
  },
  {
    id: "warm-paper",
    label: "Carta calda",
    description: "Bianco sporco caldo e leggibile",
    colors: {
      pageCard: "#E8E1D4",
      pageBackground: "#F3EEE6",
      sidebarCard: "#EEE6D8",
      sidebarBackground: "#E2D9C9",
    },
  },
  {
    id: "dark-slate",
    label: "Ardesia scura",
    description: "Dark elegante scala grigi/nero",
    colors: {
      pageCard: "#1B1E24",
      pageBackground: "#101217",
      sidebarCard: "#222730",
      sidebarBackground: "#151921",
    },
  },
];

export const DEFAULT_SITE_THEME_SETTINGS: SiteThemeSettings = {
  mode: "dark",
  light: DEFAULT_SITE_THEME_COLORS_LIGHT,
  dark: DEFAULT_SITE_THEME_COLORS_DARK,
  adaptive: DEFAULT_SITE_THEME_COLORS_ADAPTIVE,
};

// Backward compatibility alias
export const DEFAULT_SITE_THEME_COLORS = DEFAULT_SITE_THEME_COLORS_LIGHT;

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

type HslColor = {
  h: number;
  s: number;
  l: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function expandShortHex(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 3) return `#${normalized}`;
  return `#${normalized
    .split("")
    .map((char) => `${char}${char}`)
    .join("")}`;
}

export function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) return fallback;

  return expandShortHex(trimmed).toUpperCase();
}

export function resolveSiteThemeColors(value: unknown): SiteThemeColors {
  const source =
    value && typeof value === "object"
      ? (value as Partial<Record<keyof SiteThemeColors, unknown>>)
      : {};

  return {
    pageCard: normalizeHexColor(
      source.pageCard,
      DEFAULT_SITE_THEME_COLORS_LIGHT.pageCard
    ),
    pageBackground: normalizeHexColor(
      source.pageBackground,
      DEFAULT_SITE_THEME_COLORS_LIGHT.pageBackground
    ),
    sidebarCard: normalizeHexColor(
      source.sidebarCard,
      DEFAULT_SITE_THEME_COLORS_LIGHT.sidebarCard
    ),
    sidebarBackground: normalizeHexColor(
      source.sidebarBackground,
      DEFAULT_SITE_THEME_COLORS_LIGHT.sidebarBackground
    ),
  };
}

export function resolveSiteThemeSettings(value: unknown): SiteThemeSettings {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const isLegacyShape =
    source.pageCard ||
    source.pageBackground ||
    source.sidebarCard ||
    source.sidebarBackground;

  if (isLegacyShape) {
    return {
      ...DEFAULT_SITE_THEME_SETTINGS,
      light: resolveSiteThemeColors(source),
    };
  }

  const mode = SITE_THEME_MODE_VALUES.includes(source.mode as SiteThemeMode)
    ? (source.mode as SiteThemeMode)
    : DEFAULT_SITE_THEME_SETTINGS.mode;

  return {
    mode,
    light: resolveSiteThemeColors(source.light),
    dark: resolveSiteThemeColors({
      ...DEFAULT_SITE_THEME_COLORS_DARK,
      ...(source.dark && typeof source.dark === "object"
        ? (source.dark as Record<string, unknown>)
        : {}),
    }),
    adaptive: resolveSiteThemeColors({
      ...DEFAULT_SITE_THEME_COLORS_ADAPTIVE,
      ...(source.adaptive && typeof source.adaptive === "object"
        ? (source.adaptive as Record<string, unknown>)
        : {}),
    }),
  };
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex, "#000000").replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    switch (max) {
      case red:
        h = ((green - blue) / delta) % 6;
        break;
      case green:
        h = (blue - red) / delta + 2;
        break;
      default:
        h = (red - green) / delta + 4;
        break;
    }

    h *= 60;
    if (h < 0) h += 360;
  }

  const s =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h,
    s: s * 100,
    l: l * 100,
  };
}

function hexToHsl(hex: string) {
  return rgbToHsl(hexToRgb(hex));
}

function formatHslValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function toCssHsl(color: HslColor) {
  return `${formatHslValue(color.h)} ${formatHslValue(color.s)}% ${formatHslValue(color.l)}%`;
}

function shiftHsl(
  color: HslColor,
  adjustments: Partial<{ h: number; s: number; l: number }>
) {
  return {
    h: (color.h + (adjustments.h ?? 0) + 360) % 360,
    s: clamp(color.s + (adjustments.s ?? 0), 0, 100),
    l: clamp(color.l + (adjustments.l ?? 0), 0, 100),
  };
}

function getReadableForeground(color: HslColor) {
  return color.l < 58
    ? "210 40% 98%"
    : "222.2 84% 4.9%";
}

function getContrastRatio(l1: number, l2: number) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function getContrastRatioFromHex(firstHex: string, secondHex: string) {
  const firstLum = getRelativeLuminance(firstHex);
  const secondLum = getRelativeLuminance(secondHex);
  return getContrastRatio(firstLum, secondLum);
}

function getReadableForegroundFromHex(hex: string) {
  const luminance = getRelativeLuminance(hex);
  const whiteContrast = getContrastRatio(1, luminance);
  const blackContrast = getContrastRatio(0, luminance);
  return whiteContrast >= blackContrast
    ? "210 40% 98%"
    : "222.2 84% 4.9%";
}

export function getReadableTextColorHex(hex: string) {
  const luminance = getRelativeLuminance(hex);
  const whiteContrast = getContrastRatio(1, luminance);
  const blackContrast = getContrastRatio(0, luminance);
  return whiteContrast >= blackContrast ? "#F8FAFC" : "#111827";
}

function getMutedForegroundFromHex(hex: string, foreground: string) {
  const isDarkForeground = foreground === "222.2 84% 4.9%";
  const luminance = getRelativeLuminance(hex);

  if (isDarkForeground) {
    // Dark text on light surfaces.
    return luminance > 0.72 ? "220 10% 28%" : "220 10% 32%";
  }

  // Light text on dark surfaces.
  return luminance < 0.18 ? "215 18% 78%" : "215 18% 74%";
}

function blendHexColors(baseHex: string, mixHex: string, amount: number) {
  const clamped = clamp(amount, 0, 1);
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHex);

  const r = Math.round(base.r + (mix.r - base.r) * clamped);
  const g = Math.round(base.g + (mix.g - base.g) * clamped);
  const b = Math.round(base.b + (mix.b - base.b) * clamped);

  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

export function resolveAdaptiveThemeColors(
  baseColors: SiteThemeColors,
  sunlightLevel: number
): SiteThemeColors {
  const clampedSunlight = clamp(sunlightLevel, 0, 1);
  const delta = clampedSunlight - 0.5;

  const target = delta >= 0 ? "#FFFFFF" : "#111827";
  const amount = Math.abs(delta) * (delta >= 0 ? 0.28 : 0.34);

  return {
    pageBackground: blendHexColors(baseColors.pageBackground, target, amount),
    pageCard: blendHexColors(baseColors.pageCard, target, amount * 0.9),
    sidebarBackground: blendHexColors(
      baseColors.sidebarBackground,
      target,
      amount * 1.1
    ),
    sidebarCard: blendHexColors(baseColors.sidebarCard, target, amount),
  };
}

export function getEstimatedSunlightLevel(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const radians = ((hour - 6) / 12) * Math.PI;
  return Math.max(0, Math.sin(radians));
}

export function validateSiteThemeColors(colors: SiteThemeColors) {
  const normalized = resolveSiteThemeColors(colors);
  const issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const pageSeparation = getContrastRatioFromHex(
    normalized.pageCard,
    normalized.pageBackground
  );
  const sidebarSeparation = getContrastRatioFromHex(
    normalized.sidebarCard,
    normalized.sidebarBackground
  );
  const pageTextContrast = getContrastRatioFromHex(
    normalized.pageCard,
    getReadableTextColorHex(normalized.pageCard)
  );
  const sidebarTextContrast = getContrastRatioFromHex(
    normalized.sidebarCard,
    getReadableTextColorHex(normalized.sidebarCard)
  );

  if (pageSeparation < 1.08) {
    issues.push(
      "Card schermate e sfondo schermate sono troppo simili: aumenta leggermente il contrasto."
    );
  }
  if (sidebarSeparation < 1.1) {
    issues.push(
      "Card menu e sfondo menu sono troppo simili: aumenta il distacco visivo."
    );
  }
  if (pageTextContrast < 4.5) {
    issues.push(
      "Il contrasto testo nelle card schermate non è sufficiente per una lettura comoda."
    );
  }
  if (sidebarTextContrast < 4.5) {
    issues.push(
      "Il contrasto testo nelle card menu non è sufficiente per una lettura comoda."
    );
  }

  if (pageSeparation < 1.16) {
    warnings.push(
      "Il distacco tra card e sfondo schermate è minimo: potresti alzarlo per migliorare la gerarchia."
    );
  }
  if (sidebarSeparation < 1.18) {
    warnings.push(
      "Il menu laterale è poco separato: aumenta leggermente il contrasto tra card e canvas."
    );
  }

  suggestions.push(
    "Mantieni la differenza card/sfondo tra il 6% e il 14% di luminosità per un equilibrio visivo."
  );
  suggestions.push(
    "Per contenuti densi (tabelle/liste), privilegia sfondi più neutri e card appena più contrastate."
  );

  return {
    normalized,
    canSave: issues.length === 0,
    issues,
    warnings,
    suggestions,
  };
}

export function buildSiteThemeStyleVars(
  input: SiteThemeColors
): CSSProperties {
  const theme = resolveSiteThemeColors(input);

  const pageBackground = hexToHsl(theme.pageBackground);
  const pageCard = hexToHsl(theme.pageCard);
  const sidebarBackground = hexToHsl(theme.sidebarBackground);
  const sidebarCard = hexToHsl(theme.sidebarCard);

  const pageForeground = getReadableForegroundFromHex(theme.pageCard);
  const sidebarForeground = getReadableForegroundFromHex(theme.sidebarCard);

  return {
    "--page": toCssHsl(pageBackground),
    "--page-soft": toCssHsl(shiftHsl(pageBackground, { l: -3, s: -4 })),
    "--page-glow": toCssHsl(shiftHsl(pageBackground, { l: 2, s: 4 })),
    "--page-shadow": toCssHsl(shiftHsl(pageBackground, { l: -9, s: -2 })),
    "--background": toCssHsl(pageCard),
    "--card": toCssHsl(pageCard),
    "--popover": toCssHsl(shiftHsl(pageCard, { l: 1 })),
    "--secondary": toCssHsl(shiftHsl(pageCard, { l: -2, s: -5 })),
    "--muted": toCssHsl(shiftHsl(pageCard, { l: -1, s: -6 })),
    "--accent": toCssHsl(shiftHsl(pageCard, { l: -4, s: -3 })),
    "--border": toCssHsl(shiftHsl(pageCard, { l: -10, s: -8 })),
    "--input": toCssHsl(shiftHsl(pageCard, { l: -7, s: -8 })),
    "--foreground": pageForeground,
    "--card-foreground": pageForeground,
    "--popover-foreground": pageForeground,
    "--secondary-foreground": pageForeground,
    "--accent-foreground": pageForeground,
    "--muted-foreground": getMutedForegroundFromHex(theme.pageCard, pageForeground),
    "--sidebar": toCssHsl(sidebarBackground),
    "--sidebar-accent": toCssHsl(sidebarCard),
    "--sidebar-border": toCssHsl(shiftHsl(sidebarCard, { l: -12, s: -8 })),
    "--sidebar-card": toCssHsl(sidebarCard),
    "--sidebar-card-strong": toCssHsl(shiftHsl(sidebarCard, { l: -5, s: -4 })),
    "--sidebar-card-shadow": toCssHsl(
      shiftHsl(sidebarBackground, { l: -12, s: -2 })
    ),
    "--sidebar-foreground": sidebarForeground,
    "--sidebar-accent-foreground": sidebarForeground,
  } as CSSProperties;
}
