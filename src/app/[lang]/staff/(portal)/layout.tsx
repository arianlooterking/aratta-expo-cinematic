import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ExhibitionProvider } from "@/components/portal/ExhibitionProvider";
import { PortalProvider } from "@/components/portal/PortalProvider";
import { PortalShell } from "@/components/portal/PortalShell";
import { isLang } from "@/lib/lang";
import { getStaffSession } from "@/lib/platform/session";
import { demoUser, type PortalUser } from "@/lib/portal/user";
import "../../../portal.css";

// Access depends on the signed-in user, so never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
};

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  // Without Supabase settings the portal runs as an in-browser demo with
  // sample data. Once connected, only active staff members get in.
  const session = await getStaffSession();
  if (session.state === "signed-out" || session.state === "pending") redirect(`/${lang}/staff/sign-in`);

  const user: PortalUser =
    session.state === "active"
      ? {
          id: session.staff.id,
          name: session.staff.display_name || session.email || session.staff.email,
          email: session.email ?? session.staff.email,
          role: session.staff.role,
          departments: session.staff.departments,
        }
      : demoUser(lang);

  return (
    <PortalProvider lang={lang} mode={session.state === "active" ? "live" : "demo"} user={user}>
      <ExhibitionProvider>
        <PortalShell>{children}</PortalShell>
      </ExhibitionProvider>
    </PortalProvider>
  );
}
