"use client";

import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, Loader2, LogIn, LogOut, Smartphone } from "lucide-react";
import type { Lang } from "@/lib/lang";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { isNativeApp, startNativeSignIn } from "@/lib/native/app";
import { signInProblem, type SignInProblem, type SignInProvider } from "@/lib/platform/sign-in";
import { AuthField, AuthFrame, authPrimaryButton } from "./AuthFrame";

type SignInPanelProps = {
  lang: Lang;
  next: string;
  error?: string | null;
  pending?: { email: string | null; suspended: boolean } | null;
  /** Google / Apple buttons, shown only once they are set up in Supabase. */
  providers?: readonly SignInProvider[];
};

const copy = {
  fa: {
    cardTitle: "ورود به حساب کاری",
    cardLead: "با ایمیل کاری و گذرواژه ای که مدیر سامانه به شما داده وارد شوید.",
    email: "ایمیل",
    password: "گذرواژه",
    showPassword: "نمایش گذرواژه",
    hidePassword: "پنهان کردن گذرواژه",
    submit: "ورود",
    signingIn: "در حال ورود…",
    or: "یا",
    google: "ادامه با Google",
    apple: "ادامه با Apple",
    redirecting: "در حال انتقال…",
    inviteOnly: "فقط همکارانی که مدیر سامانه اضافه کرده است وارد می شوند.",
    forgot: "گذرواژه را فراموش کرده اید؟ از مدیر سامانه بخواهید گذرواژه تازه ای برایتان بگذارد.",
    appleNote: "در ورود با Apple، گزینه «اشتراک ایمیل» را انتخاب کنید تا ایمیل شما با دعوت نامه یکسان باشد.",
    pendingTitle: "حساب شما هنوز فعال نیست",
    pendingBody: (email: string) =>
      `با ${email} وارد شده اید، اما این ایمیل در فهرست کارکنان فعال نیست. از مدیر سامانه بخواهید همین ایمیل را اضافه کند، سپس دوباره وارد شوید.`,
    suspendedBody: "دسترسی این حساب متوقف شده است. با مدیر سامانه تماس بگیرید.",
    signOut: "خروج و ورود با حساب دیگر",
    callbackError: "ورود کامل نشد. لطفا دوباره تلاش کنید.",
    providerError: "اتصال به سرویس ورود برقرار نشد.",
    unconfigured: "اتصال پایگاه داده هنوز تنظیم نشده است.",
    missing: "ایمیل و گذرواژه را وارد کنید.",
    problems: {
      credentials: "ایمیل یا گذرواژه درست نیست.",
      "too-many": "تلاش های زیادی انجام شد. چند دقیقه دیگر دوباره امتحان کنید.",
      offline: "اتصال برقرار نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.",
      unknown: "ورود انجام نشد. لطفا دوباره تلاش کنید.",
    } satisfies Record<SignInProblem, string>,
    getApp: "دریافت اپ موبایل برای اندروید و آیفون",
  },
  en: {
    cardTitle: "Sign in to your work account",
    cardLead: "Use your work email and the password your administrator gave you.",
    email: "Email",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    submit: "Sign in",
    signingIn: "Signing in…",
    or: "or",
    google: "Continue with Google",
    apple: "Continue with Apple",
    redirecting: "Redirecting…",
    inviteOnly: "Only colleagues an administrator has added can sign in.",
    forgot: "Forgot your password? Ask an administrator to set a new one for you.",
    appleNote: "With Apple, choose “Share My Email” so your address matches the invite.",
    pendingTitle: "Your account isn’t active yet",
    pendingBody: (email: string) =>
      `You’re signed in as ${email}, but that address isn’t on the active staff list. Ask an administrator to add this exact email, then sign in again.`,
    suspendedBody: "Access for this account has been suspended. Contact an administrator.",
    signOut: "Sign out and use another account",
    callbackError: "Sign-in didn’t finish. Please try again.",
    providerError: "Couldn’t reach the sign-in provider.",
    unconfigured: "The database connection hasn’t been configured yet.",
    missing: "Enter your email and password.",
    problems: {
      credentials: "That email or password isn’t right.",
      "too-many": "Too many attempts. Try again in a few minutes.",
      offline: "Couldn’t connect. Check your internet and try again.",
      unknown: "Sign-in didn’t work. Please try again.",
    } satisfies Record<SignInProblem, string>,
    getApp: "Get the phone app for Android and iPhone",
  },
} as const;

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.62l4 3.1C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M16.37 12.73c-.03-2.6 2.13-3.86 2.22-3.92-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.82 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.23 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.02 2.29-1.27 3.14-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.72-4.11ZM13.8 5.1c.71-.87 1.2-2.07 1.06-3.27-1.03.04-2.28.69-3.02 1.55-.66.76-1.24 1.99-1.09 3.16 1.15.09 2.33-.58 3.05-1.44Z" />
    </svg>
  );
}

