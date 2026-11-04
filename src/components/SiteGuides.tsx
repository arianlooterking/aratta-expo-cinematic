import Link from "next/link";
import { ArrowUpLeft, ArrowUpRight, ChevronDown, FileText, Headphones, LayoutGrid, Wrench } from "lucide-react";
import { faq, journey, quickActions, t, type QuickAction } from "@/data/site-guides";
import type { Lang } from "@/lib/lang";

const actionIcon: Record<QuickAction["id"], typeof LayoutGrid> = {
  booth: LayoutGrid,
  forms: FileText,
  equipment: Wrench,
  contact: Headphones,
};

/** Four doors into the site, placed straight after the hero. */
export function QuickActions({ lang }: { lang: Lang }) {
  const Arrow = lang === "fa" ? ArrowUpLeft : ArrowUpRight;
  return (
    <nav aria-label={lang === "fa" ? "اقدام سریع" : "Quick actions"} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {quickActions.map((a) => {
        const Icon = actionIcon[a.id];
        return (
          <Link
            key={a.id}
            href={`/${lang}${a.href}`}
            className="industrial-card group flex min-h-[8.5rem] flex-col justify-between rounded-[1.6rem] p-4 transition hover:-translate-y-0.5 hover:border-cyan-200/35 sm:p-5"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/22 bg-cyan-200/8 text-[var(--cyan)]">
                <Icon size={20} />
              </span>
              <Arrow size={18} className="text-white/35 transition group-hover:text-[var(--gold)]" />
            </span>
            <span>
              <span className="block text-base font-black text-white sm:text-lg">{t(lang, a.title)}</span>
              <span className="mt-1 block text-xs leading-6 text-white/55 sm:text-sm">{t(lang, a.body)}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** How taking part works, from choosing an event to the last show day. */
export function ExhibitorJourney({ lang, heading = true }: { lang: Lang; heading?: boolean }) {
  const fa = lang === "fa";
  return (
    <div>
      {heading ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="section-kicker">{fa ? "مسیر مشارکت" : "Exhibitor journey"}</div>
            <h2 className="section-display-title mt-4 font-black text-white">
              {fa ? "از اولین تماس تا آخرین روز نمایشگاه" : "From first call to the last show day"}
            </h2>
          </div>
          <p className="site-copy text-white/62">
            {fa
              ? "شش قدم روشن که هر مشارکت‌کننده با تیم اَرَتَ طی می‌کند. در هر مرحله یک نفر از تیم پیگیر کار شماست."
              : "Six clear steps every exhibitor takes with the Aratta team, with one person following up at each stage."}
          </p>
        </div>
      ) : null}
      <ol className={`${heading ? "mt-9" : ""} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`}>
        {journey.map((step, i) => (
          <li key={step.kicker.en} className="industrial-card relative overflow-hidden rounded-[1.6rem] p-5 sm:p-6">
            <span className="pointer-events-none absolute -bottom-5 end-3 font-latin text-[5rem] font-black leading-none text-white/[0.04]">
              {String(i + 1).padStart(2, "0")}
            </span>
            {lang === "fa" ? (
              <span className="text-xs font-black text-[var(--gold)]">
                گام {(i + 1).toLocaleString("fa-IR")} · {step.kicker.fa}
              </span>
            ) : (
              <span className="font-latin text-xs font-black uppercase tracking-[0.2em] text-[var(--gold)]">
                {String(i + 1).padStart(2, "0")} · {step.kicker.en}
              </span>
            )}
            <h3 className="mt-3 text-lg font-black leading-8 text-white sm:text-xl">{t(lang, step.title)}</h3>
            <p className="mt-2 text-sm leading-7 text-white/60">{t(lang, step.body)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Frequent questions as a native accordion: works without JavaScript. */
export function FaqList({ lang, limit }: { lang: Lang; limit?: number }) {
  const items = limit ? faq.slice(0, limit) : faq;
  return (
    <div className="grid gap-3">
      {items.map((item, i) => (
        <details key={item.q.en} className="industrial-card group rounded-[1.4rem] px-5 py-1 open:border-amber-200/25" open={i === 0}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-black text-white [&::-webkit-details-marker]:hidden">
            {t(lang, item.q)}
            <ChevronDown size={19} className="shrink-0 text-[var(--gold)] transition group-open:rotate-180" />
          </summary>
          <p className="site-copy pb-5 text-white/66">{t(lang, item.a)}</p>
        </details>
      ))}
    </div>
  );
}
