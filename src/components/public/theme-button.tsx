"use client";

import { Moon, Sun } from "lucide-react";
import { toggleTheme, useTheme, resolvedTheme } from "@/components/shell/theme";

export function ThemeButton() {
  const choice = useTheme();
  const dark = choice !== null && (choice === "dark" || (choice === "system" && resolvedTheme() === "dark"));
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-md p-2 text-on-dark-muted transition-colors hover:bg-white/8 hover:text-on-dark"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
