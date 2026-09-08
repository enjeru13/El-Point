export type ThemePalette = {
  // Primary
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  primaryFixed: string;
  primaryFixedDim: string;
  // Secondary
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  // Tertiary
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  // Surface
  background: string;
  surface: string;
  surfaceDim: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  // On-surface
  onSurface: string;
  onSurfaceVariant: string;
  // Outline
  outline: string;
  outlineVariant: string;
  // Error
  error: string;
  onError: string;
  // Card / control border (soft, not hard black)
  border: string;
};

/** User-facing preference. "system" follows the OS setting. */
export type ThemeMode = "light" | "dark" | "system";
/** The two real palettes a resolved theme can be. */
export type ThemeScheme = "light" | "dark";

const BRAND = "#c8451f";

const light: ThemePalette = {
  primary: BRAND,
  onPrimary: "#ffffff",
  primaryContainer: "#ff6b35",
  onPrimaryContainer: "#5a1800",
  primaryFixed: "#ffe1d6",
  primaryFixedDim: "#ffb59e",
  secondary: "#00695c",
  onSecondary: "#ffffff",
  secondaryContainer: "#5ce0cf",
  onSecondaryContainer: "#00382f",
  tertiary: "#6f5092",
  onTertiary: "#ffffff",
  tertiaryContainer: "#e6d9f5",
  onTertiaryContainer: "#391b5a",
  background: "#fdf8f6",
  surface: "#fdf8f6",
  surfaceDim: "#e7e0dc",
  surfaceContainerLow: "#f8f2ef",
  surfaceContainer: "#f3ece8",
  surfaceContainerHigh: "#ece5e1",
  surfaceContainerHighest: "#e6ded9",
  onSurface: "#1c1b1b",
  onSurfaceVariant: "#5b4038",
  outline: "#8f7067",
  outlineVariant: "#e7d9d2",
  error: "#ba1a1a",
  onError: "#ffffff",
  border: "#e0d3cc",
};

const dark: ThemePalette = {
  primary: "#ff6a3d",
  onPrimary: "#1a1a1a",
  primaryContainer: "#ff6a3d",
  onPrimaryContainer: "#ffffff",
  primaryFixed: "#232326",
  primaryFixedDim: "#2e2e32",
  secondary: "#3ad6c4",
  onSecondary: "#0a0a0a",
  secondaryContainer: "#173d38",
  onSecondaryContainer: "#a8f0e6",
  tertiary: "#b9a3e8",
  onTertiary: "#12121a",
  tertiaryContainer: "#2c2740",
  onTertiaryContainer: "#e4dcff",
  background: "#0b0b0d",
  surface: "#141417",
  surfaceDim: "#0b0b0d",
  surfaceContainerLow: "#17171b",
  surfaceContainer: "#1c1c20",
  surfaceContainerHigh: "#242429",
  surfaceContainerHighest: "#2c2c32",
  onSurface: "#f4f4f5",
  onSurfaceVariant: "#b4b4b8",
  outline: "#8a8a90",
  outlineVariant: "#34343b",
  error: "#e5484d",
  onError: "#ffffff",
  border: "#35353c",
};

export const SCHEMES: Record<ThemeScheme, ThemePalette> = { light, dark };

export const THEME_MODE_META: { mode: ThemeMode; label: string; icon: string }[] =
  [
    { mode: "light", label: "Claro", icon: "sun" },
    { mode: "dark", label: "Oscuro", icon: "moon" },
    { mode: "system", label: "Sistema", icon: "monitor" },
  ];
