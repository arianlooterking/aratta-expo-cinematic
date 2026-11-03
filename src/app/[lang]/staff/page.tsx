import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StaffPortal } from "@/components/staff/StaffPortal";
import { isLang, languages, type Lang } from "@/lib/lang";
import { getStaffSession } from "@/lib/platform/session";

type StaffPageProps = {
  params: Promise<{ lang: string }>;
};

const staffMetadata = {
  fa: {
    title: "پورتال کارکنان | مرکز عملیات نمایشگاهی اَرَت",
    description:
      "نمونه محلی عملیات اَرَت برای برنامه ریزی سالن ها، مدیریت غرفه ها، تجهیزات و عملیات اجرایی نمایشگاه.",
  },
  en: {
    title: "Staff Portal | Aratta Expo Operations",
    description:
      "Aratta's local operations prototype for hall planning, booth management, equipment, and exhibition operations.",
  },
} satisfies Record<Lang, { title: string; description: string }>;

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: StaffPageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};

  return {
    ...staffMetadata[lang],
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
    other: {
      "content-language": lang,
    },
  };
}

export default async function StaffPage({ params }: StaffPageProps) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  // Without Supabase settings the portal stays a local, browser-only demo.
  // Once connected, only active staff members get past this point.
  const session = await getStaffSession();
  if (session.state === "signed-out" || session.state === "pending") {
    redirect(`/${lang}/staff/sign-in`);
  }

  return <StaffPortal initialLocale={lang} />;
}
