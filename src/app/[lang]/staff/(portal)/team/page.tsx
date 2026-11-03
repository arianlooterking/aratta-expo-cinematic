import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";
import { TeamManager } from "@/components/platform/TeamManager";
import { isLang } from "@/lib/lang";
import { getStaffSession, hasRole } from "@/lib/platform/session";
import { roleLabels } from "@/lib/platform/labels";
import { createServerSupabase } from "@/lib/supabase/server";

// Access depends on the signed-in user, so never prerender.
export const dynamic = "force-dynamic";

type TeamPageProps = { params: Promise<{ lang: string }> };

export const metadata: Metadata = {
  title: "Aratta Staff · Team",
  robots: { index: false, follow: false, nocache: true },
};

const copy = {
  fa: {
    title: "کارکنان و دسترسی ها",
    lead: "چه کسی وارد سامانه می شود و چه کاری می تواند انجام دهد. هر تغییر در تاریخچه ثبت می شود.",
    unconfigured: "برای مدیریت کارکنان، ابتدا پروژه Supabase را متصل کنید (راهنما: docs/staff-platform.md).",
    readOnly: "فقط مدیر سامانه یا مالک می تواند کارکنان را تغییر دهد.",
  },
  en: {
    title: "Team and access",
    lead: "Who can sign in and what they can do. Every change is written to the history.",
    unconfigured: "Connect the Supabase project first to manage staff (see docs/staff-platform.md).",
    readOnly: "Only admins and owners can change staff access.",
  },
} as const;

export default async function TeamPage({ params }: TeamPageProps) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = copy[lang];

  const session = await getStaffSession();
  if (session.state === "signed-out" || session.state === "pending") redirect(`/${lang}/staff/sign-in`);

  if (session.state === "unconfigured") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="rounded-2xl border border-p-line bg-p-surface p-6 text-center text-sm text-p-ink-2">{t.unconfigured}</p>
      </div>
    );
  }

  const supabase = await createServerSupabase();
  const { data: members } = await supabase!
    .from("staff_members")
    .select("id, email, display_name, job_title, role, departments, status, avatar_url, last_seen_at")
    .order("status", { ascending: true })
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  const me = session.staff;
  const canEdit = hasRole(me, "admin");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-p-brand-soft text-p-brand">
          <Users aria-hidden className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">{t.title}</h1>
          <p className="text-sm text-p-ink-3">{canEdit ? t.lead : t.readOnly}</p>
          <p className="mt-1 text-xs text-p-ink-3">
            {me.display_name ?? me.email} · {roleLabels[me.role][lang]}
          </p>
        </div>
      </div>
      <TeamManager
        lang={lang}
        members={members ?? []}
        selfId={me.id}
        canEdit={canEdit}
        canGrantOwner={me.role === "owner"}
      />
    </div>
  );
}
