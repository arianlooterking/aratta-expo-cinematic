"use client";

import Image from "next/image";
import { ArrowUpRight, BellRing, CalendarClock, Megaphone, CalendarPlus, Clock3, Download, MapPin, Send } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { CalendarCard as UpcomingCard, CalendarStatus } from "@/lib/public-calendar";

const statusCopy: Record<CalendarStatus, { fa: string; en: string; tone: string }> = {
  postponed: { fa: "به تعویق افتاده", en: "Postponed", tone: "border-blush-200/35 text-blush-200" },
  "dates-tba": { fa: "تاریخ به زودی اعلام می‌شود", en: "Dates to be announced", tone: "border-gilt-200/30 text-[var(--gold)]" },
  scheduled: { fa: "زمان‌بندی شده", en: "Scheduled", tone: "border-aqua-200/30 text-[var(--cyan)]" },
  "registration-open": { fa: "پذیرش درخواست غرفه باز است", en: "Booth inquiries open", tone: "border-jade-200/35 text-[var(--success)]" },
  live: { fa: "در حال برگزاری", en: "Happening now", tone: "border-jade-200/35 text-[var(--success)]" },
  past: { fa: "برگزار شده", en: "Held", tone: "border-ink/20 text-ink-60" },
};

export function UpcomingExhibitions({ lang, items, live }: { lang: "fa" | "en"; items: UpcomingCard[]; live: boolean }) {
  const fa = lang === "fa";
  const cities = useMemo(() => Array.from(new Set(items.map((i) => i.city).filter(Boolean))), [items]);
  const [city, setCity] = useState<string>("");
  const [datedOnly, setDatedOnly] = useState(false);
  const visible = items.filter((i) => (!city || i.city === city) && (!datedOnly || i.startsOn));
  const datedCount = items.filter((i) => i.startsOn).length;

  return (
    <section className="industrial-card rounded-[2rem] p-5 sm:p-7" aria-labelledby="upcoming-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="section-kicker">{fa ? "تقویم پیش رو" : "Upcoming calendar"}</div>
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-jade-200/30 px-3 py-1 text-xs font-bold text-[var(--success)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                {fa ? "به روز از دفتر اَرَتَ" : "Live from the Aratta office"}
              </span>
            ) : null}
          </div>
          <h2 id="upcoming-title" className="card-display-title mt-3 font-black text-ink">
            {fa ? "نمایشگاه‌های پیش روی اَرَتَ" : "Upcoming Aratta exhibitions"}
          </h2>
          <p className="site-copy mt-3 max-w-2xl text-ink-62">
            {datedCount
              ? fa
                ? "تاریخ‌های اعلام شده مستقیم از دفتر اَرَتَ به روز می‌شوند. برای دوره‌هایی که تاریخ ندارند، درخواست اطلاع رسانی بفرستید."
                : "Announced dates are published straight from the Aratta office. For editions without dates yet, ask to be notified."
              : fa
                ? "تاریخ دوره‌های بعدی هنوز رسما اعلام نشده است. هر رویداد را دنبال کنید تا به محض اعلام، تیم اَرَتَ با شما تماس بگیرد."
                : "Dates for the next editions are not officially announced yet. Follow any event and the Aratta team will contact you as soon as they are."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={fa ? "فیلتر شهر" : "Filter by city"}>
          <Chip active={!city} onClick={() => setCity("")}>
            {fa ? "همه شهرها" : "All cities"}
          </Chip>
          {cities.map((c) => (
            <Chip key={c} active={city === c} onClick={() => setCity(c)}>
              {c}
            </Chip>
          ))}
          {datedCount ? (
            <Chip active={datedOnly} onClick={() => setDatedOnly((v) => !v)}>
              {fa ? "فقط با تاریخ" : "Dated only"}
            </Chip>
          ) : null}
        </div>
      </div>

      {/* Phones and tablets swipe through the cards; desktops see them side by side. */}
      <div className="card-rail -mx-5 mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 sm:-mx-7 sm:px-7 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
        {visible.map((item) => (
          <UpcomingCardView key={item.key} item={item} fa={fa} />
        ))}
      </div>
      {visible.length > 1 ? (
        <p className="mt-2 text-center text-xs text-ink-40 lg:hidden">{fa ? "برای دیدن رویدادهای دیگر بکشید" : "Swipe for more events"}</p>
      ) : null}
      {!visible.length ? (
        <p className="mt-7 rounded-2xl border border-ink/10 bg-ink/[0.03] p-5 text-center text-ink-60">
          {fa ? "رویدادی با این فیلتر نیست." : "No events match this filter."}
        </p>
      ) : null}

      <p className="mt-6 flex items-start gap-2 text-sm leading-7 text-ink-50">
        <BellRing className="mt-1 shrink-0 text-[var(--gold)]" size={16} />
        {fa
          ? "دکمه‌ها فقط پیش‌نویس ایمیل یا فایل تقویم می‌سازند؛ هیچ ثبت نام، پرداخت یا تخصیص غرفه‌ای به صورت خودکار انجام نمی‌شود."
          : "These buttons only prepare an email draft or a calendar file; nothing registers, pays for, or allocates a booth automatically."}
      </p>
    </section>
  );
}

