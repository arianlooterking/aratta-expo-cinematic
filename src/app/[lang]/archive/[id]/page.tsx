import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { SiteFooter } from "@/components/SiteFooter";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { getContent } from "@/data/aratta-content";
import { isLang, languages } from "@/lib/lang";
import {
  archiveEntries,
  archiveDate,
  localizeSourceLink,
} from "@/lib/legacy-archive";
import { siteUrl } from "@/lib/seo";
type Props = { params: Promise<{ lang: string; id: string }> };
export function generateStaticParams() {
  return languages.flatMap((lang) =>
    archiveEntries.map((e) => ({ lang, id: e.slug })),
  );
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const item = archiveEntries.find((e) => e.slug === id);
  if (!item || !isLang(lang)) return {};
  const title = `${item.title} | اَرَت`;
  const description =
    item.paragraphs.find((p) => p.length > 60)?.slice(0, 180) || item.title;
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/archive/${id}`,
      languages: { fa: `/fa/archive/${id}`, en: `/en/archive/${id}` },
    },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: item.publishedAt,
      images: item.images[0]
        ? [{ url: siteUrl + item.images[0].src, alt: item.images[0].alt }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: item.images[0] ? [siteUrl + item.images[0].src] : [],
    },
  };
}
export default async function ArchiveArticle({ params }: Props) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const entry = archiveEntries.find((e) => e.slug === id);
  if (!entry) notFound();
  const content = getContent(lang);
  const fa = lang === "fa";
  const links = entry.links.filter(
    (l) =>
      !l.href.includes("wp-admin") &&
      !l.href.includes("wp-login") &&
      !l.href.includes("replytocom") &&
      !l.href.includes("mailto:") &&
      !l.href.includes("instagtam"),
  );
  return (
    <>
      <SiteChrome content={content} />
      <main
        id="main-content"
        className="section-shell min-h-screen pb-20 pt-36"
      >
        <nav
          aria-label={fa ? "مسیر صفحه" : "Breadcrumb"}
          className="mb-7 flex flex-wrap gap-3 text-sm text-[var(--gold)]"
        >
          <Link href={`/${lang}`}>{fa ? "خانه" : "Home"}</Link>
          <span>/</span>
          <Link href={`/${lang}/archive`}>
            {fa ? "آرشیو اَرَت" : "Aratta archive"}
          </Link>
        </nav>
        <article className="mx-auto max-w-5xl">
          <header className="border-b border-white/15 pb-8">
            <time
              className="text-sm text-[var(--gold)]"
              dateTime={entry.publishedAt}
            >
              {fa ? "تاریخ انتشار: " : "Published: "}
              {archiveDate(entry.publishedAt, lang)}
            </time>
            <h1
              lang="fa"
              dir="rtl"
              className="mt-5 text-3xl font-bold leading-[1.65] sm:text-4xl"
            >
              {entry.title}
            </h1>
            <p className="mt-6 rounded-2xl border border-white/15 bg-white/[0.035] p-4 text-sm leading-7 text-white/65">
              {entry.kind === "catalogue"
                ? fa
                  ? "معرفی کتاب از آرشیو رسمی اَرَت. فروش و پرداخت آنلاین در این وبسایت فعال نیست؛ برای دسترسی به کتاب و شرایط تهیه آن با دفتر اَرَت تماس بگیرید."
                  : "A book listing from the official Aratta archive. Online purchases and payments are not enabled here. Contact the Aratta office for access and current availability. Original Persian descriptions are preserved below."
                : entry.id === 5807
                ? fa
                  ? "اطلاعیه رسمی؛ تاریخ جدید هنوز در منبع اعلام نشده است."
                  : "Official notice; the source has not announced a new date."
                : fa
                  ? "این مطلب از آرشیو رسمی اَرَت است. تاریخ‌ها، شرایط و اطلاعات آن مربوط به زمان انتشار است و به معنی باز بودن ثبت‌نام یا تأیید برنامه جدید نیست."
                  : "Original Aratta archive. Dates, conditions and details reflect the time of publication and do not indicate open registration or a confirmed new event. The complete original Persian text is preserved below."}
            </p>
          </header>
          <div
            className="mt-9 space-y-6 text-lg leading-[2.15] text-white/85"
            dir="rtl"
            lang="fa"
          >
            {entry.paragraphs.map((p, index) => (
              <p key={index}>{p}</p>
            ))}
          </div>
          {links.length > 0 && (
            <section className="my-10 rounded-3xl border border-white/15 p-5">
              <h2 className="text-xl font-bold">
                {fa ? "فایل‌ها و پیوندهای مرتبط" : "Files & related links"}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={localizeSourceLink(link.href, lang)}
                    className="min-w-0 break-words rounded-2xl border border-white/10 p-4 text-sm leading-7 text-[var(--gold)] hover:border-amber-200/40"
                    rel="noreferrer"
                    dir="auto"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </section>
          )}
          {entry.images.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-6 text-2xl font-bold">
                {fa
                  ? "تصاویر و پوسترهای مطلب"
                  : "Article photographs & posters"}{" "}
                <span className="text-sm text-white/55">
                  ({new Intl.NumberFormat(lang).format(entry.images.length)})
                </span>
              </h2>
              <GalleryLightbox
                content={{
                  ...content,
                  gallery: {
                    ...content.gallery,
                    items: entry.images.map((img, i) => ({
                      ...img,
                      caption: fa
                        ? `تصویر ${i + 1} · ${entry.title}`
                        : `Image ${i + 1} · Aratta archive`,
                    })),
                  },
                }}
              />
            </section>
          )}
          <div className="mt-12 border-t border-white/15 pt-6">
            <Link
              href={`/${lang}/archive`}
              className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-6 text-[var(--gold)]"
            >
              {fa ? "بازگشت به آرشیو" : "Back to archive"}
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter content={content} />
    </>
  );
}
