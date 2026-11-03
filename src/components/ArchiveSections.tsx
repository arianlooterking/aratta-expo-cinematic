import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpLeft,
  ArrowUpRight,
  FileDown,
  Newspaper,
  CalendarClock,
} from "lucide-react";
import type { Lang } from "@/lib/lang";
import {
  archiveDate,
  archiveDocuments,
  archiveEntries,
  archiveLabels,
  publicArchive,
  type ArchiveEntry,
} from "@/lib/legacy-archive";

export function ExhibitionNotice({ lang }: { lang: Lang }) {
  const fa = lang === "fa";
  return (
    <aside
      className="rounded-3xl border border-amber-200/30 bg-amber-200/[0.07] p-5 sm:p-7"
      aria-label={fa ? "آخرین اطلاعیه نمایشگاه" : "Latest exhibition notice"}
    >
      <div className="flex items-start gap-4">
        <CalendarClock className="mt-1 shrink-0 text-[var(--gold)]" size={25} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--gold)]">
            {fa
              ? "اطلاعیه رسمی · ۲۶ مرداد ۱۴۰۵"
              : "Official notice · 17 August 2026"}
          </p>
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            {fa
              ? "برگزاری نمایشگاه معدن کرمان به تعویق افتاده است"
              : "Kerman mining exhibition postponed"}
          </h2>
          <p className="mt-3 max-w-4xl leading-8 text-white/75">
            {fa
              ? "رویداد برنامه‌ریزی‌شده برای ۲۶ تا ۲۹ مرداد ۱۴۰۵ تا اطلاع بعدی به تعویق افتاده است. زمان و محل جدید پس از تأیید مراجع مربوط از طریق کانال‌های رسمی اعلام خواهد شد."
              : "The event planned for 17–20 August 2026 has been postponed until further notice. A new date and venue will be announced through official channels after the required approvals."}
          </p>
          <Link
            href={`/${lang}/archive/5807`}
            className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-[var(--gold)]"
          >
            {fa ? "متن کامل اطلاعیه" : "Read the full notice"}
            {fa ? <ArrowUpLeft size={18} /> : <ArrowUpRight size={18} />}
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function ArchiveCards({
  entries,
  lang,
}: {
  entries: ArchiveEntry[];
  lang: Lang;
}) {
  const fa = lang === "fa";
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <Link
          key={entry.id}
          href={`/${lang}/archive/${entry.id}`}
          className="industrial-card group flex min-w-0 flex-col overflow-hidden rounded-3xl transition hover:border-amber-200/40"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-white/[0.035]">
            {entry.images[0] ? (
              <Image
                src={entry.images[0].src}
                alt={entry.images[0].alt}
                fill
                unoptimized
                sizes="(min-width:1280px) 33vw, (min-width:768px) 50vw, 100vw"
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="grid h-full place-items-center text-[var(--gold)]">
                <Newspaper size={42} />
              </div>
            )}
            <span className="absolute start-4 top-4 rounded-full border border-white/20 bg-black/80 px-3 py-1 text-xs text-white">
              {archiveLabels[lang][entry.kind as keyof typeof archiveLabels.fa]}
            </span>
          </div>
          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <time
              dateTime={entry.publishedAt}
              className="text-sm text-[var(--gold)]"
            >
              {archiveDate(entry.publishedAt, lang)}
            </time>
            <h2
              className="mt-3 text-xl font-bold leading-9 text-white"
              dir="rtl"
              lang="fa"
            >
              {entry.title}
            </h2>
            <p
              className="mt-3 line-clamp-3 text-sm leading-7 text-white/65"
              dir="rtl"
              lang="fa"
            >
              {entry.paragraphs.find((p) => p.length > 60) ||
                entry.paragraphs[0]}
            </p>
            <span className="mt-auto flex items-center justify-between gap-3 pt-6 text-sm font-bold text-[var(--gold)]">
              <span>{fa ? "مشاهده مطلب" : "Read original article"}</span>
              {fa ? <ArrowUpLeft size={18} /> : <ArrowUpRight size={18} />}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function ArchiveOverview({ lang, kind }: { lang: Lang; kind?: string }) {
  const entries = publicArchive
    .filter((e) => !kind || e.kind === kind)
    .slice(0, 6);
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker">
            {lang === "fa" ? "بایگانی اَرَتَ" : "Aratta archive"}
          </p>
          <h2 className="mt-3 text-2xl font-bold">
            {lang === "fa"
              ? "خبرها، رویدادها و گزارش‌های نمایشگاهی"
              : "News, exhibitions and event reports"}
          </h2>
        </div>
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-[var(--gold)]"
          href={`/${lang}/archive${kind ? "?type=" + kind : ""}`}
        >
          {lang === "fa"
            ? `مشاهده همه ${publicArchive.filter((e) => !kind || e.kind === kind).length} مطلب`
            : "Browse the complete archive"}
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <ArchiveCards entries={entries} lang={lang} />
    </section>
  );
}

