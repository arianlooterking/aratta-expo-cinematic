/**
 * Pure helpers for the iOS / Android staff app (see capacitor.config.ts).
 * Kept free of browser and Capacitor imports so they can be unit tested.
 */
import { safeNextPath } from "../platform/redirects.ts";

/** Custom URL scheme registered by both apps (Info.plist, AndroidManifest). */
export const APP_SCHEME = "ir.arattaexpo.staff";

/** Where Supabase sends the app after Google / Apple sign-in. */
export const NATIVE_AUTH_CALLBACK = `${APP_SCHEME}://auth/callback`;

/** Marker the apps append to their user agent. */
export const APP_USER_AGENT_MARK = "ArattaStaffApp/";

export function isAppUserAgent(userAgent: string | null | undefined) {
  return Boolean(userAgent?.includes(APP_USER_AGENT_MARK));
}

/** Redirect target handed to Supabase when signing in from the app. */
export function nativeRedirectTo(next: string) {
  const url = new URL(NATIVE_AUTH_CALLBACK);
  url.searchParams.set("next", safeNextPath(next, "/fa/staff"));
  return url.toString();
}

export type AuthReturn =
  | { kind: "code"; code: string; next: string }
  | { kind: "error"; next: string; message: string | null };

/**
 * Reads the deep link the app is opened with after sign-in, e.g.
 * `ir.arattaexpo.staff://auth/callback?code=...&next=/fa/staff`.
 * Returns null for any other link.
 */
export function parseAuthReturn(raw: string | null | undefined): AuthReturn | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${APP_SCHEME}:`) return null;
  // Custom-scheme URLs put "auth" in the host on some platforms and in the path on others.
  const route = `${url.host}${url.pathname}`.replace(/^\/+|\/+$/g, "");
  if (route !== "auth/callback") return null;

  // Errors may arrive in the query or, for implicit flows, in the fragment.
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const read = (key: string) => url.searchParams.get(key) ?? hash.get(key);
  const next = safeNextPath(read("next"), "/fa/staff");
  const code = read("code");
  if (code) return { kind: "code", code, next };
  return { kind: "error", next, message: read("error_description") ?? read("error") };
}

/** Sign-in page for the language of a portal path. */
export function signInPathFor(next: string) {
  return next.startsWith("/en") ? "/en/staff/sign-in" : "/fa/staff/sign-in";
}

/**
 * Turns a notification's link (stored without a language, e.g.
 * `/staff/tasks/123`) into a path in the current language. Anything that
 * isn't a staff path falls back to the portal home.
 */
export function notificationPath(lang: "fa" | "en", link: unknown) {
  const home = `/${lang}/staff`;
  if (typeof link !== "string") return home;
  const path = safeNextPath(link, "");
  if (!path) return home;
  if (/^\/(fa|en)\/staff(\/|$|\?)/.test(path)) return path;
  if (/^\/staff(\/|$|\?)/.test(path)) return `/${lang}${path}`;
  return home;
}

/** Language of the page the app is showing. */
export function langFromPath(pathname: string): "fa" | "en" {
  return pathname.startsWith("/en") ? "en" : "fa";
}
