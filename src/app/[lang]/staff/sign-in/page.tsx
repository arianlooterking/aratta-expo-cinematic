import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SignInPanel } from "@/components/platform/SignInPanel";
import { isLang } from "@/lib/lang";
import { getStaffSession, safeNextPath } from "@/lib/platform/session";
import { signInProviders } from "@/lib/platform/sign-in";

type SignInPageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Aratta Staff · Sign in",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SignInPage({ params, searchParams }: SignInPageProps) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { next, error } = await searchParams;
  const destination = safeNextPath(next, `/${lang}/staff`);

  const session = await getStaffSession();
  if (session.state === "active") redirect(destination);

  return (
    <SignInPanel
      lang={lang}
      next={destination}
      error={session.state === "unconfigured" ? "unconfigured" : (error ?? null)}
      providers={signInProviders(process.env.NEXT_PUBLIC_SIGN_IN_PROVIDERS)}
      pending={
        session.state === "pending"
          ? { email: session.email, suspended: session.status === "suspended" }
          : null
      }
    />
  );
}
