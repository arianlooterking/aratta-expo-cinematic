import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ArrowUpLeft, ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import type { SiteContent } from "@/data/aratta-content";
import { navGroups, navHref, telHref } from "@/data/site-nav";
import { brandLogoAlt, getBrandAssets } from "@/lib/brand-assets";
import { BuildBackdrop } from "@/components/backdrops/BuildBackdrop";

const footerCopy = {
  fa: {
    ctaKicker: "حضور در دوره بعد",
    ctaTitle: "برای غرفه بعدی‌تان از همین حالا برنامه بریزید",
    ctaBody:
      "تاریخ دوره‌های بعد پس از اعلام رسمی همین‌جا منتشر می‌شود. درخواست غرفه بدهید تا کارشناس فروش با شما تماس بگیرد.",
    ctaPrimary: "درخواست غرفه",
    ctaSecondary: "تماس با دفتر",
    about:
      "برگزارکننده نمایشگاه‌های تخصصی معدن، صنایع معدنی، فولاد، مس و زنجیره تأمین در کرمان و سیرجان.",
    contactTitle: "تماس",
    directions: "مسیریابی",
    backToTop: "بازگشت به بالا",
    year: new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date()),
  },
  en: {
    ctaKicker: "Next edition",
    ctaTitle: "Start planning your next booth now",
    ctaBody:
      "Dates for the next editions appear here once they are official. Send a booth request and a sales specialist will call you.",
    ctaPrimary: "Request a booth",
    ctaSecondary: "Contact the office",
    about:
      "Organiser of specialised mining, mineral industries, steel, copper and supply-chain exhibitions in Kerman and Sirjan.",
    contactTitle: "Contact",
    directions: "Directions",
    backToTop: "Back to top",
    year: String(new Date().getFullYear()),
  },
} as const;

export function SiteFooter({ content }: { content: SiteContent }) {
  const lang = content.lang;
  const copy = footerCopy[lang];
  const brand = getBrandAssets(lang);
  const isFa = lang === "fa";
  const Arrow = isFa ? ArrowUpLeft : ArrowUpRight;
  const groups = navGroups.filter((group) => group.key !== "company");

  return (
    <footer className="relative isolate mt-10 border-t border-ink/8 pb-8 pt-14 sm:pt-16">
      <BuildBackdrop motif="stand" lang={lang} tone="quiet" className="inset-x-0 bottom-[4.6rem] mx-auto w-[min(1040px,170vw)] max-sm:hidden" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent" />
      <div className="section-shell">
        <div className="glass relative isolate overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -end-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(214,174,101,0.22),transparent_65%)]" />
          <div className="pointer-events-none absolute -bottom-28 -start-20 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(125,220,232,0.14),transparent_65%)]" />
          <div className="grid gap-6 lg:grid-cols-[1.4fr_auto] lg:items-end">
            <div>
              <div className="section-kicker">{copy.ctaKicker}</div>
              <h2 className="mt-3 text-balance text-2xl font-black text-ink sm:text-3xl">
                {copy.ctaTitle}
              </h2>
              <p className="site-copy mt-3 text-sm text-ink-62 sm:text-base">{copy.ctaBody}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${lang}/registration#booth-request`}
                className="liquid-button liquid-button--gold inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black"
              >
                {copy.ctaPrimary}
                <Arrow size={17} />
              </Link>
              <Link
                href={`/${lang}/contact`}
                className="liquid-button inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black text-ink"
              >
                {copy.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-9 sm:gap-10 lg:grid-cols-[1.35fr_repeat(3,minmax(0,1fr))_1.15fr] lg:gap-8">
          <div className="col-span-2 lg:col-span-1">
            <Link href={`/${lang}`} className="inline-flex items-center gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[1.05rem] border border-ink/10 bg-black">
                <Image src={brand.logo} alt={brandLogoAlt[lang]} fill unoptimized sizes="56px" className="object-contain p-2" />
              </span>
              <span className="leading-tight">
                <span className="font-latin block text-sm font-black text-ink">Aratta Expo</span>
                <span className="mt-1 block text-xs font-bold text-[var(--cyan)]">
                  {content.contact.placeName}
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-ink-56">{copy.about}</p>
          </div>

          {groups.map((group) => (
            <nav key={group.key} aria-label={group.title[lang]}>
              <h3 className="text-sm font-black text-ink">{group.title[lang]}</h3>
              <ul className="mt-3 grid gap-0.5">
                {group.links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={navHref(lang, link.id)}
                      className="inline-flex min-h-11 items-center text-sm text-ink-58 transition hover:text-[var(--gold)]"
                    >
                      {link.label[lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 sm:col-span-1">
            <h3 className="text-sm font-black text-ink">{copy.contactTitle}</h3>
            <ul className="mt-3 grid gap-1 text-sm text-ink-58">
              {content.contact.phones.map((phone) => (
                <li key={phone}>
                  <a href={telHref(phone)} className="font-latin inline-flex min-h-10 items-center gap-2 hover:text-ink">
                    <Phone size={14} className="text-[var(--cyan)]" />
                    {phone}
                  </a>
                </li>
              ))}
              <li>
                <a href="mailto:info@arattaexpo.ir" className="font-latin inline-flex min-h-10 items-center gap-2 hover:text-ink">
                  <Mail size={14} className="text-[var(--cyan)]" />
                  info@arattaexpo.ir
                </a>
              </li>
              <li className="flex gap-2 pt-1 leading-6">
                <MapPin size={14} className="mt-1.5 shrink-0 text-[var(--cyan)]" />
                <span>
                  {content.contact.address}
                  <a
                    href={content.contact.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex w-fit items-center gap-1 font-bold text-[var(--gold)] hover:underline"
                  >
                    {copy.directions}
                    <Arrow size={14} />
                  </a>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink/8 pt-6 text-xs text-ink-44 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {copy.year} · {content.footer.copyright}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
            <Link href={`/${lang}/app`} className="inline-flex min-h-10 items-center hover:text-ink">
              {isFa ? "اپلیکیشن کارکنان" : "Staff app"}
            </Link>
            <Link href={`/${lang}/privacy`} className="inline-flex min-h-10 items-center hover:text-ink">
              {isFa ? "حریم خصوصی" : "Privacy"}
            </Link>
            <span className="font-latin">{content.footer.credit}</span>
            <a
              href="#main-content"
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/10 px-3 text-ink-70 transition hover:border-ink/25 hover:text-ink"
            >
              <ArrowUp size={14} />
              {copy.backToTop}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
