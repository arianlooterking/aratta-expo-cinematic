"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
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

  useEffect(() => {
    document.documentElement.lang = content.lang;
    document.documentElement.dir = getDirection(content.lang);

    if (window.location.hash === "#home") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [content.lang]);

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
      <header className="fixed inset-x-0 top-4 z-40 px-4">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 rounded-[2rem] border border-white/15 bg-black/25 px-3 py-2 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <Link href={`/${content.lang}`} className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 overflow-hidden rounded-full border border-white/20 bg-white/10">
              <Image
                src="/official/aratta-logo.png"
                alt={content.brand}
                fill
                sizes="44px"
                className="object-contain p-1.5"
                priority
              />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-white">{content.brand}</span>
              <span className="font-latin block text-[0.66rem] uppercase tracking-[0.28em] text-[var(--cyan)]">
                Expo Systems
              </span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
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
              className="liquid-button rounded-full px-4 py-2 text-sm font-semibold text-white"
            >
              {getLanguageLabel(content.lang)}
            </Link>
            <button
              type="button"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="glass grid h-11 w-11 place-items-center rounded-full text-white lg:hidden"
              onClick={() => setIsOpen((value) => !value)}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-x-4 top-24 z-30 origin-top rounded-3xl p-3 transition lg:hidden",
          isOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <nav
          aria-label="Mobile primary"
          className="glass grid max-h-[72vh] gap-1 overflow-y-auto rounded-3xl p-2"
        >
          {content.nav.map((item) => (
            <Link
              key={item.id}
              href={localizedHref(content.lang, item.id)}
              onClick={() => setIsOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm font-semibold text-white/86 hover:bg-white/10"
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
