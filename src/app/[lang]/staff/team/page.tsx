import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, LogOut, Users } from "lucide-react";
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
    back: "بازگشت به پورتال",
    title: "کارکنان و دسترسی ها",
    lead: "چه کسی وارد سامانه می شود و چه کاری می تواند انجام دهد. هر تغییر در تاریخچه ثبت می شود.",
    signOut: "خروج",
    unconfigured: "برای مدیریت کارکنان، ابتدا پروژه Supabase را متصل کنید (راهنما: docs/staff-platform.md).",
    readOnly: "فقط مدیر سامانه یا مالک می تواند کارکنان را تغییر دهد.",
  },
  en: {
    back: "Back to the portal",
    title: "Team and access",
    lead: "Who can sign in and what they can do. Every change is written to the history.",
    signOut: "Sign out",
    unconfigured: "Connect the Supabase project first to manage staff (see docs/staff-platform.md).",
    readOnly: "Only admins and owners can change staff access.",
  },
} as const;

export default async function TeamPage({ params }: TeamPageProps) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = copy[lang];
  const Back = lang === "fa" ? ArrowRight : ArrowLeft;

  const session = await getStaffSession();
  if (session.state === "signed-out" || session.state === "pending") redirect(`/${lang}/staff/sign-in`);

  if (session.state === "unconfigured") {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#eef1eb] px-4 text-[#10211d]">
        <p className="max-w-md rounded-3xl bg-white p-6 text-center shadow-sm">{t.unconfigured}</p>
      </main>
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
    <main className="min-h-dvh bg-[#eef1eb] text-[#10211d]">
      <header className="bg-[#071713] text-[#e8f4ed]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href={`/${lang}/staff`}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#b5c9bf] hover:bg-white/5 hover:text-white"
          >
            <Back aria-hidden className="h-4 w-4" />
            {t.back}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[#b5c9bf]">
              {me.display_name ?? me.email} · {roleLabels[me.role][lang]}
            </span>
            <form action="/auth/sign-out" method="post">
              <input type="hidden" name="lang" value={lang} />
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5">
                <LogOut aria-hidden className="h-3.5 w-3.5" />
                {t.signOut}
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#10211d] text-[#e3bd77]">
            <Users aria-hidden className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-sm text-[#65726d]">{canEdit ? t.lead : t.readOnly}</p>
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
    </main>
  );
}
