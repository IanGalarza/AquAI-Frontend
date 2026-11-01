export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "aquai-theme";
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

//
// Indica si un valor es un tema válido.
//
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export const themeInitializationScript = `
  (() => {
    let theme = null;

    try {
      const storedTheme = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
      if (storedTheme === "light" || storedTheme === "dark") {
        theme = storedTheme;
      }
    } catch {}

    document.documentElement.dataset.theme = theme ?? (
      window.matchMedia(${JSON.stringify(SYSTEM_THEME_QUERY)}).matches ? "dark" : "light"
    );
  })();
`;
