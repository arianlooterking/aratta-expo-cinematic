import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { AppDownloads } from "@/components/native/AppDownloads";
import { getContent } from "@/data/aratta-content";
import { isLang, languages } from "@/lib/lang";
import { fetchAppRelease } from "@/lib/native/releases";

type Props = { params: Promise<{ lang: string }> };

// Re-read the published app versions every ten minutes.
export const revalidate = 600;

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === "fa" ? "اپلیکیشن کارکنان | اَرَتَ" : "Staff app | Aratta",
    description:
      lang === "fa"
        ? "دانلود اپلیکیشن کارکنان اَرَتَ برای اندروید و آیفون."
        : "Download the Aratta staff app for Android and iPhone.",
    alternates: { canonical: `/${lang}/app`, languages: { fa: "/fa/app", en: "/en/app" } },
    // For the team, not for exhibitors searching the site.
    robots: { index: false, follow: true },
  };
}

export default async function AppPage({ params }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const fa = lang === "fa";
  const [android, ios] = await Promise.all([fetchAppRelease("android"), fetchAppRelease("ios")]);
  return (
    <>
      <SiteChrome content={getContent(lang)} />
      <main id="main-content" className="section-shell min-h-screen pb-20 pt-36">
        <p className="text-sm text-[var(--gold)]">{fa ? "ویژه همکاران اَرَتَ" : "For the Aratta team"}</p>
        <h1 className="mt-4 text-3xl font-bold sm:text-5xl">{fa ? "اپلیکیشن کارکنان اَرَتَ" : "Aratta Staff app"}</h1>
        <p className="mt-5 max-w-3xl leading-8 text-white/65">
          {fa
            ? "پورتال کارکنان روی گوشی: نقشه سالن‌ها، شرکت‌ها و پیگیری فروش، فاکتور و وصول، کارها و تحویل تجهیزات، با اعلان برای کارهایی که به شما سپرده می‌شود. ورود فقط با حساب کاری دعوت‌شده ممکن است."
            : "The staff portal on your phone: hall maps, companies and sales follow-ups, invoices and collections, tasks and hand-over, with notifications for work assigned to you. Signing in needs an invited work account."}
        </p>
        <div className="mt-10">
          <AppDownloads
            lang={lang}
            tone="site"
            android={android}
            ios={ios}
            testflightUrl={process.env.IOS_TESTFLIGHT_URL?.trim() || null}
            portalHref={`/${lang}/staff`}
          />
        </div>
      </main>
      <SiteFooter content={getContent(lang)} />
    </>
  );
}
