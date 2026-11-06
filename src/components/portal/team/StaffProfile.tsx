"use client";

import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CalendarDays,
  Check,
  Copy,
  Languages,
  ListTodo,
  Mail,
  MapPin,
  PackageCheck,
  Pencil,
  Phone,
  RotateCcw,
  SmilePlus,
  SquareKanban,
  Trash2,
  Trophy,
  UserMinus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Constants } from "@/lib/platform/database.types";
import { departmentLabels, roleDescriptions, roleLabels } from "@/lib/platform/labels";
import { date, num, pick, relativeTime } from "@/lib/portal/format";
import { canEditProfile, canEditTeam, canManageAccess, grantableRoles, isEmail, normalizePhone, parseSkills, workloadFor } from "@/lib/portal/team";
import type { Department, StaffMember, StaffRole, Team } from "@/lib/portal/types";
import { DatePicker } from "../DatePicker";
import { useExhibition } from "../ExhibitionProvider";
import { useCollection, useNow, usePortal } from "../PortalProvider";
import { AvatarChooser, personName, StaffAvatar } from "../people";
import { Button, Card, Empty, Field, Input, Select, Sheet, Skeleton, Textarea } from "../ui";
import { History } from "./History";
import { ChipToggles } from "./InviteSheet";
import { RolePill, StatusPill, TeamChip, inviteMailto, signInUrl } from "./shared";

