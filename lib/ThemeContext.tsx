import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { THEMES, ThemeName, ThemePalette } from "./themes";

const STORAGE_KEY = "elpoint_theme";
const DEFAULT_THEME: ThemeName = "brasa";

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
  const base = { shadowOpacity: 1, shadowRadius: 0 };
  return {
    sm: {
      ...base,
      shadowColor: "#1c1b1b",
      shadowOffset: { width: 3, height: 3 },
      elevation: 4,
    },
    md: {
      ...base,
      shadowColor: "#1c1b1b",
      shadowOffset: { width: 4, height: 4 },
      elevation: 6,
    },
    lg: {
      ...base,
      shadowColor: "#1c1b1b",
      shadowOffset: { width: 6, height: 6 },
      elevation: 8,
    },
    primary: {
      ...base,
      shadowColor: C.primary,
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.5,
      elevation: 6,
    },
  };
}

type ThemeContextValue = {
  C: ThemePalette;
  shadow: ShadowMap;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  C: THEMES[DEFAULT_THEME],
  shadow: buildShadow(THEMES[DEFAULT_THEME]),
  themeName: DEFAULT_THEME,
  setTheme: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeState] = useState<ThemeName>(DEFAULT_THEME);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((saved) => {
      if (saved && saved in THEMES) setThemeState(saved as ThemeName);
    });
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name);
    SecureStore.setItemAsync(STORAGE_KEY, name);
  }, []);

  const value = useMemo(() => {
    const C = THEMES[themeName];
    return { C, shadow: buildShadow(C), themeName, setTheme };
  }, [themeName, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
