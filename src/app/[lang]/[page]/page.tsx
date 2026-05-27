import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  Factory,
  FileDown,
  FileText,
  Gauge,
  Headphones,
  Images,
  Layers3,
  ListChecks,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { GoogleMapPanel } from "@/components/GoogleMapPanel";
import { InquiryForm } from "@/components/InquiryForm";
import { SiteChrome } from "@/components/SiteChrome";
import { getContent } from "@/data/aratta-content";
import { getBrandAssets } from "@/lib/brand-assets";
import { getBoothFrameForPage } from "@/lib/booth-scenes";
import { isLang, languages, type Lang } from "@/lib/lang";
import { getLanguageSeo, siteName, socialPreviewImage } from "@/lib/seo";

const canonicalPageSlugs = [
  "about",
  "exhibitions",
  "registration",
  "forms",
  "equipment",
  "participants",
  "news",
  "gallery",
  "contact",
  "search",
] as const;

const pageSlugs = [...canonicalPageSlugs, "equipment-rental"] as const;

type PageSlug = (typeof canonicalPageSlugs)[number];
type RoutePageSlug = (typeof pageSlugs)[number];
type Content = ReturnType<typeof getContent>;

type PageProps = {
  params: Promise<{ lang: string; page: string }>;
};

export function generateStaticParams() {
  return languages.flatMap((lang) => pageSlugs.map((page) => ({ lang, page })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang: rawLang, page: rawPage } = await params;
  if (!isLang(rawLang) || !isPage(rawPage)) return {};
  const page = canonicalPage(rawPage);
  const content = getContent(rawLang);
  const brand = getBrandAssets(rawLang);
  const label = pageLabel(content, page);
  const seo = getLanguageSeo(rawLang);
  const description =
    rawLang === "fa"
      ? `${label} در سامانه نمایشگاهی اَرَت؛ مسیر رسمی برای اطلاعات، فرم ها، گالری و ارتباط قابل بررسی.`
      : `${label} in the Aratta Expo platform, with official information, forms, galleries, and verified contact paths.`;
  const title = `${label} | ${seo.shortTitle}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${rawLang}/${page}`,
      languages: {
        fa: `/fa/${page}`,
        en: `/en/${page}`,
      },
    },
    icons: {
      icon: [{ url: brand.tab, sizes: "512x512", type: "image/png" }],
      apple: [{ url: brand.tab, sizes: "512x512", type: "image/png" }],
    },
    openGraph: {
      title,
      description,
      url: `/${rawLang}/${page}`,
      siteName,
      locale: seo.locale,
      alternateLocale: [seo.alternateLocale],
      type: "website",
      images: [{ ...socialPreviewImage, alt: seo.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialPreviewImage.url],
    },
  };
}

export default async function RoutedPage({ params }: PageProps) {
  const { lang: rawLang, page: rawPage } = await params;
  if (!isLang(rawLang) || !isPage(rawPage)) notFound();

  const lang = rawLang as Lang;
  const page = canonicalPage(rawPage);
  const content = getContent(lang);

  return (
    <>
      <SiteChrome content={content} />
      <main dir={content.dir} lang={content.lang} className="min-h-screen pt-32">
        <section className="section-shell pb-24">
          <PageHeader
            eyebrow={lang === "fa" ? "صفحه رسمی" : "Official page"}
            title={pageLabel(content, page)}
            body={pageIntro(content, page)}
            page={page}
          />
          <div className="mt-10">{renderPage(content, page)}</div>
        </section>
      </main>
    </>
  );
}

function isPage(value: string): value is RoutePageSlug {
  return pageSlugs.includes(value as RoutePageSlug);
}

function canonicalPage(page: RoutePageSlug): PageSlug {
  return page === "equipment-rental" ? "equipment" : page;
}

function pageLabel(content: ReturnType<typeof getContent>, page: PageSlug) {
  if (page === "search") return content.lang === "fa" ? "جستجو" : "Search";
  return content.nav.find((item) => item.id === page)?.label ?? page;
}

function pageIntro(content: ReturnType<typeof getContent>, page: PageSlug) {
  const fa = content.lang === "fa";
  const copy: Record<PageSlug, string> = {
    about: content.about.body,
    exhibitions: content.exhibitions.note,
    registration: content.registration.body,
    forms: fa
      ? "همه فایل های رسمی قابل دانلود در یک مسیر روشن و قابل بررسی."
      : "All official downloadable files in one clear, verifiable path.",
    equipment: fa
      ? "مسیر دریافت لیست تجهیزات نمایشگاه و شروع هماهنگی اجرایی."
      : "Equipment list access and the start of operational coordination.",
    participants: fa
      ? "فهرست مشارکت کنندگان منتشرشده برای رویدادهای رسمی اَرَت."
      : "Published participant lists for official Aratta events.",
    news: content.news.title,
    gallery: content.gallery.title,
    contact: content.contact.title,
    search: fa
      ? "جستجوی سریع در مسیرهای کلیدی سایت، فرم ها، اخبار، گالری و تماس."
      : "Quick access across key site paths, forms, news, gallery, and contact.",
  };
  return copy[page];
}

