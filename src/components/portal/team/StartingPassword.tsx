"use client";

import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { useState } from "react";
import { newStartingPassword, passwordProblem, signInDetails } from "@/lib/portal/team";
import type { StaffMember } from "@/lib/portal/types";
import { usePortal } from "../PortalProvider";
import { personName } from "../people";
import { Button, Field, Input, Sheet } from "../ui";
import { signInUrl } from "./shared";

/** The starting password field: a generated one the admin may replace. */
export function StartingPasswordField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Field
      label={fa ? "گذرواژه شروع" : "Starting password"}
      hint={
        fa
          ? "همکار با ایمیلش و این گذرواژه وارد می شود و همان اول گذرواژه خودش را انتخاب می کند."
          : "They sign in with their email and this password, then choose their own straight away."
      }
    >
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          className="font-mono tracking-wide"
          aria-invalid={passwordProblem(value) !== null}
        />
        <Button
          icon={<RefreshCw className="size-4" />}
          onClick={() => onChange(newStartingPassword())}
          disabled={disabled}
          aria-label={fa ? "گذرواژه دیگر" : "Another password"}
          title={fa ? "گذرواژه دیگر" : "Another password"}
        />
      </div>
    </Field>
  );
}

/** What to send the colleague, with one button to copy all of it. */
export function SignInDetails({ email, password }: { email: string; password: string }) {
  const { lang, toast, mode } = usePortal();
  const fa = lang === "fa";
  const [copied, setCopied] = useState(false);
  const link = signInUrl(lang);
  return (
    <div className="grid gap-3 rounded-2xl border border-p-line bg-p-surface-2 p-4">
      <dl className="grid gap-2 text-sm">
        <Row label={fa ? "نشانی ورود" : "Sign-in link"} value={link} />
        <Row label={fa ? "ایمیل" : "Email"} value={email} />
        <Row label={fa ? "گذرواژه شروع" : "Starting password"} value={password} strong />
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          tone="primary"
          icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          onClick={async () => {
            const text = signInDetails(lang, link, email, password);
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {
              toast(text);
            }
          }}
        >
          {copied ? (fa ? "کپی شد" : "Copied") : fa ? "کپی مشخصات ورود" : "Copy sign-in details"}
        </Button>
        <p className="text-xs text-p-ink-3">
          {mode === "demo"
            ? fa
              ? "در حالت نمایشی ورود وجود ندارد؛ این فقط نمونه است."
              : "The demo has no sign-in; this is only a sample."
            : fa
              ? "این گذرواژه دوباره نمایش داده نمی شود. همین حالا برای همکار بفرستید."
              : "This password isn't shown again. Send it to them now."}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="text-xs text-p-ink-3">{label}</dt>
      <dd dir="ltr" className={strong ? "select-all font-mono text-base font-semibold tracking-wide" : "select-all break-all text-p-ink-2"}>
        {value}
      </dd>
    </div>
  );
}

/** Give a colleague a starting password, or a new one when they forgot theirs. */
export function PasswordSheet({ open, onClose, person }: { open: boolean; onClose: () => void; person: StaffMember }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const reset = person.user_id !== null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={reset ? (fa ? "گذرواژه تازه" : "New password") : fa ? "گذرواژه شروع" : "Starting password"}
      closeLabel={fa ? "بستن" : "Close"}
    >
      {open ? <PasswordBody person={person} onClose={onClose} /> : null}
    </Sheet>
  );
}

function PasswordBody({ person, onClose }: { person: StaffMember; onClose: () => void }) {
  const { lang, store } = usePortal();
  const fa = lang === "fa";
  const [password, setPassword] = useState(newStartingPassword);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const name = personName(person, lang);
  const invalid = passwordProblem(password);

  if (saved) {
    return (
      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-2xl bg-p-ok-soft p-4 text-p-ok">
          <Check className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm text-p-ink-2">
            {fa
              ? `گذرواژه ${name} ذخیره شد. با اولین ورود از او خواسته می شود گذرواژه خودش را انتخاب کند.`
              : `${name}'s password is saved. At the next sign-in they are asked to choose their own.`}
          </p>
        </div>
        <SignInDetails email={person.email} password={password} />
        <div className="flex justify-end border-t border-p-line pt-3">
          <Button tone="primary" onClick={onClose}>
            {fa ? "تمام" : "Done"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (invalid) return;
        setBusy(true);
        const result = await store.setStaffPassword(person.id, password);
        setBusy(false);
        if (result.ok) setSaved(true);
      }}
    >
      <p className="text-sm text-p-ink-3">
        {person.user_id
          ? fa
            ? `گذرواژه فعلی ${name} از کار می افتد و با این یکی وارد می شود.`
            : `${name}'s current password stops working and this one takes its place.`
          : fa
            ? `${name} با ${person.email} و این گذرواژه وارد می شود. سامانه ایمیلی نمی فرستد؛ خودتان مشخصات را برایش بفرستید.`
            : `${name} signs in with ${person.email} and this password. The portal sends no email, so you pass the details on.`}
      </p>
      <StartingPasswordField value={password} onChange={setPassword} disabled={busy} />
      {invalid ? (
        <p role="alert" className="text-sm text-p-danger">
          {invalid === "short"
            ? fa
              ? "گذرواژه باید دست کم ۸ نویسه باشد."
              : "The password needs at least 8 characters."
            : fa
              ? "گذرواژه خیلی بلند است."
              : "That password is too long."}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button tone="ghost" onClick={onClose}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button tone="primary" type="submit" disabled={busy || invalid !== null} icon={<KeyRound className="size-4" />}>
          {fa ? "ذخیره گذرواژه" : "Save password"}
        </Button>
      </div>
    </form>
  );
}
