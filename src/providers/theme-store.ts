"use client";

import { isTheme, SYSTEM_THEME_QUERY, THEME_STORAGE_KEY, type Theme } from "./theme";

const listeners = new Set<() => void>();
let selectedTheme: Theme | null = null;

//
// Lee el tema guardado en el almacenamiento local, si es válido.
//
function readStoredTheme(): Theme | null {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

//
// Aplica el tema al documento y avisa a los suscriptores.
//
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  listeners.forEach((listener) => listener());
}

//
// Devuelve el tema aplicado actualmente en el documento.
//
export function getThemeSnapshot(): Theme | null {
  const theme = document.documentElement.dataset.theme;
  return isTheme(theme) ? theme : null;
}

//
// Devuelve el estado del tema en el servidor, siempre sin definir.
//
export function getServerThemeSnapshot(): null {
  return null;
}

//
// Suscribe un oyente a los cambios de tema y sincroniza con la preferencia del sistema.
//
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

//
// Establece el tema, lo aplica y lo guarda en el almacenamiento local.
//
export function setTheme(theme: Theme): void {
  selectedTheme = theme;
  applyTheme(theme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {

  }
}