function PageHeader({
  eyebrow,
  title,
  body,
  page,
}: {
  eyebrow: string;
  title: string;
  body: string;
  page: PageSlug;
}) {
  return (
    <div className="relative isolate min-h-[360px] overflow-hidden rounded-[2.2rem] border border-white/14 p-6 shadow-2xl shadow-black/30 lg:p-8">
      <Image
        src={getBoothFrameForPage(page)}
        alt=""
        fill
        sizes="(min-width: 1024px) 1180px, 100vw"
        className="absolute inset-0 -z-10 object-cover object-center"
        priority={page === "forms"}
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(2,5,8,0.92)_0%,rgba(2,5,8,0.72)_44%,rgba(2,5,8,0.2)_100%)] rtl:bg-[linear-gradient(270deg,rgba(2,5,8,0.92)_0%,rgba(2,5,8,0.72)_44%,rgba(2,5,8,0.2)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,5,8,0.08),rgba(2,5,8,0.72))]" />

      <div className="relative grid min-h-[300px] gap-6 lg:grid-cols-[0.78fr_1fr] lg:items-end">
        <div className="max-w-[44rem]">
          <div className="section-kicker">{eyebrow}</div>
          <h1 className="page-display-title mt-4 font-black text-white">{title}</h1>
          <p className="font-latin mt-5 inline-flex rounded-full border border-cyan-200/22 bg-black/28 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[var(--cyan)] backdrop-blur-xl">
            Aratta Expo / cinematic frame
          </p>
        </div>
        <p className="glass site-copy rounded-[1.6rem] p-6 text-base font-semibold text-white/76 sm:text-lg">
          {body}
        </p>
      </div>
    </div>
  );
}

function renderPage(content: ReturnType<typeof getContent>, page: PageSlug) {
  switch (page) {
    case "about":
      return <AboutPage content={content} />;
    case "exhibitions":
      return <ExhibitionsPage content={content} />;
    case "registration":
      return <RegistrationPage content={content} />;
    case "forms":
      return <DownloadsPage content={content} mode="forms" />;
    case "equipment":
      return <DownloadsPage content={content} mode="equipment" />;
    case "participants":
      return <DownloadsPage content={content} mode="participants" />;
    case "news":
      return <NewsPage content={content} />;
    case "gallery":
      return <GalleryPage content={content} />;
    case "contact":
      return <ContactPage content={content} />;
    case "search":
      return <SearchPage content={content} />;
  }
}

