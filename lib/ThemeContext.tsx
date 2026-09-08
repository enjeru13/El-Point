import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import {
  SCHEMES,
  ThemeMode,
  ThemePalette,
  ThemeScheme,
} from "./themes";

const STORAGE_KEY = "elpoint_theme_mode";
const DEFAULT_MODE: ThemeMode = "system";

type Shadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

type ShadowMap = {
  sm: Shadow;
  md: Shadow;
  lg: Shadow;
  primary: Shadow;
};

function buildShadow(C: ThemePalette): ShadowMap {
  // Soft elevation, not hard neo-brutalist offset.
  return {
    sm: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
    primary: {
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.28,
      shadowRadius: 8,
      elevation: 4,
    },
  };
}

type ThemeContextValue = {
  C: ThemePalette;
  shadow: ShadowMap;
  /** The user's stored preference. */
  mode: ThemeMode;
  /** The palette actually in use right now ("system" resolved). */
  scheme: ThemeScheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  C: SCHEMES.light,
  shadow: buildShadow(SCHEMES.light),
  mode: DEFAULT_MODE,
  scheme: "light",
  setMode: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const os = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => {
    const scheme: ThemeScheme =
      mode === "system" ? (os === "dark" ? "dark" : "light") : mode;
    const C = SCHEMES[scheme];
    return { C, shadow: buildShadow(C), mode, scheme, setMode };
  }, [mode, os, setMode]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
