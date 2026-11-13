import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PasswordPanel } from "@/components/platform/PasswordPanel";
import { isLang } from "@/lib/lang";
import { getStaffSession, safeNextPath } from "@/lib/platform/session";
import { createServerSupabase } from "@/lib/supabase/server";

type PasswordPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ next?: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aratta Staff · Password",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Where a colleague chooses their own password: right after the first sign-in
 * with a starting password from an admin, or any time from the account menu.
 */
export default async function PasswordPage({ params, searchParams }: PasswordPageProps) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { next } = await searchParams;
  const destination = safeNextPath(next, `/${lang}/staff`);

  const session = await getStaffSession();
  // The demo has no accounts, so there is no password to change.
  if (session.state === "unconfigured") redirect(`/${lang}/staff`);
  if (session.state !== "active") redirect(`/${lang}/staff/sign-in`);

  if (session.mustChangePassword) {
    // The database clears the mark once the password really differs. Asking
    // here also settles a change whose last step never arrived.
    const supabase = await createServerSupabase();
    const { data: stillPending } = (await supabase?.rpc("password_change_pending")) ?? { data: null };
    if (stillPending === false) redirect(destination);
  }

  return <PasswordPanel lang={lang} next={destination} email={session.email} forced={session.mustChangePassword} />;
}
