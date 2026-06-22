import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "theme:v1";
const LEGACY_THEME_KEY = "theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function loadTheme(): Theme {
  try {
    const versionedTheme = localStorage.getItem(THEME_KEY);
    if (isTheme(versionedTheme)) return versionedTheme;

    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    if (isTheme(legacyTheme)) return legacyTheme;
  } catch {
    // localStorage can be unavailable; fall back to system without blocking UI.
  }

  return "system";
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    // Ignore storage failures; the applied theme still updates for this session.
  }
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  return { theme, setTheme } as const;
}
