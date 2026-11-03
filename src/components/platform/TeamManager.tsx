"use client";

import { useActionState } from "react";
import { Check, Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import type { Lang } from "@/lib/lang";
import { Constants, type Tables } from "@/lib/platform/database.types";
import { departmentLabels, roleDescriptions, roleLabels, staffStatusLabels } from "@/lib/platform/labels";
import {
  inviteStaff,
  removeStaff,
  updateStaff,
  type TeamActionState,
} from "@/app/[lang]/staff/team/actions";

type StaffRow = Pick<
  Tables<"staff_members">,
  "id" | "email" | "display_name" | "job_title" | "role" | "departments" | "status" | "avatar_url" | "last_seen_at"
>;

const initial: TeamActionState = { ok: false, message: null };

const text = {
  fa: {
    invite: "دعوت همکار",
    inviteLead: "همکار با همین ایمیل از طریق Google یا Apple وارد می شود و حسابش خودکار فعال می شود.",
    email: "ایمیل",
    name: "نام",
    jobTitle: "سمت",
    role: "نقش",
    departments: "واحدها",
    status: "وضعیت",
    send: "ثبت دعوت",
    save: "ذخیره",
    remove: "حذف دسترسی",
    confirmRemove: "دسترسی این همکار حذف شود؟",
    you: "شما",
    neverSignedIn: "هنوز وارد نشده",
    messages: {
      invited: "دعوت ثبت شد.",
      saved: "تغییرات ذخیره شد.",
      removed: "دسترسی حذف شد.",
      duplicate: "این ایمیل قبلا ثبت شده است.",
      forbidden: "اجازه این تغییر را ندارید.",
      email: "ایمیل معتبر نیست.",
      invalid: "اطلاعات فرم کامل نیست.",
      unconfigured: "اتصال پایگاه داده تنظیم نشده است.",
    } as Record<string, string>,
  },
  en: {
    invite: "Invite a colleague",
    inviteLead: "They sign in with Google or Apple using this exact email, and their account activates automatically.",
    email: "Email",
    name: "Name",
    jobTitle: "Job title",
    role: "Role",
    departments: "Departments",
    status: "Status",
    send: "Send invite",
    save: "Save",
    remove: "Remove access",
    confirmRemove: "Remove this colleague’s access?",
    you: "You",
    neverSignedIn: "Not signed in yet",
    messages: {
      invited: "Invite saved.",
      saved: "Changes saved.",
      removed: "Access removed.",
      duplicate: "That email is already on the list.",
      forbidden: "You don’t have permission for that change.",
      email: "That email address isn’t valid.",
      invalid: "The form is incomplete.",
      unconfigured: "The database connection isn’t configured.",
    } as Record<string, string>,
  },
} as const;

function Feedback({ state, lang }: { state: TeamActionState; lang: Lang }) {
  if (!state.message) return null;
  const label = text[lang].messages[state.message] ?? state.message;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
    >
      {label}
    </p>
  );
}

function DepartmentPicker({ lang, selected }: { lang: Lang; selected: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Constants.public.Enums.department.map((dept) => (
        <label
          key={dept}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#10211d]/15 px-3 py-1.5 text-xs font-medium has-[:checked]:border-[#198ba0] has-[:checked]:bg-[#198ba0]/10 has-[:checked]:text-[#0d5f6e]"
        >
          <input type="checkbox" name="departments" value={dept} defaultChecked={selected.includes(dept)} className="sr-only" />
          {departmentLabels[dept][lang]}
        </label>
      ))}
    </div>
  );
}

function InviteForm({ lang, canGrantOwner }: { lang: Lang; canGrantOwner: boolean }) {
  const t = text[lang];
  const [state, action, pending] = useActionState(inviteStaff, initial);
  const roles = Constants.public.Enums.staff_role.filter((r) => canGrantOwner || r !== "owner");

  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl border border-[#10211d]/10 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#198ba0]/10 text-[#198ba0]">
          <UserPlus aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold">{t.invite}</h2>
          <p className="text-sm text-[#65726d]">{t.inviteLead}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
          <span>{t.email}</span>
          <input
            required
            type="email"
            name="email"
            dir="ltr"
            autoComplete="off"
            className="w-full rounded-xl border border-[#10211d]/15 bg-[#fbfbf7] px-3.5 py-2.5 text-start outline-none focus:border-[#198ba0] focus:ring-2 focus:ring-[#198ba0]/20"
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          <span>{t.name}</span>
          <input
            name="display_name"
            className="w-full rounded-xl border border-[#10211d]/15 bg-[#fbfbf7] px-3.5 py-2.5 outline-none focus:border-[#198ba0] focus:ring-2 focus:ring-[#198ba0]/20"
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          <span>{t.jobTitle}</span>
          <input
            name="job_title"
            className="w-full rounded-xl border border-[#10211d]/15 bg-[#fbfbf7] px-3.5 py-2.5 outline-none focus:border-[#198ba0] focus:ring-2 focus:ring-[#198ba0]/20"
          />
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t.role}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <label
              key={role}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#10211d]/12 p-3 has-[:checked]:border-[#198ba0] has-[:checked]:bg-[#198ba0]/5"
            >
              <input type="radio" name="role" value={role} defaultChecked={role === "member"} className="mt-1 accent-[#198ba0]" />
              <span>
                <span className="block text-sm font-semibold">{roleLabels[role][lang]}</span>
                <span className="block text-xs text-[#65726d]">{roleDescriptions[role][lang]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t.departments}</legend>
        <DepartmentPicker lang={lang} selected={[]} />
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#10211d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b3530] disabled:opacity-60"
        >
          {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Mail aria-hidden className="h-4 w-4" />}
          {t.send}
        </button>
        <Feedback state={state} lang={lang} />
      </div>
    </form>
  );
}

