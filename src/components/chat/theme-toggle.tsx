"use client";

import { useTheme } from "@/hooks";
import { ChatIcon } from "./chat-icon";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const label = theme === null ? "Alternar tema" : `Activar modo ${theme === "dark" ? "claro" : "oscuro"}`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-disabled={theme === null}
      onClick={() => {
        if (theme === null) return;
        setTheme(theme === "dark" ? "light" : "dark");
      }}
      className="theme-toggle grid size-10 shrink-0 place-items-center rounded-sm border border-border/80 bg-surface/30 text-foreground-secondary transition hover:border-primary/50 hover:bg-surface-elevated/60 hover:text-foreground"
    >
      <ChatIcon name="sun" className="theme-icon-sun size-5" />
      <ChatIcon name="moon" className="theme-icon-moon size-[18px]" />
    </button>
  );
}
