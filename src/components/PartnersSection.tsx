import Link from "next/link";
import { ArrowUpRight, FileDown } from "lucide-react";
import { partnerGroups, partnerSourceHref } from "@/data/partners";
import type { Lang } from "@/lib/lang";
import { BuildBackdrop } from "@/components/backdrops/BuildBackdrop";

const copy = {
  fa: {
    kicker: "حامیان و مشارکت‌کنندگان",
    title: "در کنار نام‌های بزرگ معدن، فولاد و مس",
    body:
      "بزرگ‌ترین شرکت‌های معدنی و فولادی کشور در دوره‌های گذشته نمایشگاه‌های اَرَتَ حاضر بوده‌اند. نام‌ها از گزارش‌های رسمی منتشرشده در سایت اَرَتَ آمده‌اند.",
    list: "فهرست مشارکت‌کنندگان KIMEX 2025",
    page: "صفحه مشارکت‌کنندگان",
    source: "منبع",
  },
  en: {
    kicker: "Supporters and exhibitors",
    title: "Alongside the leading names in mining, steel and copper",
    body:
      "Iran's largest mining and steel companies have taken part in past Aratta exhibitions. Names are taken from the official reports Aratta has published.",
    list: "KIMEX 2025 participant list",
    page: "Participants page",
    source: "Source",
  },
} as const;

function monogram(name: string) {
  const word = name.replace(/^(شرکت|گروه)\s+/, "").trim();
  return word.charAt(0);
}

export function PartnersSection({
  lang,
  compact = false,
}: {
  lang: Lang;
  /** Inner pages: no heading block, just the names. */
  compact?: boolean;
}) {
  const text = copy[lang];
  const [supporters, exhibitors] = partnerGroups;
  const marquee = [...exhibitors.names, ...exhibitors.names];

  return (
    <section
      id={compact ? undefined : "partners"}
      aria-labelledby={compact ? undefined : "partners-title"}
      className={compact ? "" : "section-pad relative isolate"}
    >
      {compact ? null : (
        <BuildBackdrop motif="truss" lang={lang} className="end-[-30%] top-0 w-[170vw] lg:end-[calc(50%-min(590px,47%)-6rem)] lg:w-[min(900px,62vw)]" />
      )}
      <div className={compact ? "" : "section-shell"}>
        {compact ? null : (
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="section-kicker">{text.kicker}</div>
              <h2 id="partners-title" className="section-display-title mt-4 max-w-3xl text-balance font-black text-white">
                {text.title}
              </h2>
              <p className="site-copy mt-4 text-base text-white/62">{text.body}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/downloads/kimex-2025-participants-list.pdf"
                download
                className="liquid-button inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-black text-white"
              >
                <FileDown size={16} />
                {text.list}
              </a>
              <Link
                href={`/${lang}/participants`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-5 text-sm font-bold text-white/80 transition hover:border-white/25 hover:text-white"
              >
                {text.page}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        )}

        <div className={compact ? "" : "mt-10"}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-black text-white">{supporters.title[lang]}</h3>
            <Link
              href={partnerSourceHref(lang, supporters.names[0].source)}
              className="text-xs text-white/45 hover:text-[var(--cyan)]"
            >
              {text.source}: {supporters.note[lang]}
            </Link>
          </div>
          <ul className={compact ? "mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" : "mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4"}>
            {supporters.names.map((item) => (
              <li
                key={item.name.en}
                className="glass group flex min-h-20 items-center gap-3 rounded-[1.4rem] px-3 py-3 sm:min-h-24 sm:gap-4 sm:px-5 sm:py-4"
              >
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl border border-[var(--gold)]/35 bg-[radial-gradient(circle_at_30%_25%,rgba(255,236,196,0.35),rgba(214,174,101,0.12)_55%,rgba(0,0,0,0.2))] text-lg font-black text-[var(--gold)] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                >
                  {monogram(item.name[lang])}
                </span>
                <span className="text-sm font-black leading-6 text-white sm:text-[0.95rem]">
                  {item.name[lang]}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-black text-white">{exhibitors.title[lang]}</h3>
            <span className="text-xs text-white/45">{exhibitors.note[lang]}</span>
          </div>
          <div className="marquee mt-3" dir="ltr">
            <ul className="marquee-track" data-dir={lang === "fa" ? "rtl" : "ltr"}>
              {marquee.map((item, index) => (
                <li
                  key={`${item.name.en}-${index}`}
                  aria-hidden={index >= exhibitors.names.length ? true : undefined}
                  className="shrink-0"
                >
                  <Link
                    href={partnerSourceHref(lang, item.source)}
                    tabIndex={index >= exhibitors.names.length ? -1 : undefined}
                    dir={lang === "fa" ? "rtl" : "ltr"}
                    className="industrial-card flex min-h-14 items-center gap-3 whitespace-nowrap rounded-full px-5 text-sm font-bold text-white/80 transition hover:text-white"
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
                    {item.name[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
