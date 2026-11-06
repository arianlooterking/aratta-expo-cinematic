"use client";

import { Crown, ShieldCheck, ShieldHalf, UserRound, Eye } from "lucide-react";
import { cn } from "@/lib/cn";
import { departmentLabels, roleLabels, staffStatusLabels } from "@/lib/platform/labels";
import { pick } from "@/lib/portal/format";
import type { Department, StaffMember, StaffRole, Team } from "@/lib/portal/types";
import { usePortal } from "../PortalProvider";
import { Pill } from "../ui";

export const roleIcon: Record<StaffRole, typeof Crown> = {
  owner: Crown,
  admin: ShieldCheck,
  manager: ShieldHalf,
  member: UserRound,
  viewer: Eye,
};

const roleTone: Record<StaffRole, "gold" | "violet" | "info" | "brand" | "neutral"> = {
  owner: "gold",
  admin: "violet",
  manager: "info",
  member: "brand",
  viewer: "neutral",
};

export function RolePill({ role, className }: { role: StaffRole; className?: string }) {
  const { lang } = usePortal();
  const Icon = roleIcon[role];
  return (
    <Pill tone={roleTone[role]} className={className}>
      <Icon className="size-3.5" aria-hidden />
      {roleLabels[role][lang]}
    </Pill>
  );
}

export function StatusPill({ status }: { status: StaffMember["status"] }) {
  const { lang } = usePortal();
  const tone = status === "active" ? "ok" : status === "invited" ? "warn" : "danger";
  return (
    <Pill tone={tone}>
      <span className={cn("size-1.5 rounded-full", status === "active" ? "bg-p-ok" : status === "invited" ? "bg-p-warn" : "bg-p-danger")} aria-hidden />
      {staffStatusLabels[status][lang]}
    </Pill>
  );
}

export function DepartmentChips({ departments }: { departments: readonly Department[] }) {
  const { lang } = usePortal();
  if (!departments.length) return <span className="text-xs text-p-ink-3">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {departments.map((d) => (
        <span key={d} className="rounded-md bg-p-sunken px-1.5 py-0.5 text-[11px] font-medium text-p-ink-2">
          {departmentLabels[d][lang]}
        </span>
      ))}
    </span>
  );
}

export function TeamChip({ team, lead, className }: { team: Pick<Team, "name_fa" | "name_en" | "color">; lead?: boolean; className?: string }) {
  const { lang } = usePortal();
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-p-line bg-p-surface px-2 text-xs font-medium text-p-ink-2", className)}
    >
      <span className="size-2 rounded-full" style={{ background: team.color }} aria-hidden />
      {pick(lang, team.name_fa, team.name_en)}
      {lead ? <span className="text-[10px] font-semibold text-p-gold">{lang === "fa" ? "سرپرست" : "Lead"}</span> : null}
    </span>
  );
}

/** A number with a caption, for the summary strips. */
export function Stat({ label, value, tone, hint }: { label: string; value: string; tone?: "warn" | "danger" | "ok"; hint?: string }) {
  return (
    <div className="rounded-2xl border border-p-line bg-p-surface px-4 py-3 shadow-[var(--p-shadow)]">
      <div className="text-xs text-p-ink-3">{label}</div>
      <div className={cn("mt-0.5 text-2xl font-bold tabular-nums", tone === "warn" && "text-p-warn", tone === "danger" && "text-p-danger", tone === "ok" && "text-p-ok")}>{value}</div>
      {hint ? <div className="mt-0.5 truncate text-[11px] text-p-ink-3">{hint}</div> : null}
    </div>
  );
}

/** The sign-in page a new colleague should open. */
export function signInUrl(lang: "fa" | "en") {
  if (typeof window === "undefined") return `/${lang}/staff/sign-in`;
  return `${window.location.origin}/${lang}/staff/sign-in`;
}

/** An email draft in the person's own mail app. Nothing is sent by the portal. */
export function inviteMailto(lang: "fa" | "en", email: string, name: string | null, inviter: string) {
  const link = signInUrl(lang);
  const subject = lang === "fa" ? "دعوت به سامانه کارکنان اَرَتَ" : "Your invitation to the Aratta staff portal";
  const body =
    lang === "fa"
      ? `سلام${name ? ` ${name}` : ""}،\n\nبرای شما در سامانه کارکنان اَرَتَ دسترسی تعریف شد. لطفا از این نشانی و با حساب Google یا Apple همین ایمیل (${email}) وارد شوید:\n${link}\n\n${inviter}`
      : `Hi${name ? ` ${name}` : ""},\n\nYou now have access to the Aratta staff portal. Sign in here with the Google or Apple account for this email (${email}):\n${link}\n\n${inviter}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
