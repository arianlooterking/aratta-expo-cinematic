import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { SiteChrome } from "@/components/SiteChrome";
import { ArchiveCards, ExhibitionNotice } from "@/components/ArchiveSections";
import { SiteFooter } from "@/components/SiteFooter";
import { getContent } from "@/data/aratta-content";
import { isLang } from "@/lib/lang";
import {
  archiveLabels,
  normalizeSearch,
  publicArchive,
} from "@/lib/legacy-archive";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return {
    title:
      lang === "fa"
        ? "آرشیو اخبار و نمایشگاه‌ها | اَرَتَ"
        : "News & exhibition archive | Aratta",
    alternates: {
      canonical: `/${lang}/archive`,
      languages: { fa: "/fa/archive", en: "/en/archive" },
    },
  };
}

export default async function ArchivePage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const values = await searchParams;
  const fa = lang === "fa";
  const q = typeof values.q === "string" ? values.q.trim().slice(0, 200) : "";
  const type =
    typeof values.type === "string" &&
    ["news", "exhibition", "report", "catalogue"].includes(values.type)
      ? values.type
      : "all";
  const year = typeof values.year === "string" ? values.year : "";
  const years = [
    ...new Set(
      publicArchive.map((e) =>
        new Intl.DateTimeFormat(fa ? "fa-IR-u-nu-latn" : "en-GB", {
          year: "numeric",
        }).format(new Date(e.publishedAt)),
      ),
    ),
  ]
    .sort()
    .reverse();
  const filtered = publicArchive.filter(
    (e) =>
      (type === "all" || e.kind === type) &&
      (!year ||
        new Intl.DateTimeFormat(fa ? "fa-IR-u-nu-latn" : "en-GB", {
          year: "numeric",
        }).format(new Date(e.publishedAt)) === year) &&
      (!q ||
        normalizeSearch([e.title, ...e.paragraphs].join(" ")).includes(
          normalizeSearch(q),
        )),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const page = Math.max(
    1,
    Math.min(pageCount, Math.floor(Number(values.p) || 1)),
  );
  function pageHref(p: number) {
    return `/${lang}/archive?${new URLSearchParams({ q, type, year, p: String(p) })}`;
  }
  const inputClass =
    "min-h-12 min-w-0 rounded-2xl border border-ink/20 bg-[var(--field)] px-4 text-ink";
  return (
    <>
      <SiteChrome content={getContent(lang)} />
      <main
        id="main-content"
        className="section-shell min-h-screen pb-20 pt-36"
      >
        <Link href={`/${lang}/news`} className="text-sm text-[var(--gold)]">
          {fa ? "اخبار اَرَتَ" : "Aratta news"}
        </Link>
        <h1 className="mt-4 text-3xl font-bold sm:text-5xl">
          {fa ? "آرشیو اخبار و نمایشگاه‌ها" : "News & exhibition archive"}
        </h1>
        <p className="mt-5 max-w-3xl leading-8 text-ink-65">
          {fa
            ? "گزارش‌ها، اطلاعیه‌ها و تصاویر رسمی اَرَتَ را بر اساس موضوع، سال یا نام شرکت پیدا کنید. تاریخ هر مطلب، تاریخ انتشار آن است؛ نه زمان ثبت‌نام جدید."
            : "Find Aratta reports, notices and photographs by topic, year or company. Dates indicate original publication, not new registration availability. Original articles are preserved in Persian."}
        </p>
        <div className="my-8">
          <ExhibitionNotice lang={lang} />
        </div>
        <form
          action={`/${lang}/archive`}
          className="grid gap-3 rounded-3xl border border-ink/15 p-4 md:grid-cols-[1fr_180px_130px_auto]"
          role="search"
        >
          <label className="grid gap-2 text-sm">
            <span>{fa ? "جستجو در متن" : "Search articles"}</span>
            <input
              name="q"
              defaultValue={q}
              placeholder={
                fa
                  ? "نام شرکت، موضوع یا نمایشگاه…"
                  : "Company, topic or exhibition…"
              }
              className={inputClass}
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>{fa ? "موضوع" : "Topic"}</span>
            <select name="type" defaultValue={type} className={inputClass}>
              {["all", "news", "exhibition", "report", "catalogue"].map((key) => (
                <option key={key} value={key}>
                  {archiveLabels[lang][key as keyof typeof archiveLabels.fa]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>{fa ? "سال انتشار" : "Published year"}</span>
            <select name="year" defaultValue={year} className={inputClass}>
              <option value="">{fa ? "همه سال‌ها" : "All years"}</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <button
            className="flex min-h-12 items-center justify-center gap-2 self-end rounded-2xl bg-[var(--gold-fill)] px-6 font-bold text-black"
            type="submit"
          >
            <Search size={18} />
            {fa ? "جستجو" : "Search"}
          </button>
        </form>
        <div
          className="my-6 flex items-center justify-between text-sm text-ink-65"
          aria-live="polite"
        >
          <p>
            {new Intl.NumberFormat(lang).format(filtered.length)}{" "}
            {fa ? "مطلب یافت شد" : "articles found"}
          </p>
          {(q || type !== "all" || year) && (
            <Link
              href={`/${lang}/archive`}
              className="min-h-11 py-3 text-[var(--gold)]"
            >
              {fa ? "پاک کردن فیلترها" : "Clear filters"}
            </Link>
          )}
        </div>
        {filtered.length ? (
          <ArchiveCards
            entries={filtered.slice((page - 1) * 12, page * 12)}
            lang={lang}
          />
        ) : (
          <div className="rounded-3xl border border-ink/15 p-10 text-center">
            <h2 className="text-xl">
              {fa ? "مطلبی پیدا نشد" : "No articles found"}
            </h2>
            <p className="mt-3 text-ink-65">
              {fa
                ? "عبارت کوتاه‌تری بنویسید یا فیلترها را پاک کنید."
                : "Try a shorter search or clear the filters."}
            </p>
          </div>
        )}
        {pageCount > 1 && (
          <nav
            aria-label={fa ? "صفحه‌بندی آرشیو" : "Archive pagination"}
            className="mt-8 flex flex-wrap justify-center gap-2"
          >
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={pageHref(p)}
                aria-current={p === page ? "page" : undefined}
                className={`grid min-h-11 min-w-11 place-items-center rounded-xl border ${p === page ? "border-[var(--gold-fill)] bg-[var(--gold-fill)] text-black" : "border-ink/20 text-ink"}`}
              >
                {new Intl.NumberFormat(lang).format(p)}
              </Link>
            ))}
          </nav>
        )}
      </main>
      <SiteFooter content={getContent(lang)} />
    </>
  );
}
