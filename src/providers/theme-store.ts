"use client";

import { isTheme, SYSTEM_THEME_QUERY, THEME_STORAGE_KEY, type Theme } from "./theme";

const listeners = new Set<() => void>();
let selectedTheme: Theme | null = null;

function readStoredTheme(): Theme | null {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  listeners.forEach((listener) => listener());
}

export function getThemeSnapshot(): Theme | null {
  const theme = document.documentElement.dataset.theme;
  return isTheme(theme) ? theme : null;
}

// El renderizado del servidor y la primera hidratación deben exponer el mismo estado.
export function getServerThemeSnapshot(): null {
  return null;
}

export function subscribeToTheme(listener: () => void): () => void {
  const systemTheme = window.matchMedia(SYSTEM_THEME_QUERY);

  function synchronizeTheme(): void {
    applyTheme(selectedTheme ?? (systemTheme.matches ? "dark" : "light"));
  }

  if (selectedTheme === null) {
    selectedTheme = readStoredTheme();
  }
  listeners.add(listener);
  synchronizeTheme();
  systemTheme.addEventListener("change", synchronizeTheme);

  return () => {
    listeners.delete(listener);
    systemTheme.removeEventListener("change", synchronizeTheme);
  };
}

export function setTheme(theme: Theme): void {
  selectedTheme = theme;
  applyTheme(theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {

  }
}
