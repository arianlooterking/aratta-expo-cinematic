"use client";

/**
 * Runtime side of the iOS / Android staff app. Every function is a no-op (or
 * returns false) in a normal browser, so portal code can call them freely.
 *
 * The apps load the live portal; Capacitor injects its bridge into the page,
 * and the plugin packages below talk to it.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { nativeRedirectTo } from "./links";

export type NativePlatform = "ios" | "android" | "web";

export function isNativeApp() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function nativePlatform(): NativePlatform {
  if (!isNativeApp()) return "web";
  const p = Capacitor.getPlatform();
  return p === "ios" || p === "android" ? p : "web";
}

type ArattaAppInfo = { pushAvailable: boolean };
const ArattaApp = registerPlugin<{ getInfo(): Promise<ArattaAppInfo> }>("ArattaApp");

/** Whether this build can receive push notifications. */
export async function pushAvailable() {
  const platform = nativePlatform();
  if (platform === "ios") return true;
  if (platform !== "android") return false;
  try {
    return (await ArattaApp.getInfo()).pushAvailable;
  } catch {
    return false;
  }
}

/**
 * Starts Google / Apple sign-in in the system browser. Google refuses sign-in
 * inside embedded web views, and the system sheet also lets people reuse the
 * account they're already signed into. The PKCE verifier stays in this web
 * view, so the code that comes back (see NativeBridge) is exchanged here.
 *
 * Resolves when the browser is open; rejects on a provider error.
 */
export async function startNativeSignIn(provider: "google" | "apple", next: string, onCancel: () => void) {
  const supabase = getBrowserSupabase();
  if (!supabase) throw new Error("unconfigured");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: nativeRedirectTo(next), skipBrowserRedirect: true },
  });
  if (error || !data?.url) throw error ?? new Error("no-url");
  const { Browser } = await import("@capacitor/browser");
  const finished = await Browser.addListener("browserFinished", () => {
    finished.remove();
    onCancel();
  });
  await Browser.open({ url: data.url, presentationStyle: "popover" });
}

/**
 * Saves a generated file. In the app this writes it to the cache and opens
 * the share sheet (Files, Drive, WhatsApp, Telegram, mail…). Returns false in
 * a browser so the caller can use a normal download.
 */
export async function shareTextFile(filename: string, text: string) {
  if (!isNativeApp()) return false;
  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);
  const safeName = filename.replace(/[\\/:*?"<>|]+/g, "-");
  const written = await Filesystem.writeFile({
    path: safeName,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  try {
    await Share.share({ title: safeName, files: [written.uri], dialogTitle: safeName });
  } catch (err) {
    // Closing the share sheet without picking a target isn't an error.
    if (!/cancel/i.test(String((err as Error)?.message ?? err))) throw err;
  }
  return true;
}