function MemberRow({
  member,
  lang,
  isSelf,
  canEdit,
  canGrantOwner,
}: {
  member: StaffRow;
  lang: Lang;
  isSelf: boolean;
  canEdit: boolean;
  canGrantOwner: boolean;
}) {
  const t = text[lang];
  const [saveState, saveAction, saving] = useActionState(updateStaff, initial);
  const [removeState, removeAction, removing] = useActionState(removeStaff, initial);
  const locked = !canEdit || isSelf || (member.role === "owner" && !canGrantOwner);
  const roles = Constants.public.Enums.staff_role.filter(
    (r) => canGrantOwner || r !== "owner" || member.role === "owner",
  );
  const initials = (member.display_name ?? member.email).trim().slice(0, 1).toUpperCase();

  return (
    <li className="rounded-3xl border border-[#10211d]/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#10211d] text-sm font-bold text-[#e3bd77]">
          {member.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initials
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {member.display_name ?? member.email}
            {isSelf ? <span className="ms-2 rounded-full bg-[#e3bd77]/20 px-2 py-0.5 text-xs text-[#7a5a1c]">{t.you}</span> : null}
          </p>
          <p className="truncate text-xs text-[#65726d]" dir="ltr">
            {member.email}
          </p>
          {member.job_title ? <p className="text-xs text-[#65726d]">{member.job_title}</p> : null}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            member.status === "active"
              ? "bg-emerald-50 text-emerald-700"
              : member.status === "invited"
                ? "bg-amber-50 text-amber-800"
                : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {staffStatusLabels[member.status][lang]}
        </span>
      </div>

      {locked ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#10211d]/5 px-3 py-1 font-semibold">{roleLabels[member.role][lang]}</span>
          {member.departments.map((d) => (
            <span key={d} className="rounded-full bg-[#198ba0]/10 px-3 py-1 text-[#0d5f6e]">
              {departmentLabels[d][lang]}
            </span>
          ))}
        </div>
      ) : (
        <form action={saveAction} className="mt-4 space-y-3">
          <input type="hidden" name="id" value={member.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-[#65726d]">
              <span>{t.role}</span>
              <select
                name="role"
                defaultValue={member.role}
                className="w-full rounded-xl border border-[#10211d]/15 bg-[#fbfbf7] px-3 py-2 text-sm text-[#10211d]"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r][lang]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-[#65726d]">
              <span>{t.status}</span>
              <select
                name="status"
                defaultValue={member.status}
                className="w-full rounded-xl border border-[#10211d]/15 bg-[#fbfbf7] px-3 py-2 text-sm text-[#10211d]"
              >
                {Constants.public.Enums.staff_status.map((s) => (
                  <option key={s} value={s}>
                    {staffStatusLabels[s][lang]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DepartmentPicker lang={lang} selected={member.departments} />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#10211d] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <Check aria-hidden className="h-3.5 w-3.5" />}
              {t.save}
            </button>
            <button
              type="submit"
              formAction={removeAction}
              disabled={removing}
              onClick={(event) => {
                if (!window.confirm(t.confirmRemove)) event.preventDefault();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 aria-hidden className="h-3.5 w-3.5" />
              {t.remove}
            </button>
            <Feedback state={saveState.message ? saveState : removeState} lang={lang} />
          </div>
        </form>
      )}
    </li>
  );
}

export function TeamManager({
  lang,
  members,
  selfId,
  canEdit,
  canGrantOwner,
}: {
  lang: Lang;
  members: StaffRow[];
  selfId: string;
  canEdit: boolean;
  canGrantOwner: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
      <ul className="space-y-3">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            lang={lang}
            isSelf={member.id === selfId}
            canEdit={canEdit}
            canGrantOwner={canGrantOwner}
          />
        ))}
      </ul>
      {canEdit ? <InviteForm lang={lang} canGrantOwner={canGrantOwner} /> : null}
    </div>
  );
}
