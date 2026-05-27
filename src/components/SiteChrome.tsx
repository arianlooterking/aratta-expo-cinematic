"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
import { getBrandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/cn";
import { getAlternateLang, getDirection, getLanguageLabel, type Lang } from "@/lib/lang";

type SiteChromeProps = {
  content: SiteContent;
};

export function SiteChrome({ content }: SiteChromeProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const altLang = getAlternateLang(content.lang);
  const brand = getBrandAssets(content.lang);
  const isFa = content.lang === "fa";

  useEffect(() => {
    document.documentElement.lang = content.lang;
    document.documentElement.dir = getDirection(content.lang);

    if (window.location.hash === "#home") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [content.lang]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max <= 0 ? 0 : Math.min(1, window.scrollY / max));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const altHref = useMemo(() => pathname?.replace(/^\/(fa|en)/, `/${altLang}`) || `/${altLang}`, [altLang, pathname]);

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-1 bg-white/5"
      >
        <div
          className="h-full bg-gradient-to-r from-[var(--gold)] via-[var(--cyan)] to-[var(--steel)]"
          style={{ width: `${scrollProgress * 100}%` }}
        />
      </div>
      <header className="fixed inset-x-0 top-3 z-40 px-3 sm:top-4 sm:px-4">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-2 rounded-[1.6rem] border border-white/15 bg-black/35 px-2 py-2 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:gap-3 sm:rounded-[2rem] sm:px-3">
          <Link href={`/${content.lang}`} className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "relative flex h-14 w-14 shrink-0 overflow-hidden rounded-[1.05rem] border border-amber-200/24 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_14px_34px_rgba(0,0,0,0.35)] sm:h-16 sm:w-16 sm:rounded-[1.2rem]",
              )}
            >
              <Image
                src={brand.logo}
                alt={content.brand}
                fill
                sizes="64px"
                className="object-cover"
                priority
              />
            </span>
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="block max-w-[13rem] truncate text-sm font-black text-white">
                {isFa ? "شرکت توسعه تجارت اَرَت" : "Aratta Expo"}
              </span>
              <span
                className={cn(
                  "font-latin mt-0.5 block font-black",
                  isFa
                    ? "text-[0.66rem] uppercase tracking-[0.26em] text-[var(--cyan)]"
                    : "whitespace-nowrap text-[0.62rem] tracking-[0.035em] text-white/68",
                )}
              >
                {isFa ? "Expo Systems" : "Exhibition | Trade Fair | Event"}
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 xl:flex">
            {content.nav.map((item) => (
              <Link
                key={item.id}
                href={localizedHref(content.lang, item.id)}
                className="rounded-full px-3 py-2 text-sm text-white/78 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={`/${content.lang}/search`}
              aria-label={content.lang === "fa" ? "جستجو" : "Search"}
              className="hidden h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white md:grid"
            >
              <Search size={18} />
            </Link>
            <Link
              href={altHref}
              hrefLang={altLang}
              className="liquid-button rounded-full px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm"
            >
              {getLanguageLabel(content.lang)}
            </Link>
            <button
              type="button"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="glass grid h-11 w-11 place-items-center rounded-full text-white xl:hidden"
              onClick={() => setIsOpen((value) => !value)}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-x-3 top-[5.75rem] z-30 origin-top rounded-3xl p-0 transition duration-300 xl:hidden",
          isOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <nav
          aria-label="Mobile primary"
          className="glass grid max-h-[calc(100svh-7rem)] gap-1 overflow-y-auto rounded-3xl p-3 shadow-2xl shadow-black/50"
        >
          <Link
            href={`/${content.lang}/search`}
            onClick={() => setIsOpen(false)}
            className="mb-2 flex items-center justify-between rounded-2xl border border-cyan-200/18 bg-cyan-200/8 px-4 py-3 text-sm font-black text-white"
          >
            <span>{content.lang === "fa" ? "جستجوی سایت" : "Search the site"}</span>
            <Search size={18} className="text-[var(--cyan)]" />
          </Link>
          {content.nav.map((item) => (
            <Link
              key={item.id}
              href={localizedHref(content.lang, item.id)}
              onClick={() => setIsOpen(false)}
              className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-white/86 hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

export function localizedHref(lang: Lang, id: string) {
  return id === "home" ? `/${lang}` : `/${lang}/${id}`;
}