function getPageData(content: Content) {
  const fa = content.lang === "fa";
  const officialSource = "https://arattaexpo.ir";
  const eventSourceLinks = {
    kimex:
      "https://arattaexpo.ir/%d9%86%d9%87%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d8%a8%db%8c%d9%86-%d8%a7%d9%84%d9%85%d9%84%d9%84%db%8c-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7%db%8c%d8%b9/",
    sirjan:
      "https://arattaexpo.ir/%d8%af%d9%88%d9%85%db%8c%d9%86-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d9%86%d9%87%d8%b6%d8%aa-%d8%aa%d9%88%d9%84%db%8c%d8%af-%d8%af%d8%b1-%d9%85%d8%b9%d8%af%d9%86%d8%8c-%d8%b5%d9%86%d8%a7/",
  };

  const deepEvents = content.exhibitions.items.map((event, index) => {
    const details = fa
      ? [
          [
            "صفحه رسمی، KIMEX 2025 را برای ۱۲ تا ۱۵ مرداد ۱۴۰۴ در کرمان معرفی می کند.",
            "در همان صفحه، اطلاعیه تعلیق موقت نمایشگاه ها از طرف سازمان توسعه تجارت ایران درج شده است.",
            "مسیر رسمی دریافت فرم PDF نمایشگاه حفظ شده و وضعیت در این نسخه به صورت آرشیو/اطلاعیه نمایش داده می شود.",
          ],
          [
            "رویداد زنجیره تامین فولاد و مس در سایت اَرَت به عنوان مسیر ثبت نام و اطلاع رسانی منتشر شده است.",
            "این رویداد روی فولاد، مس، انرژی، فلزات آهنی و غیرآهنی و تجهیزات وابسته تمرکز دارد.",
            "به دلیل عبور تاریخ منتشرشده، کارت رویداد با وضعیت آرشیو نمایش داده می شود.",
          ],
          [
            "صفحه رسمی سیرجان، پارک گهر را به عنوان محل برگزاری معرفی می کند.",
            "حامیان اجرایی و صنعتی شامل مجموعه های مرتبط با گل گهر، صنایع معدنی و فولادی منطقه ذکر شده اند.",
            "شماره های پیگیری منتشرشده در سایت قدیمی شامل ۰۹۱۳۰۶۲۵۹۸۳، ۰۹۰۵۴۰۵۳۳۹۱، ۰۳۴۹۱۰۱۵۹۱۰ و ۰۲۱۹۱۳۰۵۹۱۰ است.",
          ],
        ]
      : [
          [
            "The official page presents KIMEX 2025 for August 3-6, 2025 in Kerman.",
            "The same page includes a temporary exhibition-suspension notice from Iran's Trade Promotion Organization.",
            "The official PDF participation form remains available, while this redesign marks the event as archived/notice-based.",
          ],
          [
            "The steel and copper supply-chain event is published by Aratta as an information and registration path.",
            "Its scope covers steel, copper, energy, ferrous and non-ferrous metals, and related equipment.",
            "Because the published date has passed, this redesign presents it as archive content.",
          ],
          [
            "The official Sirjan page names Gohar Park as the venue.",
            "The page references regional mining and steel supporters around Gol Gohar and Sirjan industrial operators.",
            "Published follow-up numbers include 09130625983, 09054053391, 03491015910, and 02191305910.",
          ],
        ];

    const images = [
      "/official-archive/kimex-2025-web-scaled.jpg",
      "/official-archive/steel-supply-news-2024.jpg",
      "/official-archive/sirjan-production-news-2024.jpg",
    ];

    const highlights = fa
      ? [
          ["معدن و صنایع معدنی", "ماشین آلات راه سازی", "تجهیزات وابسته", "فرم رسمی KIMEX"],
          ["فولاد و مس", "انرژی", "فلزات آهنی و غیرآهنی", "زنجیره تامین"],
          ["معدن و صنایع معدنی", "زنجیره فولاد و مس", "پارک گهر سیرجان", "شبکه سازی منطقه ای"],
        ]
      : [
          ["Mining industries", "Road machinery", "Related equipment", "Official KIMEX form"],
          ["Steel and copper", "Energy", "Ferrous and non-ferrous metals", "Supply chain"],
          ["Mining industries", "Steel and copper chain", "Gohar Park Sirjan", "Regional networking"],
        ];

    return {
      event,
      image: images[index] ?? event.image,
      sourceHref: index === 2 ? eventSourceLinks.sirjan : event.href,
      downloadHref: index === 0 ? content.registration.downloads[0]?.href : undefined,
      officialStatus: fa ? "آرشیو رسمی" : "Official archive",
      details: details[index] ?? [event.summary],
      highlights: highlights[index] ?? [],
      facts: [
        { label: fa ? "تاریخ منتشرشده" : "Published date", value: event.date },
        { label: fa ? "محل" : "Location", value: event.location },
        { label: fa ? "وضعیت امروز" : "Current status", value: fa ? "آرشیو/گذشته" : "Archived/past" },
      ],
    };
  });

  const archiveEvents = fa
    ? [
        { title: "هشتمین نمایشگاه بین المللی معدن و صنایع معدنی", date: "۱۹ تا ۲۲ خرداد ۱۴۰۳", place: "کرمان", sector: "معدن و تجهیزات" },
        { title: "چهارمین نمایشگاه زنجیره تامین فولاد، مس، انرژی و تجهیزات", date: "۲ تا ۵ دی ۱۴۰۲", place: "کرمان", sector: "فولاد و مس" },
        { title: "نمایشگاه نهضت تولید در معدن، صنایع معدنی و زنجیره فولاد و مس", date: "۱۴ تا ۱۷ اسفند ۱۳۹۹", place: "سیرجان", sector: "زنجیره تولید" },
        { title: "نمایشگاه تخصصی زنجیره تامین شرکت ملی صنایع مس ایران Caprrex 2020", date: "۱۴ تا ۱۶ تیر ۱۳۹۹", place: "کرمان", sector: "مس" },
        { title: "نمایشگاه تخصصی زنجیره تامین فولاد سیرجان Simex 2020", date: "۵ تا ۷ بهمن ۱۳۹۸", place: "سیرجان", sector: "فولاد" },
        { title: "نمایشگاه تخصصی زنجیره تامین فولاد سیرجان Simex 2019", date: "۲۵ تا ۲۸ دی ۱۳۹۷", place: "سیرجان", sector: "فولاد" },
      ]
    : [
        { title: "8th International Mining and Mineral Industries Exhibition", date: "June 8-11, 2024", place: "Kerman", sector: "Mining and equipment" },
        { title: "4th Steel, Copper, Energy and Equipment Supply Chain Exhibition", date: "December 23-26, 2023", place: "Kerman", sector: "Steel and copper" },
        { title: "Production Movement in Mining, Mineral Industries, Steel and Copper Chain", date: "March 4-7, 2021", place: "Sirjan", sector: "Production chain" },
        { title: "Caprrex 2020, National Iranian Copper Industries supply chain event", date: "July 4-6, 2020", place: "Kerman", sector: "Copper" },
        { title: "Simex 2020, Sirjan steel supply chain exhibition", date: "January 25-27, 2020", place: "Sirjan", sector: "Steel" },
        { title: "Simex 2019, Sirjan steel supply chain exhibition", date: "January 15-18, 2019", place: "Sirjan", sector: "Steel" },
      ];

  const registrationSteps = fa
    ? [
        "انتخاب رویداد و بررسی وضعیت آرشیو یا اطلاعیه رسمی",
        "دریافت فرم PDF رسمی و آماده سازی اطلاعات شرکت",
        "ثبت درخواست از طریق پیش نویس ایمیل یا تماس مستقیم",
        "پیگیری نهایی فقط از مسیر دفتر اَرَت و شماره های رسمی",
      ]
    : [
        "Choose the event and verify its archive or official-notice status",
        "Download the official PDF form and prepare company information",
        "Create the inquiry email draft or contact the office directly",
        "Complete follow-up only through Aratta office channels",
      ];

  const equipmentFlow = fa
    ? [
        { title: "مشاهده لیست", body: "لیست رسمی تجهیزات نمایشگاه به صورت JPG حفظ شده و قابل دانلود است." },
        { title: "تطبیق نیاز غرفه", body: "نوع غرفه، متراژ، برق، مبلمان، تجهیزات صوتی و ملزومات اجرایی بررسی می شود." },
        { title: "هماهنگی اجرایی", body: "هماهنگی نهایی از طریق تماس یا پیش نویس ایمیل انجام می شود؛ خرید آنلاین جعلی وجود ندارد." },
      ]
    : [
        { title: "Review the list", body: "The official exhibition equipment list is preserved as a downloadable JPG." },
        { title: "Match booth needs", body: "Booth size, power, furniture, AV, and operational requirements are clarified." },
        { title: "Coordinate execution", body: "Final coordination happens by phone or email draft; no fake online checkout is claimed." },
      ];

  const galleryGroups = fa
    ? [
        {
          title: "گزارش تصویری Caprrex 2020",
          date: "۱۴ تا ۱۶ تیر ۱۳۹۹",
          body: "آرشیو تصویری زنجیره تامین شرکت ملی صنایع مس ایران، بازسازی شده در گرید تصویری سریع و تمیز.",
          images: ["/official-archive/caprrex-2020-01.jpg", "/official-archive/caprrex-2020-14.jpg", "/official-archive/caprrex-2020-08.jpg", "/official-archive/caprrex-2020-07.jpg"],
        },
        {
          title: "گزارش تصویری Simex 2020",
          date: "۵ تا ۷ بهمن ۱۳۹۸",
          body: "تصاویر نمایشگاه تخصصی زنجیره تامین فولاد سیرجان، با تمرکز بر تعاملات صنعتی و فضای نمایشگاه.",
          images: ["/official-archive/simex-2020-13.jpg", "/official-archive/simex-2020-12.jpg", "/official-archive/simex-2020-11.jpg", "/official-archive/simex-2020-10.jpg"],
        },
        {
          title: "گزارش تصویری Simex 2019",
          date: "۲۵ تا ۲۸ دی ۱۳۹۷",
          body: "آرشیو اولیه سیمکس با چینش تصویری جدید برای مشاهده سریع در موبایل و دسکتاپ.",
          images: ["/official-archive/simex-2019-07.jpg", "/official-archive/simex-2019-06.jpg", "/official-archive/simex-2019-05.jpg", "/official-archive/simex-2019-04.jpg"],
        },
      ]
    : [
        {
          title: "Caprrex 2020 Photo Report",
          date: "July 4-6, 2020",
          body: "Copper supply-chain archive imagery rebuilt into a fast, clean image grid.",
          images: ["/official-archive/caprrex-2020-01.jpg", "/official-archive/caprrex-2020-14.jpg", "/official-archive/caprrex-2020-08.jpg", "/official-archive/caprrex-2020-07.jpg"],
        },
        {
          title: "Simex 2020 Photo Report",
          date: "January 25-27, 2020",
          body: "Sirjan steel supply-chain exhibition imagery focused on industrial meetings and show-floor activity.",
          images: ["/official-archive/simex-2020-13.jpg", "/official-archive/simex-2020-12.jpg", "/official-archive/simex-2020-11.jpg", "/official-archive/simex-2020-10.jpg"],
        },
        {
          title: "Simex 2019 Photo Report",
          date: "January 15-18, 2019",
          body: "Early Simex archive rebuilt for responsive browsing across mobile and desktop.",
          images: ["/official-archive/simex-2019-07.jpg", "/official-archive/simex-2019-06.jpg", "/official-archive/simex-2019-05.jpg", "/official-archive/simex-2019-04.jpg"],
        },
      ];

  const newsArchive = content.news.items.map((item, index) => ({
    ...item,
    image:
      [
        "/official-archive/steel-supply-news-2024.jpg",
        "/official-archive/sirjan-production-news-2024.jpg",
        "/official-archive/kerman-mining-2024.jpg",
        "/gallery/archive-06.jpg",
      ][index] ?? "/official-archive/kerman-mining-2023.jpg",
    category: fa ? ["فولاد و مس", "سیرجان", "معدن کرمان", "ویدئو"][index] : ["Steel and copper", "Sirjan", "Kerman mining", "Video"][index],
  }));

  return {
    officialSource,
    deepEvents,
    archiveEvents,
    registrationSteps,
    equipmentFlow,
    galleryGroups,
    newsArchive,
  };
}

