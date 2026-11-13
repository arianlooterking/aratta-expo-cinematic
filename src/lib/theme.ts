import { useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  THEME_EVENT,
  THEME_EXCLUDED_PATH,
  THEME_STORAGE_KEY,
  themeInitScript,
} from "./theme-script.ts";

export { DEFAULT_THEME, THEME_EVENT, THEME_EXCLUDED_PATH, THEME_STORAGE_KEY, themeInitScript };

/**
 * Public-site colour theme. Dark is the designed look and the default whatever
 * the OS prefers; light is the owner's ivory-and-carpet-red alternative.
 *
 * The choice lives on <html data-theme> (set before first paint by
 * `themeInitScript`) and in localStorage. Every storage access is guarded, so
 * the site works with storage blocked: the switch then lasts for the visit.
 * The staff portal and admin screens keep their own palette, so the script
 * leaves them alone and the public header removes the attribute on unmount.
 */
export type Theme = "dark" | "light";

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode, site data off): the theme still applies.
  }
}

/** The theme on screen right now. Server side, and before any choice, dark. */
export function getTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: Theme) {
  if (typeof document === "undefined" || !isTheme(theme)) return;
  applyTheme(theme);
  writeStoredTheme(theme);
  window.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

export function toggleTheme() {
  setTheme(getTheme() === "light" ? "dark" : "light");
}

/**
 * Calls back on every change: a switch on this page (the custom event) or in
 * another tab (the storage event, which is applied here as well).
 */
export function subscribeTheme(callback: (theme: Theme) => void) {
  if (typeof window === "undefined") return () => {};
  const onTheme = (event: Event) => {
    const detail = (event as CustomEvent<Theme>).detail;
    callback(isTheme(detail) ? detail : getTheme());
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    const next = isTheme(event.newValue) ? event.newValue : DEFAULT_THEME;
    applyTheme(next);
    callback(next);
  };
  window.addEventListener(THEME_EVENT, onTheme);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(THEME_EVENT, onTheme);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Puts the stored theme (or dark) back on <html>. The public header calls it
 * on mount: React's development remount clears attributes the inline script
 * set, and a client navigation from the portal arrives without one.
 */
export function restoreTheme() {
  if (typeof document === "undefined") return;
  applyTheme(readStoredTheme() ?? DEFAULT_THEME);
}

/** Leaves the page to the portal's own palette (header unmount). */
export function clearTheme() {
  if (typeof document === "undefined") return;
  delete document.documentElement.dataset.theme;
}

const getServerTheme = (): Theme => DEFAULT_THEME;

export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
}
