"use client";

import { useContext } from "react";
import { ThemeContext } from "@/providers/theme-provider";

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error("useTheme debe utilizarse dentro de un ThemeProvider.");
  }

  return context;
}
