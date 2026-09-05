"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** ThemeScript has already written the attribute before hydration. */
function readTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function writeTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
  listeners.forEach((listener) => listener());
}

/** Switches the html data-theme attribute; system preference is the default. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as const);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => writeTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