function UpcomingCardView({ item, fa }: { item: UpcomingCard; fa: boolean }) {
  const status = statusCopy[item.status];
  const countdown =
    item.daysToOpen != null && item.daysToOpen > 0
      ? fa
        ? `${item.daysToOpen.toLocaleString("fa-IR")} روز تا افتتاح`
        : `${item.daysToOpen} day${item.daysToOpen === 1 ? "" : "s"} to opening`
      : null;
  return (
    <article className="group flex w-[84%] max-w-[24rem] shrink-0 snap-start flex-col overflow-hidden rounded-[1.8rem] border border-ink/12 bg-shade/24 sm:w-[46%] lg:w-auto lg:max-w-none">
      <div className="on-photo relative aspect-[16/10]">
        <Image src={item.image} alt="" fill unoptimized sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/20 to-transparent" />
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: item.color }} />
        <span className={`absolute start-4 top-4 rounded-full border bg-shade/50 px-3 py-1 text-xs font-black backdrop-blur-xl ${status.tone}`}>
          {fa ? status.fa : status.en}
        </span>
        {countdown ? (
          <span className="absolute bottom-4 start-4 inline-flex items-center gap-1.5 rounded-full border border-ink/16 bg-shade/50 px-3 py-1 text-xs font-black text-ink backdrop-blur-xl">
            <Clock3 size={13} />
            {countdown}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-[var(--cyan)]">
          <CalendarClock size={16} className="shrink-0" />
          {item.dateText ?? (fa ? "تاریخ دوره بعد: اعلام نشده" : "Next edition: not announced")}
        </p>
        <h3 className="mt-3 text-lg font-black leading-8 sm:text-xl text-ink">{item.name}</h3>
        {item.summary ? <p className="mt-2 text-sm leading-7 text-ink-62">{item.summary}</p> : null}
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-60">
          <MapPin size={15} className="shrink-0 text-[var(--gold)]" />
          {[item.venue, item.city].filter(Boolean).join(fa ? "، " : ", ")}
        </p>
        {item.sectors.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.sectors.map((s) => (
              <span key={s} className="rounded-full border border-aqua-200/18 bg-aqua-200/7 px-3 py-1 text-xs font-bold text-aqua-100/82">
                {s}
              </span>
            ))}
          </div>
        ) : null}
        {item.notice ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-blush-200/20 bg-blush-200/[0.06] px-3 py-2 text-xs leading-6 text-blush-100/85">
            <Megaphone size={14} className="mt-1 shrink-0" />
            {item.notice}
          </p>
        ) : null}
        {item.lastEdition ? (
          <p className="mt-4 rounded-xl border border-ink/10 bg-ink/[0.03] px-3 py-2 text-xs leading-6 text-ink-55">
            {fa ? "آخرین دوره منتشرشده: " : "Last published edition: "}
            <span className="text-ink-75">{item.lastEdition}</span>
          </p>
        ) : null}
        <div className="mt-auto grid gap-2 pt-5">
          <a href={item.mailto} className="liquid-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-ink">
            {item.status === "registration-open" ? <Send size={17} /> : <BellRing size={17} />}
            {item.status === "registration-open"
              ? fa ? "درخواست غرفه" : "Request a booth"
              : fa ? "خبرم کنید" : "Notify me"}
          </a>
          {item.icsHref ? (
            <div className="grid grid-cols-2 gap-2">
              <a href={item.icsHref} download={`${item.key}.ics`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/14 bg-ink/[0.05] px-3 py-2.5 text-xs font-black text-ink">
                <Download size={15} />
                {fa ? "فایل تقویم" : "Calendar file"}
              </a>
              {item.googleHref ? (
                <a href={item.googleHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/14 bg-ink/[0.05] px-3 py-2.5 text-xs font-black text-ink">
                  <CalendarPlus size={15} />
                  Google Calendar
                </a>
              ) : null}
            </div>
          ) : null}
          {item.sourceHref ? (
            <Link href={item.sourceHref} className="inline-flex items-center justify-center gap-2 py-1 text-sm font-bold text-[var(--gold)] hover:text-ink">
              <ArrowUpRight size={16} />
              {item.postponed ? (fa ? "متن اطلاعیه رسمی" : "Read the official notice") : fa ? "دوره‌های قبلی" : "Past editions"}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-full border px-4 text-sm font-bold transition ${
        active ? "border-gilt-200/45 bg-gilt-200/14 text-[var(--gold)]" : "border-ink/14 bg-ink/[0.04] text-ink-70 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