export function StaffProfile({ id }: { id: string }) {
  const { lang, user, can, toast } = usePortal();
  const fa = lang === "fa";
  const x = useExhibition();
  const now = useNow();
  const router = useRouter();
  const base = `/${lang}/staff`;
  const teams = useCollection("teams").rows as Team[];
  const person = x.staffById.get(id);
  const [editing, setEditing] = useState(false);
  const [picture, setPicture] = useState(false);
  const [copied, setCopied] = useState(false);
  const Back = fa ? ArrowRight : ArrowLeft;

  if (!person) {
    if (!x.ready) return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><Skeleton className="h-64" /></div>;
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Card>
          <Empty
            title={fa ? "این همکار پیدا نشد" : "Colleague not found"}
            hint={fa ? "ممکن است دسترسی اش حذف شده باشد." : "Their access may have been removed."}
            action={
              <Link href={`${base}/team`} className="text-sm font-medium text-p-brand">
                {fa ? "بازگشت به تیم" : "Back to the team"}
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const isMe = person.id === user.id;
  const actor = { id: user.id, role: user.role };
  const access = canManageAccess(actor, person);
  const editable = canEditProfile(actor, person);
  const myTeams = teams.filter((t) => !t.archived_at && t.member_ids.includes(person.id));
  const work = workloadFor(person.id, x, now);
  const invitedBy = person.invited_by ? x.staffById.get(person.invited_by) : null;
  const exhibitionName = x.exhibition ? pick(lang, x.exhibition.name_fa, x.exhibition.name_en) : fa ? "این نمایشگاه" : "this exhibition";

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 lg:py-7">
      <Link href={`${base}/team`} className="inline-flex items-center gap-1.5 text-sm text-p-ink-3 hover:text-p-ink">
        <Back className="size-4" />
        {fa ? "تیم و کارکنان" : "Team and staff"}
      </Link>

      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-l from-p-brand/25 via-p-gold/15 to-transparent sm:h-24" aria-hidden />
        <div className="px-5 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="-mt-12">
              <span className="relative inline-block">
                <StaffAvatar staff={person} size={96} className="ring-4 ring-p-surface" />
                {isMe ? (
                  <button
                    type="button"
                    onClick={() => setPicture(true)}
                    aria-label={fa ? "تغییر تصویر" : "Change picture"}
                    className="absolute -bottom-1 -end-1 grid size-8 place-items-center rounded-full border border-p-line bg-p-surface text-p-ink-2 shadow-[var(--p-shadow)] hover:text-p-brand"
                  >
                    <SmilePlus className="size-4" />
                  </button>
                ) : null}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${person.email}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-p-line bg-p-surface px-3.5 text-sm font-medium hover:bg-p-surface-2">
                <Mail className="size-4" />
                {fa ? "ایمیل" : "Email"}
              </a>
              {person.phone ? (
                <a href={`tel:${person.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-p-line bg-p-surface px-3.5 text-sm font-medium hover:bg-p-surface-2">
                  <Phone className="size-4" />
                  {fa ? "تماس" : "Call"}
                </a>
              ) : null}
              {editable ? (
                <Button tone="primary" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                  {fa ? "ویرایش مشخصات" : "Edit details"}
                </Button>
              ) : null}
            </div>
          </div>
            <div className="mt-3 min-w-0">
              <h1 className="truncate text-xl font-bold sm:text-2xl">
                {person.display_name ?? (fa ? "هنوز وارد نشده" : "Not signed in yet")}
                {isMe ? <span className="ms-2 text-sm font-normal text-p-ink-3">{fa ? "(شما)" : "(you)"}</span> : null}
              </h1>
              <p className="text-sm text-p-ink-3">{person.job_title ?? (fa ? "سمت ثبت نشده" : "No job title")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <RolePill role={person.role} />
                <StatusPill status={person.status} />
                {myTeams.map((t) => (
                  <TeamChip key={t.id} team={t} lead={t.lead_id === person.id} />
                ))}
              </div>
            </div>
        </div>
      </Card>

      {person.status === "invited" && can.admin ? (
        <Card className="flex flex-col gap-3 border-p-warn/40 bg-p-warn-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-p-ink-2">
            {fa
              ? `هنوز وارد نشده. باید با حساب Google یا Apple ایمیل ${person.email} وارد شود.`
              : `Not signed in yet. They need to sign in with the Google or Apple account for ${person.email}.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={inviteMailto(lang, person.email, person.display_name, user.name)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-p-brand px-2.5 text-[13px] font-medium text-p-brand-ink">
              <Mail className="size-3.5" />
              {fa ? "ایمیل دعوت دوباره" : "Email the invite again"}
            </a>
            <Button
              size="sm"
              icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
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
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">{fa ? "مشخصات" : "Details"}</h2>
            {person.bio ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-p-ink-2">{person.bio}</p> : null}
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Detail icon={<Mail className="size-4" />} label={fa ? "ایمیل" : "Email"}>
                <bdi dir="ltr" className="break-all">{person.email}</bdi>
              </Detail>
              <Detail icon={<Phone className="size-4" />} label={fa ? "تلفن" : "Phone"}>
                {person.phone ? <bdi dir="ltr">{person.phone}</bdi> : "—"}
              </Detail>
              <Detail icon={<MapPin className="size-4" />} label={fa ? "واحدها" : "Departments"}>
                {person.departments.length ? person.departments.map((d) => departmentLabels[d][lang]).join("، ") : "—"}
              </Detail>
              <Detail icon={<CalendarDays className="size-4" />} label={fa ? "شروع همکاری" : "Started"}>
                {person.start_date ? date(lang, person.start_date) : "—"}
              </Detail>
              <Detail icon={<Languages className="size-4" />} label={fa ? "زبان سامانه" : "Portal language"}>
                {person.locale === "en" ? "English" : "فارسی"}
              </Detail>
              <Detail icon={<RotateCcw className="size-4" />} label={fa ? "آخرین حضور" : "Last seen"}>
                {person.last_seen_at && now ? relativeTime(lang, person.last_seen_at, new Date(now)) : "—"}
              </Detail>
            </dl>
            {person.skills?.length ? (
              <div className="mt-4">
                <div className="text-xs text-p-ink-3">{fa ? "مهارت ها" : "Skills"}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {person.skills.map((s) => (
                    <span key={s} className="rounded-full bg-p-sunken px-2.5 py-1 text-xs font-medium text-p-ink-2">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="mt-4 text-[11px] text-p-ink-3">
              {invitedBy ? (fa ? `دعوت از ${personName(invitedBy, lang)} · ` : `Invited by ${personName(invitedBy, lang)} · `) : null}
              {fa ? `ثبت در ${date(lang, person.created_at)}` : `Added ${date(lang, person.created_at)}`}
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">{fa ? `کار در ${exhibitionName}` : `Work in ${exhibitionName}`}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <WorkTile href={`${base}/map`} icon={<MapPin className="size-4" />} value={work.booths} label={fa ? "غرفه زیر نظر" : "Booths looked after"} />
              <WorkTile href={`${base}/tasks`} icon={<ListTodo className="size-4" />} value={work.openTasks} label={fa ? "کار باز" : "Open tasks"} sub={work.overdueTasks ? (fa ? `${num(lang, work.overdueTasks)} دیر شده` : `${work.overdueTasks} overdue`) : undefined} danger={work.overdueTasks > 0} />
              <WorkTile href={`${base}/crm/pipeline`} icon={<SquareKanban className="size-4" />} value={work.openDeals} label={fa ? "پیگیری فروش" : "Open deals"} />
              <WorkTile href={`${base}/crm/pipeline`} icon={<Trophy className="size-4" />} value={work.wonDeals} label={fa ? "قرارداد بسته" : "Deals won"} />
              <WorkTile href={`${base}/handover`} icon={<PackageCheck className="size-4" />} value={work.handovers} label={fa ? "تحویل و جمع آوری" : "Handovers"} />
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <AccessCard person={person} allowed={access} isMe={isMe} />
          <TeamsCard person={person} teams={teams} />
          {can.manage ? (
            <div>
              <h2 className="mb-2 text-[15px] font-semibold">{fa ? "تاریخچه تغییرات" : "Change history"}</h2>
              <History tables={["staff_members"]} rowId={person.id} compact version={person.updated_at} />
            </div>
          ) : null}
          {access ? (
            <DangerZone
              person={person}
              onRemoved={() => {
                toast(fa ? "دسترسی حذف شد" : "Access removed");
                router.push(`${base}/team`);
              }}
            />
          ) : null}
        </div>
      </div>

      <ProfileSheet open={editing} onClose={() => setEditing(false)} person={person} adminEdit={hasAdmin(user.role)} />
      {isMe ? <AvatarChooser open={picture} onClose={() => setPicture(false)} /> : null}
    </div>
  );
}

function hasAdmin(role: StaffRole) {
  return role === "owner" || role === "admin";
}

function Detail({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2.5">
      <span className="mt-0.5 text-p-ink-3">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-p-ink-3">{label}</dt>
        <dd className="mt-0.5 font-medium">{children}</dd>
      </div>
    </div>
  );
}

function WorkTile({ href, icon, value, label, sub, danger }: { href: string; icon: React.ReactNode; value: number; label: string; sub?: string; danger?: boolean }) {
  const { lang } = usePortal();
  return (
    <Link href={href} className="rounded-xl border border-p-line p-3 transition-colors hover:bg-p-surface-2">
      <span className="flex items-center gap-1.5 text-xs text-p-ink-3">
        {icon}
        {label}
      </span>
      <span className="mt-1 block text-xl font-bold tabular-nums">{num(lang, value)}</span>
      {sub ? <span className={cn("block text-[11px]", danger ? "font-semibold text-p-danger" : "text-p-ink-3")}>{sub}</span> : null}
    </Link>
  );
}

/* ---------------------------------------------------------------- Access */

function AccessCard({ person, allowed, isMe }: { person: StaffMember; allowed: boolean; isMe: boolean }) {
  const { lang, user, store, toast } = usePortal();
  const fa = lang === "fa";
  const [role, setRole] = useState<StaffRole>(person.role);
  const [departments, setDepartments] = useState<Department[]>(person.departments);
  const [busy, setBusy] = useState(false);
  const roles = grantableRoles(user.role);
  const dirty = role !== person.role || departments.join() !== person.departments.join();
  // Departments are not a guarded field: admins may set their own.
  const deptEditable = allowed || (isMe && hasAdmin(user.role));
  const reason = isMe
    ? fa
      ? "نقش خودتان را نمی توانید تغییر دهید. مالک یا مدیر سامانه دیگری باید این کار را بکند."
      : "You can't change your own role. Another owner or admin has to do it."
    : person.role === "owner" && user.role !== "owner"
      ? fa
        ? "فقط مالک می تواند دسترسی مالک را تغییر دهد."
        : "Only an owner can change an owner's access."
      : fa
        ? "فقط مدیر سامانه یا مالک دسترسی ها را تغییر می دهد."
        : "Only admins and owners change access.";

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-semibold">{fa ? "نقش و دسترسی" : "Role and access"}</h2>
      <p className="mt-0.5 text-[13px] text-p-ink-3">{roleDescriptions[role][lang]}</p>
      <div className="mt-4 grid gap-4">
        <Field label={fa ? "نقش" : "Role"}>
          <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} disabled={!allowed}>
            {(allowed ? roles : [person.role]).map((r) => (
              <option key={r} value={r}>
                {roleLabels[r][lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "واحدها" : "Departments"}>
          <ChipToggles
            options={Constants.public.Enums.department.map((d) => ({ value: d, label: departmentLabels[d][lang] }))}
            value={departments}
            onChange={(v) => setDepartments(v as Department[])}
            disabled={!deptEditable}
          />
        </Field>
        {!allowed ? <p className="rounded-xl bg-p-surface-2 px-3 py-2 text-xs text-p-ink-3">{reason}</p> : null}
        {deptEditable ? (
          <div className="flex justify-end gap-2">
            {dirty ? (
              <Button
                tone="ghost"
                onClick={() => {
                  setRole(person.role);
                  setDepartments(person.departments);
                }}
              >
                {fa ? "برگرداندن" : "Reset"}
              </Button>
            ) : null}
            <Button
              tone="primary"
              disabled={!dirty || busy}
              onClick={async () => {
                setBusy(true);
                const res = await store.update("staff_members", person.id, allowed ? { role, departments } : { departments });
                setBusy(false);
                if (res.ok) toast(fa ? "دسترسی ذخیره شد" : "Access saved");
                else {
                  setRole(person.role);
                  setDepartments(person.departments);
                }
              }}
            >
              {fa ? "ذخیره دسترسی" : "Save access"}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- Teams */

function TeamsCard({ person, teams }: { person: StaffMember; teams: Team[] }) {
  const { lang, user, store } = usePortal();
  const fa = lang === "fa";
  const active = teams.filter((t) => !t.archived_at);
  if (!active.length) return null;
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-semibold">{fa ? "تیم ها" : "Teams"}</h2>
      <ul className="mt-3 divide-y divide-p-line">
        {active.map((t) => {
          const on = t.member_ids.includes(person.id);
          const lead = t.lead_id === person.id;
          const editable = canEditTeam(user, t) && !lead && person.status !== "suspended";
          return (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden />
                <span className="truncate font-medium">{pick(lang, t.name_fa, t.name_en)}</span>
                {lead ? <span className="text-[11px] font-semibold text-p-gold">{fa ? "سرپرست" : "Lead"}</span> : null}
              </span>
              {editable ? (
                <Button
                  size="sm"
                  tone={on ? "quiet" : "secondary"}
                  icon={on ? <Check className="size-3.5" /> : undefined}
                  onClick={() => store.update("teams", t.id, { member_ids: on ? t.member_ids.filter((m) => m !== person.id) : [...t.member_ids, person.id] })}
                >
                  {on ? (fa ? "عضو است" : "Member") : fa ? "افزودن" : "Add"}
                </Button>
              ) : (
                <span className="text-xs text-p-ink-3">{on ? (fa ? "عضو" : "Member") : "—"}</span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/* ----------------------------------------------------------- Danger zone */

function DangerZone({ person, onRemoved }: { person: StaffMember; onRemoved: () => void }) {
  const { lang, store, toast } = usePortal();
  const fa = lang === "fa";
  const [confirm, setConfirm] = useState(false);
  const suspended = person.status === "suspended";
  return (
    <Card className="border-p-danger/30 p-5">
      <h2 className="text-[15px] font-semibold text-p-danger">{fa ? "قطع دسترسی" : "Stop access"}</h2>
      <p className="mt-1 text-[13px] text-p-ink-3">
        {fa
          ? "توقف دسترسی، ورود را می بندد ولی نام و سوابق همکار روی غرفه ها و کارها می ماند. حذف کامل، او را از فهرست و تیم ها برمی دارد."
          : "Suspending blocks sign-in but keeps their name on booths and tasks. Removing takes them off the list and every team."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          tone={suspended ? "secondary" : "danger"}
          icon={suspended ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
          onClick={async () => {
            const next = suspended ? (person.user_id ? "active" : "invited") : "suspended";
            const res = await store.update("staff_members", person.id, { status: next });
            if (res.ok) toast(suspended ? (fa ? "دسترسی دوباره فعال شد" : "Access restored") : fa ? "دسترسی متوقف شد" : "Access suspended");
          }}
        >
          {suspended ? (fa ? "فعال کردن دوباره" : "Restore access") : fa ? "توقف دسترسی" : "Suspend access"}
        </Button>
        {confirm ? (
          <Button
            tone="danger"
            icon={<Trash2 className="size-4" />}
            onClick={async () => {
              const res = await store.remove("staff_members", person.id);
              if (res.ok) onRemoved();
            }}
          >
            {fa ? "بله، کامل حذف شود" : "Yes, remove completely"}
          </Button>
        ) : (
          <Button tone="ghost" icon={<UserMinus className="size-4" />} onClick={() => setConfirm(true)} className="text-p-danger">
            {fa ? "حذف کامل" : "Remove"}
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------- Edit details */

function ProfileSheet({ open, onClose, person, adminEdit }: { open: boolean; onClose: () => void; person: StaffMember; adminEdit: boolean }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} title={fa ? "ویرایش مشخصات" : "Edit details"} closeLabel={fa ? "بستن" : "Close"}>
      {open ? <ProfileForm person={person} onClose={onClose} adminEdit={adminEdit} /> : null}
    </Sheet>
  );
}

function ProfileForm({ person, onClose, adminEdit }: { person: StaffMember; onClose: () => void; adminEdit: boolean }) {
  const { lang, store, toast, user } = usePortal();
  const fa = lang === "fa";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailLocked = Boolean(person.user_id);
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const text = (k: string) => String(form.get(k) ?? "").trim();
        const patch = {
          display_name: text("display_name") || null,
          job_title: text("job_title") || null,
          phone: text("phone") ? normalizePhone(text("phone")) : null,
          bio: text("bio") || null,
          skills: parseSkills(text("skills")),
          locale: text("locale") === "en" ? "en" : "fa",
        };
        let res;
        if (adminEdit) {
          const email = text("email").toLowerCase();
          if (!emailLocked && !isEmail(email)) {
            setError(fa ? "ایمیل معتبر نیست." : "That email address isn't valid.");
            return;
          }
          setBusy(true);
          res = await store.update("staff_members", person.id, { ...patch, start_date: text("start_date") || null, ...(emailLocked ? {} : { email }) });
        } else {
          setBusy(true);
          res = await store.updateMyProfile(user.id, patch);
        }
        setBusy(false);
        if (res.ok) {
          toast(fa ? "مشخصات ذخیره شد" : "Details saved");
          onClose();
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fa ? "نام" : "Name"}>
          <Input name="display_name" defaultValue={person.display_name ?? ""} required={Boolean(person.display_name)} />
        </Field>
        <Field label={fa ? "سمت" : "Job title"}>
          <Input name="job_title" defaultValue={person.job_title ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fa ? "ایمیل ورود" : "Sign-in email"} hint={emailLocked ? (fa ? "بعد از اولین ورود قابل تغییر نیست." : "Locked after their first sign-in.") : undefined}>
          <Input name="email" type="email" defaultValue={person.email} dir="ltr" disabled={emailLocked || !adminEdit} />
        </Field>
        <Field label={fa ? "تلفن همراه" : "Mobile"}>
          <Input name="phone" defaultValue={person.phone ?? ""} dir="ltr" inputMode="tel" placeholder="0912 000 0000" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fa ? "شروع همکاری" : "Start date"} hint={!adminEdit ? (fa ? "مدیر سامانه ثبت می کند." : "Set by an admin.") : undefined}>
          <DatePicker name="start_date" defaultValue={person.start_date ?? null} disabled={!adminEdit} />
        </Field>
        <Field label={fa ? "زبان سامانه" : "Portal language"}>
          <Select name="locale" defaultValue={person.locale}>
            <option value="fa">فارسی</option>
            <option value="en">English</option>
          </Select>
        </Field>
      </div>
      <Field label={fa ? "درباره" : "About"}>
        <Textarea name="bio" defaultValue={person.bio ?? ""} rows={3} placeholder={fa ? "مسئولیت ها، سالن ها یا مشتریانی که پیگیری می کند" : "What they look after: halls, clients, duties"} />
      </Field>
      <Field label={fa ? "مهارت ها" : "Skills"} hint={fa ? "با ویرگول جدا کنید" : "Separate with commas"}>
        <Input name="skills" defaultValue={(person.skills ?? []).join("، ")} />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-p-danger">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button tone="ghost" onClick={onClose}>
          {fa ? "انصراف" : "Cancel"}
        </Button>
        <Button tone="primary" type="submit" disabled={busy}>
          {fa ? "ذخیره" : "Save"}
        </Button>
      </div>
    </form>
  );
}
