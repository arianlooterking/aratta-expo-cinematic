"use client";

import { useEffect } from "react";
import { SystemBars, SystemBarsStyle, type PluginListenerHandle } from "@capacitor/core";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { isNativeApp, nativePlatform, pushAvailable } from "@/lib/native/app";
import { langFromPath, notificationPath, parseAuthReturn, signInPathFor } from "@/lib/native/links";

const PUSH_CHANNEL = "aratta-updates";
const TOKEN_KEY = "aratta.app.pushToken";

/**
 * Glue between the portal and the iOS / Android app. Renders nothing and does
 * nothing in a normal browser. In the app it:
 * - finishes Google / Apple sign-in when the system browser hands back a code,
 * - registers the device for push notifications and opens tapped ones,
 * - maps the Android back button to closing sheets, then going back,
 * - keeps status-bar icons readable for the portal's light or dark theme,
 * - removes the device's push token on sign-out.
 */
export function NativeBridge() {
  useEffect(() => {
    if (!isNativeApp()) return;
    const platform = nativePlatform();
    const root = document.documentElement;
    root.classList.add("native-app");
    root.dataset.platform = platform;

    const handles: Array<Promise<PluginListenerHandle>> = [];
    let disposed = false;

    void import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide()).catch(() => {});

    // --- Sign-in return -----------------------------------------------------
    async function handleAuthUrl(raw: string | undefined) {
      const result = parseAuthReturn(raw);
      if (!result) return;
      void import("@capacitor/browser").then(({ Browser }) => Browser.close()).catch(() => {});
      if (result.kind === "error") {
        window.location.replace(`${signInPathFor(result.next)}?error=callback`);
        return;
      }
      // A launch URL can be reported again after a reload; use each code once.
      const seenKey = `aratta.app.code.${result.code.slice(0, 16)}`;
      try {
        if (sessionStorage.getItem(seenKey)) return;
        sessionStorage.setItem(seenKey, "1");
      } catch {
        // Storage may be unavailable; exchanging twice only fails the second time.
      }
      const supabase = getBrowserSupabase();
      const { error } = supabase
        ? await supabase.auth.exchangeCodeForSession(result.code)
        : { error: new Error("unconfigured") };
      window.location.replace(error ? `${signInPathFor(result.next)}?error=callback` : result.next);
    }

    void import("@capacitor/app").then(({ App }) => {
      if (disposed) return;
      handles.push(App.addListener("appUrlOpen", (event) => void handleAuthUrl(event.url)));
      void App.getLaunchUrl().then((launch) => handleAuthUrl(launch?.url));

      // --- Android back button -------------------------------------------
      handles.push(
        App.addListener("backButton", ({ canGoBack }) => {
          const dialog = document.querySelector('[aria-modal="true"], [role="dialog"]');
          if (dialog) {
            const target = document.activeElement ?? document.body;
            target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
            return;
          }
          if (canGoBack && !/\/staff\/?$/.test(window.location.pathname)) window.history.back();
          else void App.minimizeApp();
        }),
      );

      // Clear delivered notifications once someone is looking at the app.
      handles.push(
        App.addListener("resume", () => {
          void import("@capacitor/push-notifications")
            .then(({ PushNotifications }) => PushNotifications.removeAllDeliveredNotifications())
            .catch(() => {});
        }),
      );
    });

    // --- Status bar follows the portal theme ------------------------------
    let barStyle: SystemBarsStyle | null = null;
    const syncBars = () => {
      const portal = document.querySelector<HTMLElement>(".portal[data-theme]");
      // The sign-in screen is dark; the portal is light unless switched to dark.
      const style = !portal || portal.dataset.theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light;
      if (style === barStyle) return;
      barStyle = style;
      void SystemBars.setStyle({ style }).catch(() => {});
    };
    syncBars();
    const themeObserver = new MutationObserver(syncBars);
    themeObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-theme"], childList: true });

    // --- Push notifications ------------------------------------------------
    async function setUpPush() {
      if (!(await pushAvailable()) || disposed) return;
      if (/\/staff\/sign-in/.test(window.location.pathname)) return;
      const supabase = getBrowserSupabase();
      if (!supabase) return; // demo mode has no accounts to notify
      const { data } = await supabase.auth.getSession();
      if (!data.session || disposed) return;

      const { PushNotifications } = await import("@capacitor/push-notifications");
      handles.push(
        PushNotifications.addListener("registration", async ({ value }) => {
          try {
            localStorage.setItem(TOKEN_KEY, value);
          } catch {
            // Only needed to unregister on sign-out.
          }
          await supabase.rpc("register_push_device", {
            p_token: value,
            p_platform: platform === "ios" ? "ios" : "android",
          });
        }),
      );
      handles.push(
        PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
          const link = (notification.data as Record<string, unknown> | undefined)?.link;
          window.location.assign(notificationPath(langFromPath(window.location.pathname), link));
        }),
      );

      if (platform === "android") {
        await PushNotifications.createChannel({
          id: PUSH_CHANNEL,
          name: document.documentElement.lang === "en" ? "Portal updates" : "به روزرسانی های پورتال",
          description: "Tasks, comments and assignments",
          importance: 4,
          visibility: 0,
        }).catch(() => {});
      }

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive === "granted" && !disposed) await PushNotifications.register();
    }
    void setUpPush().catch(() => {});

    // --- Sign-out removes this device's token -------------------------------
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.dataset.nativeSignOut === "done") return;
      if (!/\/auth\/sign-out$/.test(new URL(form.action, window.location.href).pathname)) return;
      let token: string | null = null;
      try {
        token = localStorage.getItem(TOKEN_KEY);
      } catch {
        token = null;
      }
      const supabase = getBrowserSupabase();
      if (!token || !supabase) return;
      event.preventDefault();
      let submitted = false;
      const done = () => {
        if (submitted) return;
        submitted = true;
        try {
          localStorage.removeItem(TOKEN_KEY);
        } catch {
          // ignore
        }
        form.dataset.nativeSignOut = "done";
        form.submit();
      };
      const timeout = window.setTimeout(done, 2500);
      void Promise.resolve(supabase.rpc("unregister_push_device", { p_token: token })).finally(() => {
        window.clearTimeout(timeout);
        done();
      });
    };
    document.addEventListener("submit", onSubmit, true);

    return () => {
      disposed = true;
      themeObserver.disconnect();
      document.removeEventListener("submit", onSubmit, true);
      for (const handle of handles) void handle.then((h) => h.remove());
    };
  }, []);

  return null;
}
