"use client";

import { useSyncExternalStore } from "react";

export type ThemeChoice = "light" | "dark" | "system";
const KEY = "tpd-theme";
const subs = new Set<() => void>();

function read(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark") return t;
  } catch {}
  return "system";
}

export function setTheme(choice: ThemeChoice) {
  const el = document.documentElement;
  try {
    if (choice === "system") {
      localStorage.removeItem(KEY);
      delete el.dataset.theme;
    } else {
      localStorage.setItem(KEY, choice);
      el.dataset.theme = choice;
    }
  } catch {}
  subs.forEach((s) => s());
}

export function resolvedTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function toggleTheme() {
  setTheme(resolvedTheme() === "dark" ? "light" : "dark");
}

export function useTheme(): ThemeChoice | null {
  return useSyncExternalStore(
    (l) => {
      subs.add(l);
      return () => subs.delete(l);
    },
    read,
    () => null,
  );
}
