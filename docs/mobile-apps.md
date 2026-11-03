# Aratta Staff: iOS and Android apps

The staff apps are native iOS and Android apps built with
[Capacitor](https://capacitorjs.com). They open the live staff portal, so every
feature (hall map, CRM, accounting, tasks, hand-over, team) works exactly as on
the web, and portal fixes reach phones as soon as the site deploys, without a
store update. A new store build is only needed when the native part changes
(icon, permissions, plugins, Capacitor version).

| | |
| --- | --- |
| App name | Aratta Staff (کارکنان اَرَتَ on Persian Android phones) |
| Bundle / package ID | `ir.arattaexpo.staff` |
| Opens | `ARATTA_APP_URL` + `/fa/staff` (default `https://aratta-expo-cinematic.vercel.app`) |
| Native project | `capacitor.config.ts`, `android/`, `ios/`, `mobile/` |
| Portal glue | `src/components/native/NativeBridge.tsx`, `src/lib/native/*` |
| Push sender | `supabase/functions/push`, table `push_devices` |
| Builds | `.github/workflows/mobile-android.yml`, `.github/workflows/mobile-ios.yml` |

## What the app adds to the portal

- **Sign-in in the system browser.** Google blocks sign-in inside embedded web
  views, so Google and Apple sign-in open the phone's browser sheet and return
  through `ir.arattaexpo.staff://auth/callback`. The session then lives in the
  app like on the web.
- **Push notifications** for task assignments, status changes and comments
  (everything in `public.notifications`). Tapping one opens the task.
- **Exports** (CSV of companies, invoices, payments, receivables) open the share
  sheet, so they can be saved to Files or sent on WhatsApp, Telegram or mail.
- **Camera and photo library** in upload fields (floor plans, booth photos).
- **Android back button** closes the open sheet first, then goes back.
- **Full-screen layout** under the notch and home indicator, status-bar icons
  that follow the portal's light or dark theme, no accidental page zoom (the
  map keeps its own pinch zoom), splash screen, app icon, and a bilingual
  offline screen that reopens the portal when the connection returns.

## One-time setup

### 1. Supabase

1. Apply the migrations as usual (`supabase db push`). `20261103090700_push_devices.sql`
   adds the phone registry.
2. Authentication → URL Configuration → **Redirect URLs**: add
   `ir.arattaexpo.staff://auth/callback`. Without it sign-in in the app returns
   to the website instead of the app.

### 2. Android (no account needed to install)

1. Add the signing key as two GitHub secrets (Settings → Secrets and variables →
   Actions): `ANDROID_KEYSTORE_BASE64` and `ANDROID_KEYSTORE_PASSWORD` (alias
   `aratta-staff`, key password = keystore password; `ANDROID_KEY_ALIAS` and
   `ANDROID_KEY_PASSWORD` can override them). Keep the key backed up: every
   update must be signed with the same key.
2. Actions → **Mobile · Android** → Run workflow. A signed run publishes a
   GitHub release, and the team installs from one fixed link:
   `https://github.com/arianlooterking/aratta-expo-cinematic/releases/latest/download/aratta-staff.apk`
   (allow "Install unknown apps" for the browser when asked). Every run also
   keeps the `.apk` and the `.aab` for Google Play under **Artifacts**.

### 3. Google Play internal testing (optional)

1. Play Console (one-time $25): create the app with package `ir.arattaexpo.staff`.
2. Upload the first `.aab` by hand to **Testing → Internal testing**, add
   testers' Google accounts, and share the opt-in link.
3. For automatic uploads: Play Console → Setup → API access → link a Google
   Cloud service account with "Release manager" rights, and save its JSON key
   as the `PLAY_SERVICE_ACCOUNT_JSON` secret. Then run the workflow with
   "Send to Google Play" = internal.

### 4. iOS and TestFlight (Apple Developer Program, $99/year)

1. App Store Connect → Apps → **+** → New app, bundle ID `ir.arattaexpo.staff`
   (register the identifier first at developer.apple.com → Identifiers, with
   Push Notifications enabled).
2. App Store Connect → Users and Access → Integrations → **App Store Connect
   API** → generate a key with the **Admin** role (needed so the build can
   create its own certificates). Save as secrets: `ASC_KEY_ID`, `ASC_ISSUER_ID`,
   `ASC_KEY_P8_BASE64` (`base64 -i AuthKey_XXXX.p8`), and `APPLE_TEAM_ID`.
3. Actions → **Mobile · iOS** → Run workflow with "Send to TestFlight". The build
   appears in TestFlight after Apple processes it. Add colleagues under
   TestFlight → Internal testing (up to 100 team members, no review needed).

Later options: **TestFlight external testing** (up to 10,000 people, light
review) or a **private custom app** through Apple Business Manager, which is
how internal company apps are normally distributed outside the public store.

### 5. Push notifications

Android uses Firebase Cloud Messaging; iOS uses Apple's push service directly.

1. **Firebase** (free): create a project, add an Android app with package
   `ir.arattaexpo.staff`, download `google-services.json` and save its contents
   as the `GOOGLE_SERVICES_JSON` GitHub secret. Without it the Android app works
   but doesn't ask for notifications.
2. **Firebase service account**: Project settings → Service accounts →
   Generate new private key.
3. **Apple push key**: developer.apple.com → Keys → **+** → Apple Push
   Notifications service (APNs). Note the Key ID.
4. Deploy the sender: `supabase functions deploy push --no-verify-jwt`, then set
   its secrets: `PUSH_WEBHOOK_SECRET` (any long random string),
   `FCM_SERVICE_ACCOUNT` (the JSON from step 2), `APNS_KEY_P8` (contents of the
   .p8), `APNS_KEY_ID`, `APNS_TEAM_ID`.
5. Supabase → Database → Webhooks → **Create**: table `notifications`, event
   `Insert`, type "Supabase Edge Functions" → `push`, with HTTP header
   `x-push-secret: <PUSH_WEBHOOK_SECRET>`.

Notifications are written in the recipient's portal language. Tokens that
Apple or Google reject are removed automatically, and signing out removes the
phone so the next person who signs in on a shared phone gets their own alerts.

## Working on the app locally

```bash
npm run mobile:sync      # write the offline shell config, copy plugins into android/ and ios/
npm run mobile:android   # open in Android Studio (run on a phone or emulator)
npm run mobile:ios       # open in Xcode (macOS)
npm run mobile:icons     # regenerate icons and splash from mobile/assets
```

To point a build at a preview or local server, set `ARATTA_APP_URL` before
syncing, for example `ARATTA_APP_URL=http://192.168.1.20:3000 npm run mobile:android`.
In CI, set the repository **variable** `ARATTA_APP_URL` to change the address
for all builds. The address must be public: with Vercel's
"all except custom domains" deployment protection, even the `*.vercel.app`
production address asks for a Vercel login, so use "previews only"
protection or a custom domain (for example `staff.arattaexpo.ir`).

## Limits worth knowing

- The app needs a connection; it shows the offline screen without one.
- Public App Store listings review "website in an app" apps strictly. The
  native sign-in, push, share and camera integration help, but the intended
  routes are TestFlight, Apple Business Manager and Play internal testing or
  direct APK installs.
- Push and app sign-in need the Supabase project and the steps above; until
  then the app shows the portal's demo mode like the website does.
