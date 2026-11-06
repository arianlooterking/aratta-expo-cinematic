"use client";

import Image from "next/image";
import { useState } from "react";
import { AlertTriangle, Loader2, LogOut, ShieldCheck, Smartphone } from "lucide-react";
import type { Lang } from "@/lib/lang";
import { getBrandAssets } from "@/lib/brand-assets";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { isNativeApp, startNativeSignIn } from "@/lib/native/app";

type Provider = "google" | "apple";

type SignInPanelProps = {
  lang: Lang;
  next: string;
  error?: string | null;
  pending?: { email: string | null; suspended: boolean } | null;
};

const copy = {
  fa: {
    eyebrow: "پورتال کارکنان",
    title: "مرکز عملیات نمایشگاهی اَرَتَ",
    lead: "نقشه سالن ها، فروش غرفه، پیش فاکتور و وصول، تجهیزات و تحویل، و کارهای تیم؛ همه در یک فضای مشترک و زنده.",
    highlights: ["تغییرات هم زمان برای همه همکاران", "دسترسی بر اساس نقش", "ثبت کامل تاریخچه تغییرات"],
    cardTitle: "ورود به حساب کاری",
    cardLead: "با حسابی وارد شوید که مدیر سامانه برای شما دعوت کرده است.",
    google: "ادامه با Google",
    apple: "ادامه با Apple",
    redirecting: "در حال انتقال…",
    inviteOnly: "فقط ایمیل هایی که دعوت شده اند وارد می شوند.",
    appleNote: "در ورود با Apple، گزینه «اشتراک ایمیل» را انتخاب کنید تا ایمیل شما با دعوت نامه یکسان باشد.",
    pendingTitle: "حساب شما هنوز فعال نیست",
    pendingBody: (email: string) =>
      `با ${email} وارد شده اید، اما این ایمیل در فهرست کارکنان فعال نیست. از مدیر سامانه بخواهید همین ایمیل را دعوت کند، سپس دوباره وارد شوید.`,
    suspendedBody: "دسترسی این حساب متوقف شده است. با مدیر سامانه تماس بگیرید.",
    signOut: "خروج و ورود با حساب دیگر",
    callbackError: "ورود کامل نشد. لطفا دوباره تلاش کنید.",
    providerError: "اتصال به سرویس ورود برقرار نشد.",
    unconfigured: "اتصال پایگاه داده هنوز تنظیم نشده است.",
    getApp: "دریافت اپ موبایل برای اندروید و آیفون",
  },
  en: {
    eyebrow: "Staff portal",
    title: "Aratta Exhibition Operations",
    lead: "Hall plans, booth sales, invoices and collections, equipment hand-over and team tasks in one shared, live workspace.",
    highlights: ["Live updates for every colleague", "Role-based access", "Full change history"],
    cardTitle: "Sign in to your work account",
    cardLead: "Use the account your administrator invited.",
    google: "Continue with Google",
    apple: "Continue with Apple",
    redirecting: "Redirecting…",
    inviteOnly: "Only invited email addresses can sign in.",
    appleNote: "With Apple, choose “Share My Email” so your address matches the invite.",
    pendingTitle: "Your account isn’t active yet",
    pendingBody: (email: string) =>
      `You’re signed in as ${email}, but that address isn’t on the active staff list. Ask an administrator to invite this exact email, then sign in again.`,
    suspendedBody: "Access for this account has been suspended. Contact an administrator.",
    signOut: "Sign out and use another account",
    callbackError: "Sign-in didn’t finish. Please try again.",
    providerError: "Couldn’t reach the sign-in provider.",
    unconfigured: "The database connection hasn’t been configured yet.",
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

export function SignInPanel({ lang, next, error, pending }: SignInPanelProps) {
  const t = copy[lang];
  const brand = getBrandAssets(lang);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const message =
    localError ??
    (error === "callback" ? t.callbackError : error === "unconfigured" ? t.unconfigured : null);

  async function signIn(provider: Provider) {
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
    <main className="min-h-dvh bg-[#071713] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-[#e8f4ed]">
      <div className="mx-auto grid min-h-dvh max-w-6xl content-center items-center gap-8 px-4 py-8 sm:gap-10 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_minmax(0,28rem)] lg:gap-16">
        <section className="space-y-6 sm:space-y-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <Image src={brand.tab} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide text-[#e3bd77]">ARATTA EXPO</p>
              <p className="text-xs text-[#b5c9bf]">{t.eyebrow}</p>
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold leading-snug text-white sm:text-4xl">{t.title}</h1>
            <p className="max-w-xl text-base text-[#b5c9bf] sm:text-lg">{t.lead}</p>
          </div>
          <ul className="hidden gap-3 sm:grid sm:grid-cols-3">
            {t.highlights.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#d6e5dd]"
              >
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-[#e3bd77]" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[1.75rem] bg-[#fbfbf7] p-6 text-[#10211d] shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8">
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
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => signIn("google")}
                  disabled={busy !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#10211d]/15 bg-white px-4 py-3.5 text-sm font-semibold shadow-sm transition hover:border-[#10211d]/30 hover:shadow disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]"
                >
                  {busy === "google" ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <GoogleMark />}
                  {busy === "google" ? t.redirecting : t.google}
                </button>
                <button
                  type="button"
                  onClick={() => signIn("apple")}
                  disabled={busy !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-black px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/85 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#198ba0]"
                >
                  {busy === "apple" ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <AppleMark />}
                  {busy === "apple" ? t.redirecting : t.apple}
                </button>
              </div>
              {message ? (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                  {message}
                </p>
              ) : null}
              <div className="space-y-2 border-t border-[#10211d]/10 pt-5 text-xs leading-relaxed text-[#65726d]">
                <p>{t.inviteOnly}</p>
                <p>{t.appleNote}</p>
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
        </section>
      </div>
    </main>
  );
}
