import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { getContent } from "@/data/aratta-content";
import { isLang, languages, type Lang } from "@/lib/lang";

type Props = { params: Promise<{ lang: string }> };

export function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === "fa" ? "حریم خصوصی | اَرَتَ" : "Privacy | Aratta",
    description:
      lang === "fa"
        ? "اطلاعاتی که وب‌سایت و اپلیکیشن کارکنان اَرَتَ نگه می‌دارند و کاربرد آن‌ها."
        : "What the Aratta website and the Aratta Staff app keep, and why.",
    alternates: { canonical: `/${lang}/privacy`, languages: { fa: "/fa/privacy", en: "/en/privacy" } },
  };
}

const updated = { fa: "۱۵ آبان ۱۴۰۵", en: "6 November 2026" };

const sections: Record<Lang, { title: string; body: string[] }[]> = {
  fa: [
    {
      title: "وب‌سایت",
      body: [
        "وب‌سایت برای بازدیدکنندگان حساب کاربری نمی‌سازد و ابزار ردیابی تبلیغاتی ندارد.",
        "فرم‌های درخواست غرفه، اجاره تجهیزات و تماس فقط یک پیش‌نویس ایمیل روی دستگاه خودتان باز می‌کنند. تا وقتی خودتان آن را نفرستید، چیزی برای ما ارسال نمی‌شود.",
      ],
    },
    {
      title: "اپلیکیشن کارکنان اَرَتَ و پورتال کارکنان",
      body: [
        "این اپلیکیشن فقط برای همکارانی است که مدیر سامانه دعوتشان کرده است. ورود با حساب Google یا Apple انجام می‌شود و ما فقط نام، ایمیل و تصویر پروفایل آن حساب را می‌گیریم.",
        "اطلاعات کاری که همکاران وارد می‌کنند (نمایشگاه‌ها، غرفه‌ها، شرکت‌ها و مخاطبانشان، فاکتورها و پرداخت‌ها، کارها، پیام‌های گفتگوی تیم و عکس‌ها یا فایل‌های پیوست) روی سرورهای Supabase در اتحادیه اروپا نگه داشته می‌شود و فقط همکاران دارای دسترسی آن را می‌بینند.",
        "اگر اعلان‌ها را روشن کنید، شناسه اعلان گوشی شما ذخیره می‌شود تا پیام کارهای سپرده‌شده و گفتگوها به گوشی برسد.",
        "دوربین و گالری فقط وقتی استفاده می‌شوند که خودتان عکسی را برای غرفه، مشکل یا پیام انتخاب کنید.",
        "در حالت نمایشی (بدون ورود)، داده‌ها نمونه هستند و فقط در همان مرورگر یا گوشی ذخیره می‌شوند.",
      ],
    },
    {
      title: "آنچه انجام نمی‌دهیم",
      body: [
        "اطلاعات را نمی‌فروشیم، برای تبلیغات استفاده نمی‌کنیم و جز سرویس‌هایی که سامانه را اجرا می‌کنند (Vercel برای میزبانی، Supabase برای داده، Apple و Google برای ورود و اعلان) با کسی به اشتراک نمی‌گذاریم.",
      ],
    },
    {
      title: "حذف اطلاعات و تماس",
      body: [
        "برای دیدن، اصلاح یا حذف اطلاعات خودتان یا بستن حسابتان به info@arattaexpo.ir ایمیل بزنید. مدیر سامانه هم می‌تواند دسترسی هر همکار را در هر زمان قطع کند.",
      ],
    },
  ],
  en: [
    {
      title: "Website",
      body: [
        "The website does not create accounts for visitors and has no advertising trackers.",
        "The booth request, equipment rental and contact forms only open an email draft on your own device. Nothing reaches us until you send that email yourself.",
      ],
    },
    {
      title: "Aratta Staff app and staff portal",
      body: [
        "The app is only for colleagues invited by an administrator. Sign-in uses Google or Apple, and we receive only the name, email and profile picture of that account.",
        "Work data that colleagues enter (exhibitions, booths, companies and their contacts, invoices and payments, tasks, team chat messages and attached photos or files) is stored on Supabase servers in the European Union and is visible only to colleagues with access.",
        "If you turn on notifications, your phone's notification token is stored so that assigned work and chat messages reach your phone.",
        "The camera and photo library are used only when you choose a photo for a booth, a problem report or a message.",
        "In demo mode (not signed in), all data is sample data stored only in that browser or phone.",
      ],
    },
    {
      title: "What we don't do",
      body: [
        "We don't sell data, use it for advertising, or share it with anyone except the services that run the system (Vercel for hosting, Supabase for data, Apple and Google for sign-in and notifications).",
      ],
    },
    {
      title: "Deleting your data and contact",
      body: [
        "To see, correct or delete your data, or close your account, email info@arattaexpo.ir. An administrator can also remove a colleague's access at any time.",
      ],
    },
  ],
};

export default async function PrivacyPage({ params }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const fa = lang === "fa";
  return (
    <>
      <SiteChrome content={getContent(lang)} />
      <main id="main-content" className="section-shell min-h-screen pb-20 pt-36">
        <h1 className="text-3xl font-bold sm:text-5xl">{fa ? "حریم خصوصی" : "Privacy"}</h1>
        <p className="mt-4 text-sm text-ink-50">{fa ? `آخرین به‌روزرسانی: ${updated.fa}` : `Last updated: ${updated.en}`}</p>
        <div className="mt-10 max-w-3xl space-y-10">
          {sections[lang].map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-bold text-[var(--gold)]">{section.title}</h2>
              <div className="mt-4 space-y-3 leading-8 text-ink-70">
                {section.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter content={getContent(lang)} />
    </>
  );
}