export function ArchiveDownloads({ lang }: { lang: Lang }) {
  const fa = lang === "fa";
  return (
    <section className="mt-10 rounded-3xl border border-white/15 p-5 sm:p-7">
      <h2 className="text-2xl font-bold">
        {fa
          ? "کتابخانه اسناد و کاتالوگ‌های نمایشگاهی"
          : "Exhibition documents and catalogues"}
      </h2>
      <p className="mt-3 text-white/65">
        {fa
          ? "فایل‌های دوره‌های گذشته برای مراجعه و بایگانی نگهداری می‌شوند؛ پیش از استفاده از فرم یا تعرفه، اعتبار آن را با دفتر اَرَتَ بررسی کنید."
          : "Past-edition documents are retained for reference. Confirm the validity of any form or tariff with the Aratta office before using it."}
      </p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {archiveDocuments.map((asset) => {
          const owner = archiveEntries.find((e) =>
            e.links.some((l) => l.href === asset.src),
          );
          return (
            <a
              key={asset.src}
              href={asset.src}
              download
              className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-4 hover:border-amber-200/40"
            >
              <FileDown
                size={23}
                className="mt-1 shrink-0 text-[var(--gold)]"
              />
              <span className="min-w-0">
                <strong
                  className="block break-words text-sm leading-7"
                  dir="auto"
                >
                  {asset.label ||
                    decodeURIComponent(
                      new URL(asset.sourceUrl).pathname.split("/").pop() ||
                        "Document",
                    )}
                </strong>
                {owner && (
                  <span
                    className="mt-1 block text-xs leading-6 text-white/55"
                    dir="rtl"
                  >
                    {owner.title}
                  </span>
                )}
                <span
                  className="mt-2 block text-xs text-[var(--gold)]"
                  dir="ltr"
                >
                  {asset.src.split(".").pop()?.toUpperCase()} ·{" "}
                  {(asset.bytes / 1024 / 1024).toFixed(1)} MB
                </span>
              </span>
            </a>
          );
        })}
      </div>
      <Link href={`/${lang}/archive?type=catalogue`} className="mt-6 inline-flex min-h-11 items-center gap-2 text-[var(--gold)]">
        {fa ? "مشاهده کتاب‌های نمایشگاهی" : "Browse exhibition books"}
        {fa ? <ArrowUpLeft size={18} /> : <ArrowUpRight size={18} />}
      </Link>
    </section>
  );
}

export function ArchiveGalleryLinks({ lang }: { lang: Lang }) {
  const fa = lang === "fa";
  const entries = archiveEntries.filter((entry) =>
    [2920, 4720, 4718, 4714].includes(entry.id),
  );
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">
        {fa ? "آلبوم‌های کامل نمایشگاه‌ها" : "Complete exhibition albums"}
      </h2>
      <p className="text-white/65">
        {fa
          ? "نسخه کامل تصاویر، پوسترها و گزارش‌های هر دوره را در آلبوم مربوط ببینید."
          : "Explore the full photographs, posters and reports in each edition’s album."}
      </p>
      <ArchiveCards entries={entries} lang={lang} />
    </section>
  );
}