function AboutPage({ content }: { content: Content }) {
  const data = getPageData(content);
  const fa = content.lang === "fa";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="industrial-card rounded-[2rem] p-7">
          <div className="flex items-center gap-3 text-[var(--cyan)]">
            <Building2 size={23} />
            <span className="font-latin text-xs font-black uppercase tracking-[0.22em]">
              Aratta Trade Development
            </span>
          </div>
          <h2 className="card-display-title mt-5 font-black text-white">
            {fa ? "اپراتور رویدادهای تخصصی معدن، فولاد و مس" : "Operator for mining, steel, and copper exhibition systems"}
          </h2>
          <p className="site-copy mt-5 text-lg text-white/68">{content.about.body}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {content.about.proof.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <CheckCircle2 className="shrink-0 text-[var(--gold)]" size={20} />
                <span className="font-bold text-white">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/14">
          <Image src="/concepts/aratta-hero-concept.png" alt="" fill sizes="40vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/24 to-transparent" />
          <div className="absolute inset-x-6 bottom-6">
            <p className="font-latin text-xs font-black uppercase tracking-[0.25em] text-[var(--cyan)]">
              2026+ redesign standard
            </p>
            <h3 className="card-display-title mt-3 font-black text-white">
              {fa ? "طراحی دوباره با حفظ واقعیت منبع" : "Redesigned without losing source truth"}
            </h3>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {content.hero.metrics.map((metric) => (
          <div key={metric.label} className="glass rounded-[1.6rem] p-5">
            <div className="font-latin text-3xl font-black text-white">{metric.value}</div>
            <p className="mt-2 text-sm leading-6 text-white/60">{metric.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-4">
        {content.services.items.map((service, index) => {
          const Icon = [Layers3, FileText, Wrench, Images][index] ?? BadgeCheck;
          return (
            <article key={service.title} className="industrial-card rounded-[1.7rem] p-6">
              <span className="grid h-13 w-13 place-items-center rounded-2xl border border-cyan-200/22 bg-cyan-200/8 text-[var(--cyan)]">
                <Icon size={23} />
              </span>
              <h3 className="mt-5 text-2xl font-black leading-tight text-white">{service.title}</h3>
              <p className="site-copy mt-3 text-white/62">{service.body}</p>
            </article>
          );
        })}
      </section>

      <section className="industrial-card rounded-[2rem] p-7">
        <div className="flex items-center gap-3">
          <CalendarClock className="text-[var(--gold)]" size={22} />
          <h2 className="text-2xl font-black text-white">
            {fa ? "خط زمانی رویدادهای منتشرشده" : "Published event timeline"}
          </h2>
        </div>
        <div className="mt-6 grid gap-3">
          {data.archiveEvents.map((event) => (
            <div key={event.title} className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:grid-cols-[1fr_12rem_8rem]">
              <strong className="text-white">{event.title}</strong>
              <span className="text-white/62">{event.date}</span>
              <span className="text-[var(--gold)]">{event.place}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ExhibitionsPage({ content }: { content: Content }) {
  const data = getPageData(content);
  const fa = content.lang === "fa";

  return (
    <div className="space-y-8">
      <section className="glass overflow-hidden rounded-[2rem]">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[440px]">
            <Image src={data.deepEvents[0].image} alt={data.deepEvents[0].event.title} fill sizes="50vw" className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/18 to-transparent" />
            <div className="absolute bottom-6 start-6 end-6">
              <span className="rounded-full border border-amber-200/32 bg-black/42 px-3 py-1 text-xs font-black text-[var(--gold)] backdrop-blur-xl">
                {data.deepEvents[0].officialStatus}
              </span>
              <p className="font-latin mt-3 text-sm font-black uppercase tracking-[0.22em] text-white/80">
                KIMEX 2025 / Official poster
              </p>
            </div>
          </div>
          <div className="p-7">
            <div className="font-latin text-xs font-black uppercase tracking-[0.24em] text-[var(--cyan)]">
              {fa ? "داده رسمی، طراحی بهتر" : "Official data, better structure"}
            </div>
            <h2 className="card-display-title mt-4 font-black text-white">
              {data.deepEvents[0].event.title}
            </h2>
            <p className="site-copy mt-5 text-lg text-white/70">{data.deepEvents[0].event.summary}</p>
            <div className="mt-6 grid gap-3">
              {data.deepEvents[0].facts.map((fact) => (
                <div key={fact.label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
                  <span className="text-white/54">{fact.label}</span>
                  <strong className="text-white">{fact.value}</strong>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={data.deepEvents[0].sourceHref} target="_blank" rel="noreferrer" className="liquid-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-black text-white">
                <ExternalLink size={18} />
                {fa ? "صفحه رسمی" : "Official page"}
              </a>
              {data.deepEvents[0].downloadHref ? (
                <a href={data.deepEvents[0].downloadHref} download={content.registration.downloads[0]?.fileName} className="inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white/[0.055] px-5 py-3 font-black text-white">
                  <Download size={18} />
                  {fa ? "فرم PDF" : "PDF form"}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {data.deepEvents.map((item) => (
          <article key={item.event.title} className="industrial-card overflow-hidden rounded-[2rem]">
            <div className="relative aspect-[4/3]">
              <Image src={item.image} alt={item.event.title} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 to-transparent" />
              <span className="absolute start-4 top-4 rounded-full border border-amber-200/25 bg-black/40 px-3 py-1 text-xs font-bold text-[var(--gold)] backdrop-blur-xl">
                {item.officialStatus}
              </span>
            </div>
            <div className="p-6">
              <p className="flex items-center gap-2 text-sm text-[var(--cyan)]">
                <CalendarClock size={16} />
                {item.event.date} / {item.event.location}
              </p>
              <h2 className="mt-4 min-h-24 text-xl font-black leading-8 text-white">{item.event.title}</h2>
              <p className="mt-3 min-h-24 leading-7 text-white/62">{item.event.summary}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.highlights.map((highlight) => (
                  <span key={highlight} className="rounded-full border border-cyan-200/18 bg-cyan-200/7 px-3 py-1 text-xs font-bold text-cyan-100/82">
                    {highlight}
                  </span>
                ))}
              </div>
              <details className="mt-5 rounded-2xl border border-white/10 bg-black/22 p-4">
                <summary className="cursor-pointer font-bold text-[var(--gold)]">
                  {fa ? "خلاصه داده اصلی سایت قبل" : "Previous-site source snapshot"}
                </summary>
                <ul className="mt-4 grid gap-3 text-sm leading-7 text-white/64">
                  {item.details.map((detail) => (
                    <li key={detail} className="flex gap-2">
                      <CheckCircle2 className="mt-1 shrink-0 text-[var(--cyan)]" size={15} />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
              <a href={item.sourceHref} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-bold text-[var(--gold)]">
                <ArrowUpRight size={18} />
                {fa ? "مشاهده منبع رسمی" : "Open official source"}
              </a>
            </div>
          </article>
        ))}
      </section>

      <section className="industrial-card rounded-[2rem] p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="section-kicker">{fa ? "آرشیو رویدادها" : "Event archive"}</div>
            <h2 className="card-display-title mt-3 font-black text-white">
              {fa ? "رویدادهای قدیمی منتشرشده در سایت اَرَت" : "Older events published on Aratta"}
            </h2>
          </div>
          <span className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white/58">
            {fa ? "همه به عنوان آرشیو نمایش داده می شوند" : "All shown as archived"}
          </span>
        </div>
        <div className="mt-7 grid gap-3">
          {data.archiveEvents.map((event) => (
            <div key={event.title} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[1fr_12rem_8rem_9rem]">
              <strong className="text-white">{event.title}</strong>
              <span className="text-white/62">{event.date}</span>
              <span className="text-white/62">{event.place}</span>
              <span className="text-[var(--gold)]">{event.sector}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RegistrationPage({ content }: { content: Content }) {
  const data = getPageData(content);
  const fa = content.lang === "fa";

  return (
    <div className="space-y-7">
      <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="industrial-card rounded-[2rem] p-7">
          <div className="flex items-center gap-3 text-[var(--gold)]">
            <ClipboardCheck size={23} />
            <span className="font-latin text-xs font-black uppercase tracking-[0.22em]">Official workflow</span>
          </div>
          <h2 className="card-display-title mt-5 font-black text-white">{content.registration.title}</h2>
          <p className="site-copy mt-4 text-white/66">{content.registration.body}</p>
          <ol className="mt-6 grid gap-3">
            {data.registrationSteps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <span className="font-latin grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-200/24 text-[var(--cyan)]">
                  {index + 1}
                </span>
                <span className="font-bold leading-7 text-white/78">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="glass rounded-[2rem] p-7">
          <h2 className="card-display-title font-black text-white">{content.registration.formTitle}</h2>
          <p className="mt-3 flex items-start gap-2 leading-8 text-white/60">
            <ShieldCheck className="mt-1 shrink-0 text-[var(--success)]" size={18} />
            {fa
              ? "اطلاعات در مرورگر پردازش می شود و فقط پیش نویس ایمیل ساخته می شود؛ ثبت نهایی جعلی انجام نمی شود."
              : "Data is handled in the browser and only an email draft is created; no fake final registration is claimed."}
          </p>
          <div className="mt-6">
            <InquiryForm content={content} />
          </div>
        </div>
      </section>

      <DownloadsPage content={content} mode="forms" compact />
    </div>
  );
}

function DownloadsPage({
  content,
  mode,
  compact = false,
}: {
  content: Content;
  mode: "forms" | "equipment" | "participants";
  compact?: boolean;
}) {
  const data = getPageData(content);
  const fa = content.lang === "fa";
  const downloads =
    mode === "forms"
      ? content.registration.downloads
      : mode === "equipment"
        ? content.registration.downloads.filter((item) => item.category === "equipment")
        : content.registration.downloads.filter((item) => item.category === "participants");
  const modeCopy = {
    forms: {
      icon: FileText,
      title: fa ? "کتابخانه فرم ها و فایل های رسمی" : "Official forms and file library",
      body: fa
        ? "همه فایل ها به مسیرهای رسمی سایت اَرَت وصل هستند. این صفحه فقط دانلود و آماده سازی را ساده می کند."
        : "Every file remains linked to Aratta's official source. This page only improves discovery and preparation.",
    },
    equipment: {
      icon: Wrench,
      title: fa ? "اجاره تجهیزات و آماده سازی غرفه" : "Equipment rental and booth readiness",
      body: fa
        ? "لیست رسمی تجهیزات در کنار روند هماهنگی نمایش داده می شود تا درخواست اجرایی دقیق تر ثبت شود."
        : "The official equipment list is paired with a coordination workflow so operational requests are clearer.",
    },
    participants: {
      icon: Users,
      title: fa ? "فهرست مشارکت کنندگان و مسیر بررسی" : "Participants list and review path",
      body: fa
        ? "فهرست منتشرشده KIMEX 2025 به صورت PDF حفظ شده و با توضیح وضعیت آرشیو نمایش داده می شود."
        : "The published KIMEX 2025 participant PDF is preserved and shown with clear archive context.",
    },
  }[mode];
  const ModeIcon = modeCopy.icon;

  return (
    <div className="space-y-7">
      {!compact ? (
        <section className="glass relative isolate overflow-hidden rounded-[2rem] p-7">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_12%,rgba(125,220,232,0.16),transparent_22rem),radial-gradient(circle_at_86%_18%,rgba(214,174,101,0.16),transparent_20rem)]" />
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <span className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan-200/28 bg-cyan-200/9 text-[var(--cyan)] shadow-[0_0_30px_rgba(125,220,232,0.12)]">
                <ModeIcon size={29} />
              </span>
              <div className="section-kicker mt-6">{fa ? "دانلود واقعی" : "Real downloads"}</div>
              <h2 className="card-display-title mt-4 font-black text-white">{modeCopy.title}</h2>
              <p className="site-copy mt-4 text-base text-white/64">{modeCopy.body}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: fa ? "فایل محلی" : "Local file", value: `${downloads.length}` },
                { label: fa ? "منبع رسمی" : "Official source", value: "Aratta" },
                { label: fa ? "فرمت ها" : "Formats", value: Array.from(new Set(downloads.map((item) => item.type))).join(" / ") },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-black/24 p-5">
                  <div className="font-latin text-2xl font-black text-white">{item.value}</div>
                  <div className="mt-2 text-sm font-bold text-white/54">{item.label}</div>
                </div>
              ))}
              <div className="sm:col-span-3 rounded-[1.4rem] border border-amber-200/18 bg-amber-200/[0.055] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 shrink-0 text-[var(--gold)]" size={20} />
                  <p className="site-copy text-white/70">
                    {fa
                      ? "دکمه اصلی، فایل واقعی همین سایت را دانلود می کند؛ لینک منبع رسمی هم جدا نگه داشته شده است."
                      : "The primary action downloads the real mirrored file from this site; the official source link is kept separately."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {mode === "equipment" ? (
        <section className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/14 bg-white">
            <Image src="/official-archive/equipment-list.jpg" alt={fa ? "لیست تجهیزات نمایشگاه" : "Exhibition equipment list"} fill sizes="45vw" className="object-contain p-3" />
          </div>
          <div className="grid gap-4">
            {data.equipmentFlow.map((step, index) => (
              <article key={step.title} className="industrial-card rounded-[1.6rem] p-6">
                <div className="flex items-center gap-3">
                  <span className="font-latin grid h-10 w-10 place-items-center rounded-xl border border-amber-200/24 text-[var(--gold)]">
                    {index + 1}
                  </span>
                  <h3 className="text-2xl font-black text-white">{step.title}</h3>
                </div>
                <p className="site-copy mt-3 text-white/62">{step.body}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {mode === "participants" ? (
        <section className="industrial-card rounded-[2rem] p-7">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="section-kicker">{fa ? "PDF رسمی" : "Official PDF"}</div>
              <h2 className="card-display-title mt-3 font-black text-white">
                {fa ? "مشارکت کنندگان KIMEX 2025" : "KIMEX 2025 participants"}
              </h2>
              <p className="site-copy mt-4 text-white/62">
                {fa
                  ? "این فهرست به صورت فایل PDF از سایت قبلی حفظ شده است. چون تاریخ رویداد گذشته، وضعیت آن آرشیوی است."
                  : "This list is preserved as a PDF from the previous site. Because the event date has passed, its status is archival."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[fa ? "منبع رسمی" : "Official source", fa ? "وضعیت آرشیو" : "Archive status", fa ? "دانلود مستقیم" : "Direct download"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center font-bold text-white">
                  <ListChecks className="mx-auto mb-3 text-[var(--cyan)]" size={22} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={compact ? "grid gap-3 md:grid-cols-3" : "grid gap-5 md:grid-cols-2 lg:grid-cols-3"}>
        {downloads.map((item) => (
          <article
            key={item.href}
            className="industrial-card group relative flex min-h-[22rem] flex-col justify-between overflow-hidden rounded-[1.8rem] p-6 transition hover:-translate-y-1 hover:border-cyan-200/35"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--cyan)] via-white/70 to-[var(--gold)] opacity-70" />
            <div className="pointer-events-none absolute -end-14 -top-14 h-36 w-36 rounded-full bg-cyan-200/10 blur-3xl" />
            <div>
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/12 bg-black/24 text-[var(--cyan)]">
                <FileDown size={25} />
                </span>
                <span className="font-latin rounded-full border border-amber-200/24 bg-amber-200/8 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-[var(--gold)]">
                  {item.type}
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-black leading-tight text-white">{item.label}</h3>
              <p className="site-copy mt-3 min-h-16 text-white/64">{item.description}</p>
              <dl className="mt-6 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <dt className="text-white/46">{fa ? "نام فایل" : "File"}</dt>
                  <dd className="font-latin truncate text-white/80">{item.fileName}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
                  <dt className="text-white/46">{fa ? "حجم" : "Size"}</dt>
                  <dd className="font-latin text-white/80">{item.size}</dd>
                </div>
              </dl>
            </div>
            <div className="mt-7 grid gap-3">
              <a
                href={item.href}
                download={item.fileName}
                className="liquid-button inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-black text-white"
              >
                <Download size={18} />
                {fa ? "دانلود مستقیم فایل" : "Download file"}
              </a>
              <a
                href={item.sourceHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 font-bold text-white/72 transition hover:border-amber-200/30 hover:text-white"
              >
                <ExternalLink size={17} />
                {fa ? "مشاهده منبع رسمی" : "Open official source"}
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function NewsPage({ content }: { content: Content }) {
  const data = getPageData(content);
  const fa = content.lang === "fa";

  return (
    <div className="space-y-7">
      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-white/14">
          <Image src={data.newsArchive[0].image} alt={data.newsArchive[0].title} fill sizes="60vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-x-7 bottom-7">
            <span className="rounded-full border border-cyan-200/24 bg-black/38 px-3 py-1 text-xs font-black text-[var(--cyan)]">
              {data.newsArchive[0].category}
            </span>
            <h2 className="card-display-title mt-4 max-w-3xl font-black text-white">
              {data.newsArchive[0].title}
            </h2>
            <p className="site-copy mt-4 max-w-2xl text-white/70">{data.newsArchive[0].body}</p>
          </div>
        </article>
        <div className="industrial-card rounded-[2rem] p-7">
          <Newspaper className="text-[var(--gold)]" size={30} />
          <h2 className="card-display-title mt-5 font-black text-white">
            {fa ? "خبرها به عنوان آرشیو رسمی" : "News as an official archive"}
          </h2>
          <p className="site-copy mt-4 text-white/62">
            {fa
              ? "خبرهای سایت قبلی با تصویر، تاریخ، دسته و لینک منبع نگهداری شده اند؛ تاریخ های گذشته به عنوان خبر آرشیوی نمایش داده می شوند."
              : "Previous-site updates are kept with image, date, category, and source link; past dates are presented as archived news."}
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {data.newsArchive.map((item) => (
          <article key={item.title} className="industrial-card overflow-hidden rounded-[1.8rem]">
            <div className="relative aspect-[16/9]">
              <Image src={item.image} alt={item.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 to-transparent" />
              <span className="absolute start-4 top-4 rounded-full border border-white/12 bg-black/38 px-3 py-1 text-xs font-bold text-white/82 backdrop-blur-xl">
                {item.category}
              </span>
            </div>
            <div className="p-6">
              <time className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                {item.date}
              </time>
              <h2 className="mt-4 text-2xl font-black leading-tight text-white">{item.title}</h2>
              <p className="site-copy mt-3 text-white/64">{item.body}</p>
              {item.href ? (
                <a href={item.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-bold text-[var(--gold)]">
                  <ArrowUpRight size={18} />
                  {fa ? "مشاهده منبع رسمی" : "Open official source"}
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function GalleryPage({ content }: { content: Content }) {
  const data = getPageData(content);
  const fa = content.lang === "fa";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="industrial-card rounded-[2rem] p-7">
          <BookOpen className="text-[var(--gold)]" size={30} />
          <h2 className="card-display-title mt-5 font-black text-white">
            {fa ? "آرشیو تصویری سایت قبلی، بازسازی شده" : "Previous-site image archive, rebuilt"}
          </h2>
          <p className="site-copy mt-4 text-white/62">
            {fa
              ? "تصاویر رسمی قدیمی از Caprrex و Simex در کنار گالری فعلی قرار گرفته اند تا صفحه گالری فقط یک شبکه عکس ساده نباشد."
              : "Older official Caprrex and Simex media now sits beside the current gallery so the page is more than a simple image grid."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.galleryGroups.map((group) => (
            <div key={group.title} className="glass rounded-[1.6rem] p-5">
              <Images className="text-[var(--cyan)]" size={24} />
              <h3 className="mt-4 text-xl font-black leading-7 text-white">{group.title}</h3>
              <p className="mt-2 font-latin text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">
                {group.date}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        {data.galleryGroups.map((group) => (
          <article key={group.title} className="industrial-card rounded-[2rem] p-5 sm:p-7">
            <div className="mb-5 grid gap-3 md:grid-cols-[0.7fr_1.3fr] md:items-end">
              <div>
                <div className="section-kicker">{group.date}</div>
                <h2 className="card-display-title mt-3 font-black text-white">{group.title}</h2>
              </div>
              <p className="site-copy text-white/62">{group.body}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {group.images.map((src, index) => (
                <div key={src} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/12 bg-black/30">
                  <Image src={src} alt={`${group.title} ${index + 1}`} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/48 to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="glass rounded-[2rem] p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="section-kicker">{content.gallery.kicker}</div>
            <h2 className="card-display-title mt-3 font-black text-white">{content.gallery.title}</h2>
          </div>
          <span className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm text-white/58">
            {fa ? "با لایت باکس" : "With lightbox"}
          </span>
        </div>
        <GalleryLightbox content={content} />
      </section>
    </div>
  );
}

function ContactPage({ content }: { content: Content }) {
  const fa = content.lang === "fa";
  return (
    <div className="space-y-7">
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="industrial-card rounded-[2rem] p-7">
          <ContactLine icon={<MapPin size={21} />} label={content.contact.addressLabel}>
            {content.contact.address}
          </ContactLine>
          <ContactLine icon={<Mail size={21} />} label={content.contact.emailLabel}>
            <a href="mailto:info@arattaexpo.ir">info@arattaexpo.ir</a>
          </ContactLine>
          <ContactLine icon={<Headphones size={21} />} label={content.contact.phoneLabel}>
            {content.contact.phones.map((phone) => (
              <a key={phone} href={`tel:${phone}`} className="me-4 inline-block">
                {phone}
              </a>
            ))}
          </ContactLine>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <a href="tel:03491305910" className="liquid-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-white">
              <Phone size={18} />
              034-91305910
            </a>
            <a href="mailto:info@arattaexpo.ir" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.055] px-4 py-3 font-black text-white">
              <Mail size={18} />
              info@arattaexpo.ir
            </a>
          </div>
        </div>
        <GoogleMapPanel content={content} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="industrial-card rounded-[2rem] p-7">
          <Sparkles className="text-[var(--cyan)]" size={30} />
          <h2 className="card-display-title mt-5 font-black text-white">
            {fa ? "درخواست سریع همکاری یا غرفه" : "Quick participation or booth request"}
          </h2>
          <p className="site-copy mt-4 text-white/62">
            {fa
              ? "برای امنیت و صداقت، فرم یک پیش نویس ایمیل می سازد و چیزی را به صورت مخفی یا جعلی ارسال نمی کند."
              : "For safety and honesty, the form creates an email draft and does not silently submit or fake a backend action."}
          </p>
        </div>
        <div className="glass rounded-[2rem] p-7">
          <InquiryForm content={content} />
        </div>
      </section>
    </div>
  );
}

function SearchPage({ content }: { content: Content }) {
  const data = getPageData(content);
  const fa = content.lang === "fa";
  const links = content.nav.filter((item) => item.id !== "home");
  return (
    <div className="space-y-7">
      <section className="industrial-card rounded-[2rem] p-6">
        <div className="flex items-center gap-3 rounded-full border border-white/12 bg-black/28 px-5 py-4 text-white/62">
          <Search size={20} />
          <span>{fa ? "مسیرهای قابل جستجو" : "Searchable site paths"}</span>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => (
            <Link key={item.id} href={`/${content.lang}/${item.id}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 font-bold text-white transition hover:bg-white/[0.075]">
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="glass rounded-[1.8rem] p-6">
          <Factory className="text-[var(--gold)]" size={26} />
          <h2 className="mt-4 text-2xl font-black text-white">{fa ? "نمایشگاه ها" : "Exhibitions"}</h2>
          <div className="mt-5 grid gap-3">
            {data.deepEvents.map((item) => (
              <Link key={item.event.title} href={`/${content.lang}/exhibitions`} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-bold leading-6 text-white/78">
                {item.event.title}
              </Link>
            ))}
          </div>
        </div>
        <div className="glass rounded-[1.8rem] p-6">
          <FileDown className="text-[var(--cyan)]" size={26} />
          <h2 className="mt-4 text-2xl font-black text-white">{fa ? "دانلودها" : "Downloads"}</h2>
          <div className="mt-5 grid gap-3">
            {content.registration.downloads.map((item) => (
              <a key={item.href} href={item.href} download={item.fileName} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-bold leading-6 text-white/78">
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <div className="glass rounded-[1.8rem] p-6">
          <Gauge className="text-[var(--success)]" size={26} />
          <h2 className="mt-4 text-2xl font-black text-white">{fa ? "اقدام سریع" : "Quick actions"}</h2>
          <div className="mt-5 grid gap-3">
            <Link href={`/${content.lang}/registration`} className="rounded-2xl border border-white/10 bg-black/20 p-4 font-bold text-white/78">
              {content.hero.primary}
            </Link>
            <Link href={`/${content.lang}/contact`} className="rounded-2xl border border-white/10 bg-black/20 p-4 font-bold text-white/78">
              {content.contact.title}
            </Link>
            <Link href={`/${content.lang}/gallery`} className="rounded-2xl border border-white/10 bg-black/20 p-4 font-bold text-white/78">
              {content.gallery.title}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactLine({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-6 flex gap-4 last:mb-0">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/8 text-[var(--cyan)]">
        {icon}
      </span>
      <div>
        <p className="text-sm font-black text-[var(--gold)]">{label}</p>
        <div className="mt-1 leading-8 text-white/72">{children}</div>
      </div>
    </div>
  );
}
