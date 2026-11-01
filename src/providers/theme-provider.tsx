"use client";

import { createContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Theme } from "./theme";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  setTheme,
  subscribeToTheme,
} from "./theme-store";

type ThemeContextValue = {
  theme: Theme | null;
  setTheme: (theme: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

//
// Provee el tema actual y la función para cambiarlo a toda la aplicación.
//
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
