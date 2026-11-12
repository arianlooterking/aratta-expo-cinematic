"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, LogOut } from "lucide-react";
import type { Lang } from "@/lib/lang";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { passwordChangeProblem, type PasswordProblem } from "@/lib/platform/sign-in";
import { passwordProblem } from "@/lib/portal/team";
import { AuthField, AuthFrame, authPrimaryButton } from "./AuthFrame";

type PasswordPanelProps = {
  lang: Lang;
  /** Where to go afterwards. */
  next: string;
  email: string | null;
  /** First sign-in with a password an admin handed out: no way around choosing a new one. */
  forced: boolean;
};

const copy = {
  fa: {
    forcedTitle: "گذرواژه خودتان را انتخاب کنید",
    forcedLead: "با گذرواژه شروعی که مدیر سامانه داده بود وارد شدید. برای امنیت حساب، همین حالا گذرواژه ای انتخاب کنید که فقط خودتان می دانید.",
    title: "تغییر گذرواژه",
    lead: "گذرواژه تازه از ورود بعدی به کار می رود. دستگاه های دیگر شما وارد می مانند.",
    account: "حساب",
    password: "گذرواژه تازه",
    repeat: "تکرار گذرواژه تازه",
    hint: "دست کم ۸ نویسه. جمله ای کوتاه که یادتان بماند از یک واژه پیچیده بهتر است.",
    show: "نمایش گذرواژه",
    hide: "پنهان کردن گذرواژه",
    submit: "ذخیره گذرواژه",
    saving: "در حال ذخیره…",
    doneTitle: "گذرواژه ذخیره شد",
    doneBody: "در حال رفتن به پورتال…",
    cancel: "بازگشت به پورتال",
    signOut: "خروج",
    problems: {
      short: "گذرواژه باید دست کم ۸ نویسه باشد.",
      long: "گذرواژه خیلی بلند است. کوتاه ترش کنید.",
      mismatch: "دو گذرواژه یکی نیستند.",
      same: "این همان گذرواژه فعلی است. گذرواژه دیگری انتخاب کنید.",
      weak: "این گذرواژه خیلی ساده است. گذرواژه بلندتری انتخاب کنید.",
      session: "نشست شما تمام شده است. دوباره وارد شوید و بعد گذرواژه را تغییر دهید.",
      offline: "اتصال برقرار نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.",
      unknown: "گذرواژه ذخیره نشد. لطفا دوباره تلاش کنید.",
    } satisfies Record<PasswordProblem, string>,
  },
  en: {
    forcedTitle: "Choose your own password",
    forcedLead: "You signed in with the starting password from your administrator. To keep the account yours, choose a password only you know now.",
    title: "Change password",
    lead: "The new password applies from your next sign-in. Your other devices stay signed in.",
    account: "Account",
    password: "New password",
    repeat: "Repeat the new password",
    hint: "At least 8 characters. A short sentence you can remember beats one complicated word.",
    show: "Show password",
    hide: "Hide password",
    submit: "Save password",
    saving: "Saving…",
    doneTitle: "Password saved",
    doneBody: "Taking you to the portal…",
    cancel: "Back to the portal",
    signOut: "Sign out",
    problems: {
      short: "The password needs at least 8 characters.",
      long: "That password is too long. Shorten it a little.",
      mismatch: "The two passwords don’t match.",
      same: "That is your current password. Choose a different one.",
      weak: "That password is too simple. Choose a longer one.",
      session: "Your session has ended. Sign in again, then change the password.",
      offline: "Couldn’t connect. Check your internet and try again.",
      unknown: "The password wasn’t saved. Please try again.",
    } satisfies Record<PasswordProblem, string>,
  },
} as const;

export function PasswordPanel({ lang, next, email, forced }: PasswordPanelProps) {
  const t = copy[lang];
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);
  const [problem, setProblem] = useState<PasswordProblem | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("new-password") ?? "");
    const repeat = String(form.get("repeat-password") ?? "");
    const invalid = passwordProblem(password) ?? (password !== repeat ? "mismatch" : null);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setBusy(false);
        setProblem(passwordChangeProblem(error));
        return;
      }
      // Lets the portal know the starting password is gone. If this call is
      // lost, the password page settles it on its next load.
      await supabase.rpc("password_change_pending");
    } catch (caught) {
      setBusy(false);
      setProblem(passwordChangeProblem(caught));
      return;
    }
    setDone(true);
    window.location.assign(next);
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setShow((shown) => !shown)}
      aria-label={show ? t.hide : t.show}
      aria-pressed={show}
      className="grid h-9 w-9 place-items-center rounded-lg text-[#65726d] transition hover:bg-[#10211d]/5 focus-visible:outline-2 focus-visible:outline-[#198ba0]"
    >
      {show ? <EyeOff aria-hidden className="h-5 w-5" /> : <Eye aria-hidden className="h-5 w-5" />}
    </button>
  );

  return (
    <AuthFrame lang={lang}>
      {done ? (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900" role="status">
          <Check aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <h2 className="font-semibold">{t.doneTitle}</h2>
            <p className="text-sm">{t.doneBody}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold">{forced ? t.forcedTitle : t.title}</h2>
            <p className="text-sm leading-relaxed text-[#65726d]">{forced ? t.forcedLead : t.lead}</p>
          </div>

          <form className="space-y-4" onSubmit={save} noValidate data-password-form>
            {/* Lets password managers file the new password under the right account. */}
            {email ? (
              <div className="space-y-1.5">
                <span className="text-sm font-semibold">{t.account}</span>
                <input
                  readOnly
                  tabIndex={-1}
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  dir="ltr"
                  className="block h-11 w-full rounded-xl border border-transparent bg-[#10211d]/5 px-3.5 text-sm text-[#44524d] outline-none"
                />
              </div>
            ) : null}
            <AuthField
              label={t.password}
              hint={t.hint}
              name="new-password"
              type={show ? "text" : "password"}
              dir="ltr"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={busy}
              trailing={toggle}
            />
            <AuthField
              label={t.repeat}
              name="repeat-password"
              type={show ? "text" : "password"}
              dir="ltr"
              required
              autoComplete="new-password"
              disabled={busy}
            />
            {problem ? (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                {t.problems[problem]}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className={authPrimaryButton}>
              {busy ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <KeyRound aria-hidden className="h-5 w-5" />}
              {busy ? t.saving : t.submit}
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#10211d]/10 pt-5 text-sm">
            {forced ? (
              <span />
            ) : (
              <a href={next} className="font-semibold text-[#126f80] underline-offset-4 hover:underline">
                {t.cancel}
              </a>
            )}
            <form action="/auth/sign-out" method="post">
              <input type="hidden" name="lang" value={lang} />
              <button type="submit" className="inline-flex items-center gap-1.5 text-[#65726d] underline-offset-4 hover:underline">
                <LogOut aria-hidden className="h-4 w-4" />
                {t.signOut}
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthFrame>
  );
}
