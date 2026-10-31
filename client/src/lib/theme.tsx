import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "hs-theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const CANVAS = { light: "#F8FAFF", dark: "#161a33" };

function parsePreference(value: string | null): ThemePreference {
  return value === "dark" || value === "system" ? value : "light";
}

function readPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "light";
  }
}

function deviceTheme(): ResolvedTheme {
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setStoredPreference] = useState(readPreference);
  const [systemTheme, setSystemTheme] = useState(deviceTheme);
  const resolvedTheme = preference === "system" ? systemTheme : preference;

  const setPreference = useCallback((next: ThemePreference) => {
    if (next === "system") setSystemTheme(deviceTheme());
    setStoredPreference(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The preference still works for this session when storage is unavailable.
    }
  }, []);

  useLayoutEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia(MEDIA_QUERY);
    const update = () => setSystemTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  useLayoutEffect(() => {
    const sync = (event: StorageEvent) => {
      try {
        if (event.storageArea && event.storageArea !== localStorage) return;
      } catch {
        return;
      }
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const next = parsePreference(event.newValue);
      if (next === "system") setSystemTheme(deviceTheme());
      setStoredPreference(next);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", CANVAS[resolvedTheme]);
  }, [resolvedTheme]);

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
