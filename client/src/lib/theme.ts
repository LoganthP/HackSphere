export type Theme = "light" | "dark";

export const getTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("hs-theme", theme);
  } catch {
    /* storage unavailable */
  }
}
