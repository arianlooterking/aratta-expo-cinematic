"use client";

import { Check, Copy, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Constants } from "@/lib/platform/database.types";
import { departmentLabels, roleDescriptions, roleLabels } from "@/lib/platform/labels";
import { pick } from "@/lib/portal/format";
import { newId } from "@/lib/portal/store";
import { grantableRoles, isEmail } from "@/lib/portal/team";
import type { Department, StaffRole, Team } from "@/lib/portal/types";
import { useCollection, usePortal } from "../PortalProvider";
import { Button, Field, Input, Select, Sheet } from "../ui";
import { inviteMailto, signInUrl } from "./shared";

type Done = { email: string; name: string | null };

export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} title={fa ? "دعوت همکار" : "Invite a colleague"} closeLabel={fa ? "بستن" : "Close"}>
      {open ? <InviteBody onClose={onClose} /> : null}
    </Sheet>
  );
}

function InviteBody({ onClose }: { onClose: () => void }) {
  const { lang, store, user, toast, mode } = usePortal();
  const fa = lang === "fa";
  const teams = (useCollection("teams").rows as Team[]).filter((t) => !t.archived_at);
  const roles = grantableRoles(user.role);
  const [role, setRole] = useState<StaffRole>("member");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState(false);

  if (done) {
    return (
      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-2xl bg-p-ok-soft p-4 text-p-ok">
          <Check className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{fa ? "دعوت ثبت شد" : "Invite saved"}</p>
            <p className="mt-1 text-p-ink-2">
              {fa
                ? `${done.name ?? done.email} با حساب Google یا Apple همین ایمیل وارد می شود و دسترسی اش خودکار فعال می شود. سامانه خودش ایمیلی نمی فرستد؛ نشانی ورود را برایش بفرستید.`
                : `${done.name ?? done.email} signs in with the Google or Apple account for this email and is switched on automatically. The portal doesn't send email itself, so send them the sign-in link.`}
            </p>
          </div>
        </div>
        {mode === "demo" ? (
          <p className="rounded-xl bg-p-surface-2 px-3 py-2 text-xs text-p-ink-3">
            {fa ? "در حالت نمایشی این دعوت فقط در همین مرورگر ذخیره می شود." : "In the demo, this invite is saved in this browser only."}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <a
            href={inviteMailto(lang, done.email, done.name, user.name)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-p-brand px-3.5 text-sm font-medium text-p-brand-ink hover:brightness-110"
          >
            <Mail className="size-4" />
            {fa ? "نوشتن ایمیل دعوت" : "Write the invite email"}
          </a>
          <Button
            icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(signInUrl(lang));
                setCopied(true);
              } catch {
                toast(signInUrl(lang));
              }
            }}
          >
            {copied ? (fa ? "کپی شد" : "Copied") : fa ? "کپی نشانی ورود" : "Copy sign-in link"}
          </Button>
        </div>
        <div className="flex justify-end gap-2 border-t border-p-line pt-3">
          <Button
            tone="ghost"
            onClick={() => {
              setDone(null);
              setCopied(false);
              setDepartments([]);
              setTeamIds([]);
            }}
          >
            {fa ? "دعوت نفر بعدی" : "Invite someone else"}
          </Button>
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
        const form = new FormData(event.currentTarget);
        const email = String(form.get("email") ?? "").trim().toLowerCase();
        if (!isEmail(email)) {
          setError(fa ? "ایمیل معتبر نیست." : "That email address isn't valid.");
          return;
        }
        setError(null);
        setBusy(true);
        const id = newId();
        const name = String(form.get("display_name") ?? "").trim() || null;
        const result = await store.insert("staff_members", {
          id,
          email,
          display_name: name,
          job_title: String(form.get("job_title") ?? "").trim() || null,
          role,
          departments,
          status: "invited",
          invited_by: user.id,
        });
        if (result.ok) {
          for (const teamId of teamIds) {
            const team = teams.find((t) => t.id === teamId);
            if (team) await store.update("teams", team.id, { member_ids: [...team.member_ids, id] });
          }
          setDone({ email, name });
        }
        setBusy(false);
      }}
    >
      <p className="text-sm text-p-ink-3">
        {fa
          ? "همکار با همین ایمیل از طریق Google یا Apple وارد می شود. تا وقتی وارد نشده، «دعوت شده» نمایش داده می شود."
          : "They sign in with Google or Apple using this exact email. Until then they show as invited."}
      </p>
      <Field label={fa ? "ایمیل" : "Email"}>
        <Input name="email" type="email" required dir="ltr" autoComplete="off" placeholder="name@example.com" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fa ? "نام" : "Name"}>
          <Input name="display_name" autoComplete="off" />
        </Field>
        <Field label={fa ? "سمت" : "Job title"}>
          <Input name="job_title" autoComplete="off" />
        </Field>
      </div>
      <Field label={fa ? "نقش" : "Role"} hint={roleDescriptions[role][lang]}>
        <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabels[r][lang]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={fa ? "واحدها" : "Departments"} hint={fa ? "کارشناس فروش یا مالی به فاکتورها هم دسترسی دارد." : "Members in Sales or Finance can also work on invoices."}>
        <ChipToggles
          options={Constants.public.Enums.department.map((d) => ({ value: d, label: departmentLabels[d][lang] }))}
          value={departments}
          onChange={(v) => setDepartments(v as Department[])}
        />
      </Field>
      {teams.length ? (
        <Field label={fa ? "تیم ها" : "Teams"}>
          <ChipToggles
            options={teams.map((t) => ({ value: t.id, label: pick(lang, t.name_fa, t.name_en), color: t.color }))}
            value={teamIds}
            onChange={setTeamIds}
          />
        </Field>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-p-danger">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button tone="ghost" onClick={onClose}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button tone="primary" type="submit" disabled={busy} icon={<UserPlus className="size-4" />}>
          {fa ? "ثبت دعوت" : "Save invite"}
        </Button>
      </div>
    </form>
  );
}

/** Pick several options as pills. */
export function ChipToggles({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Array<{ value: string; label: string; color?: string }>;
  value: readonly string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-50",
              on ? "border-p-brand bg-p-brand-soft text-p-brand" : "border-p-line text-p-ink-2 hover:border-p-line-strong",
            )}
          >
            {o.color ? <span className="size-2 rounded-full" style={{ background: o.color }} aria-hidden /> : on ? <Check className="size-3.5" /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
