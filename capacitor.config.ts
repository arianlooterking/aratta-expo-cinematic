import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native staff app for iOS and Android.
 *
 * The app opens the live staff portal, so every feature and fix ships to
 * phones as soon as the site deploys. `mobile/shell` is bundled inside the app
 * and only shows when the portal can't be reached (offline screen).
 *
 * Point a build at another deployment with ARATTA_APP_URL, e.g.
 *   ARATTA_APP_URL=https://staging.example.com npx cap sync
 */
const appUrl = (process.env.ARATTA_APP_URL ?? "https://aratta-expo-cinematic.vercel.app").replace(/\/+$/, "");
const host = new URL(appUrl).host;

const config: CapacitorConfig = {
  appId: "ir.arattaexpo.staff",
  appName: "Aratta Staff",
  webDir: "mobile/shell",
  // Lets the portal tell it is running inside the app.
  appendUserAgent: "ArattaStaffApp/1",
  backgroundColor: "#071713",
  server: {
    url: `${appUrl}/fa/staff`,
    allowNavigation: [host],
    errorPath: "offline.html",
    // Only for pointing a test build at a local http:// dev server.
    cleartext: appUrl.startsWith("http:"),
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: "never",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 4000,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: "#071713",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: false,
      splashImmersive: false,
    },
    SystemBars: {
      // Safe-area insets reach the page as env(safe-area-inset-*); staff pages pad with them.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "DARK",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
