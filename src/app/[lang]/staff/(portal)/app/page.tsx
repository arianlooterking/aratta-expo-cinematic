import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppDownloads } from "@/components/native/AppDownloads";
import { PageHeader } from "@/components/portal/crm/shared";
import { isLang } from "@/lib/lang";
import { fetchAppRelease } from "@/lib/native/releases";

export const metadata: Metadata = { title: "Aratta Staff · Phone app" };

export default async function PortalAppPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const fa = lang === "fa";
  const [android, ios] = await Promise.all([fetchAppRelease("android"), fetchAppRelease("ios")]);
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 lg:py-7">
      <PageHeader
        title={fa ? "اپ موبایل" : "Phone app"}
        hint={
          fa
            ? "همین پورتال روی اندروید و آیفون، با اعلان برای کارهایی که به شما سپرده می‌شود."
            : "This portal on Android and iPhone, with notifications for work assigned to you."
        }
      />
      <AppDownloads
        lang={lang}
        tone="portal"
        android={android}
        ios={ios}
        testflightUrl={process.env.IOS_TESTFLIGHT_URL?.trim() || null}
      />
      <p className="text-[13px] leading-6 text-p-ink-3">
        {fa ? "برای همکارانی که هنوز وارد نشده‌اند، این صفحه را بفرستید: " : "For colleagues who haven’t signed in yet, send this page: "}
        <Link href={`/${lang}/app`} className="font-medium text-p-brand underline-offset-4 hover:underline">
          <bdi dir="ltr">/{lang}/app</bdi>
        </Link>
      </p>
    </div>
  );
}