export function SignInPanel({ lang, next, error, pending, providers = [] }: SignInPanelProps) {
  const t = copy[lang];
  const [busy, setBusy] = useState<"password" | SignInProvider | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const message =
    localError ??
    (error === "callback" ? t.callbackError : error === "unconfigured" ? t.unconfigured : null);

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setLocalError(t.unconfigured);
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      setLocalError(t.missing);
      return;
    }
    setBusy("password");
    setLocalError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setBusy(null);
        setLocalError(t.problems[signInProblem(signInError)]);
        return;
      }
    } catch (caught) {
      setBusy(null);
      setLocalError(t.problems[signInProblem(caught)]);
      return;
    }
    // A full page load, so the server reads the new session.
    window.location.assign(next);
  }

  async function signInWithProvider(provider: SignInProvider) {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setLocalError(t.unconfigured);
      return;
    }
    setBusy(provider);
    setLocalError(null);
    if (isNativeApp()) {
      // In the iOS / Android app, sign-in runs in the system browser and
      // returns through the app's link (see NativeBridge).
      try {
        await startNativeSignIn(provider, next, () => setBusy(null));
      } catch {
        setBusy(null);
        setLocalError(t.providerError);
      }
      return;
    }
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo.toString() },
    });
    if (oauthError) {
      setBusy(null);
      setLocalError(t.providerError);
    }
  }

  return (
    <AuthFrame lang={lang}>
      {pending ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900">
            <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <h2 className="font-semibold">{t.pendingTitle}</h2>
              <p className="text-sm leading-relaxed">
                {pending.suspended ? t.suspendedBody : t.pendingBody(pending.email ?? "—")}
              </p>
            </div>
          </div>
          <form action="/auth/sign-out" method="post">
            <input type="hidden" name="lang" value={lang} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#10211d]/15 px-4 py-3 text-sm font-semibold transition hover:bg-[#10211d]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              {t.signOut}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold">{t.cardTitle}</h2>
            <p className="text-sm text-[#65726d]">{t.cardLead}</p>
          </div>

          <form className="space-y-4" onSubmit={signInWithPassword} noValidate data-sign-in-form>
            <AuthField
              label={t.email}
              name="email"
              type="email"
              dir="ltr"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              placeholder="name@example.com"
              disabled={busy !== null}
            />
            <AuthField
              label={t.password}
              name="password"
              type={showPassword ? "text" : "password"}
              dir="ltr"
              required
              autoComplete="current-password"
              disabled={busy !== null}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  aria-pressed={showPassword}
                  className="grid h-9 w-9 place-items-center rounded-lg text-[#65726d] transition hover:bg-[#10211d]/5 focus-visible:outline-2 focus-visible:outline-[#198ba0]"
                >
                  {showPassword ? <EyeOff aria-hidden className="h-5 w-5" /> : <Eye aria-hidden className="h-5 w-5" />}
                </button>
              }
            />
            {message ? (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                {message}
              </p>
            ) : null}
            <button type="submit" disabled={busy !== null} className={authPrimaryButton}>
              {busy === "password" ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <LogIn aria-hidden className="h-5 w-5 rtl:-scale-x-100" />}
              {busy === "password" ? t.signingIn : t.submit}
            </button>
          </form>

          {providers.length ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-[#65726d]">
                <span className="h-px flex-1 bg-[#10211d]/10" />
                {t.or}
                <span className="h-px flex-1 bg-[#10211d]/10" />
              </div>
              {providers.includes("google") ? (
                <button
                  type="button"
                  onClick={() => signInWithProvider("google")}
                  disabled={busy !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#10211d]/15 bg-white px-4 py-3.5 text-sm font-semibold shadow-sm transition hover:border-[#10211d]/30 hover:shadow disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]"
                >
                  {busy === "google" ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <GoogleMark />}
                  {busy === "google" ? t.redirecting : t.google}
                </button>
              ) : null}
              {providers.includes("apple") ? (
                <button
                  type="button"
                  onClick={() => signInWithProvider("apple")}
                  disabled={busy !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-black px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/85 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]"
                >
                  {busy === "apple" ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <AppleMark />}
                  {busy === "apple" ? t.redirecting : t.apple}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2 border-t border-[#10211d]/10 pt-5 text-xs leading-relaxed text-[#65726d]">
            <p>{t.inviteOnly}</p>
            <p>{t.forgot}</p>
            {providers.includes("apple") ? <p>{t.appleNote}</p> : null}
            {/* Pointless inside the app itself (NativeBridge marks <html>). */}
            <a
              href={`/${lang}/app`}
              className="inline-flex items-center gap-1.5 pt-1 font-semibold text-[#126f80] underline-offset-4 hover:underline [.native-app_&]:hidden"
            >
              <Smartphone aria-hidden className="h-4 w-4" />
              {t.getApp}
            </a>
          </div>
        </div>
      )}
    </AuthFrame>
  );
}
