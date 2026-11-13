"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpLeft,
  ArrowUpRight,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
import { isActiveNav, navGroups, navHref, primaryNav, telHref } from "@/data/site-nav";
import { brandLogoAlt, getBrandAssets } from "@/lib/brand-assets";
import { cn } from "@/lib/cn";
import {
  getAlternateLang,
  getDirection,
  getLanguageLabel,
  type Lang,
} from "@/lib/lang";
import { clearTheme, restoreTheme } from "@/lib/theme";
import { ThemeSwitch } from "@/components/ThemeSwitch";

type SiteChromeProps = {
  content: SiteContent;
};

export function SiteChrome({ content }: SiteChromeProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const lang = content.lang;
  const altLang = getAlternateLang(lang);
  const brand = getBrandAssets(content.lang);
  const isFa = lang === "fa";
  const Arrow = isFa ? ArrowUpLeft : ArrowUpRight;

  // The public theme lives on <html> while a public page is on screen. The
  // inline head script sets it on a full load; this puts it back after React's
  // development remount or a client navigation from the portal, and hands the
  // page back to the portal's own palette when the header goes away.
  useLayoutEffect(() => {
    restoreTheme();
    return clearTheme;
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = getDirection(lang);

    if (window.location.hash === "#home") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [lang]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === "Tab") {
        const links = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>("a[href]") || [],
        );
        const nodes = [menuButton.current, ...links].filter(
          (node): node is HTMLElement => Boolean(node),
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max <= 0 ? 0 : Math.min(1, window.scrollY / max));
      setScrolled(window.scrollY > 24);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const altHref = useMemo(
    () => pathname?.replace(/^\/(fa|en)/, `/${altLang}`) || `/${altLang}`,
    [altLang, pathname],
  );

  const close = () => setIsOpen(false);

  return (
    <>
      <a
        href="#main-content"
        className="fixed start-4 top-3 z-[60] -translate-y-24 rounded-full bg-white px-4 py-2 font-bold text-black transition focus:translate-y-0"
      >
        {isFa ? "پرش به محتوای اصلی" : "Skip to main content"}
      </a>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-[3px] bg-ink/5"
      >
        <div
          className="scroll-progress h-full bg-gradient-to-r from-[var(--gold)] via-[var(--cyan)] to-[var(--steel)] ltr:origin-left rtl:origin-right"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>
      <header className="fixed inset-x-0 top-3 z-40 px-3 sm:top-4 sm:px-4">
        <div
          data-scrolled={scrolled || isOpen}
          className="glass-header mx-auto flex w-full max-w-[1380px] items-center justify-between gap-2 rounded-[1.6rem] px-2 py-2 sm:gap-3 sm:rounded-[2rem] sm:px-3"
        >
          <Link
            href={`/${lang}`}
            className="flex min-w-0 items-center gap-3"
            onClick={close}
          >
            <span className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-[0.9rem] border border-ink/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_14px_34px_rgba(0,0,0,0.35)] sm:h-14 sm:w-14 sm:rounded-[1.05rem]">
              <Image
                src={brand.logo}
                alt={brandLogoAlt[lang]}
                fill
                unoptimized
                sizes="56px"
                className="object-contain p-[7px] sm:p-2"
                loading="eager"
              />
            </span>
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="font-latin block max-w-[13rem] truncate text-sm font-black text-ink">
                Aratta Expo
              </span>
              <span
                className={cn(
                  "mt-1 block whitespace-nowrap font-bold",
                  isFa
                    ? "text-[0.7rem] text-[var(--cyan)]"
                    : "font-latin text-[0.62rem] tracking-[0.035em] text-ink-68",
                )}
              >
                {isFa
                  ? "شرکت توسعه تجارت اَرَتَ"
                  : "Exhibition | Trade Fair | Event"}
              </span>
            </span>
          </Link>

          <nav
            aria-label={isFa ? "ناوبری اصلی" : "Primary navigation"}
            className="hidden items-center gap-0.5 rounded-full border border-ink/8 bg-ink/[0.03] p-1 xl:flex"
          >
            {primaryNav.map((item) => {
              const active = isActiveNav(pathname, lang, item.id);
              return (
                <Link
                  key={item.id}
                  href={navHref(lang, item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-full px-[0.55rem] py-2 text-[0.82rem] font-semibold transition min-[1360px]:px-2.5 2xl:px-3.5 2xl:text-[0.84rem]",
                    active
                      ? "bg-ink/12 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                      : "text-ink-72 hover:bg-ink/8 hover:text-ink",
                  )}
                >
                  {item.label[lang]}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href={`/${lang}/search`}
              aria-label={isFa ? "جستجو" : "Search"}
              className="hidden h-10 w-10 place-items-center rounded-full text-ink-80 transition hover:bg-ink/10 hover:text-ink md:grid"
            >
              <Search size={18} />
            </Link>
            <Link
              href={altHref}
              hrefLang={altLang}
              lang={altLang}
              className="inline-flex min-h-11 items-center rounded-full border border-ink/12 bg-ink/[0.04] px-3 text-xs font-semibold text-ink-86 transition hover:bg-ink/10 hover:text-ink sm:px-3.5 sm:text-[0.82rem]"
            >
              {getLanguageLabel(lang)}
            </Link>
            <ThemeSwitch lang={lang} />
            <Link
              href={`/${lang}/registration#booth-request`}
              className="liquid-button liquid-button--gold hidden min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[0.82rem] font-black lg:inline-flex"
            >
              {isFa ? "درخواست غرفه" : "Request a booth"}
              <Arrow size={15} />
            </Link>
            <button
              ref={menuButton}
              type="button"
              aria-label={
                isOpen
                  ? isFa
                    ? "بستن منو"
                    : "Close menu"
                  : isFa
                    ? "باز کردن منو"
                    : "Open menu"
              }
              aria-expanded={isOpen}
              aria-controls="site-menu"
              className="liquid-button grid h-11 w-11 place-items-center rounded-full text-ink"
              onClick={() => setIsOpen((value) => !value)}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div
        aria-hidden="true"
        onClick={close}
        className={cn(
          "fixed inset-0 z-30 bg-shade/50 backdrop-blur-[2px] transition duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        className={cn(
          "fixed inset-x-3 top-[5.25rem] z-30 mx-auto max-w-[1380px] origin-top transition duration-300 sm:inset-x-4 sm:top-[6rem]",
          isOpen
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0",
        )}
      >
        <nav
          ref={menuRef}
          id="site-menu"
          aria-label={isFa ? "همه صفحه‌ها" : "All pages"}
          aria-hidden={!isOpen}
          inert={!isOpen}
          className="glass max-h-[calc(100svh-6.5rem)] overflow-y-auto overscroll-contain rounded-[1.75rem] p-3 sm:max-h-[calc(100svh-7.5rem)] sm:p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {navGroups.map((group) => (
              <div key={group.key} className="rounded-[1.25rem] border border-ink/8 bg-ink/[0.025] p-3">
                <div className="px-2 pb-2 pt-1 text-[0.72rem] font-black text-[var(--gold)]">
                  {group.title[lang]}
                </div>
                <ul className="grid gap-0.5">
                  {group.links.map((link) => {
                    const active = isActiveNav(pathname, lang, link.id);
                    return (
                      <li key={link.id}>
                        <Link
                          href={navHref(lang, link.id)}
                          onClick={close}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 transition",
                            active ? "bg-ink/10" : "hover:bg-ink/[0.06]",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-ink">
                              {link.label[lang]}
                            </span>
                            {link.hint ? (
                              <span className="mt-0.5 block truncate text-xs text-ink-50">
                                {link.hint[lang]}
                              </span>
                            ) : null}
                          </span>
                          <Arrow
                            size={15}
                            className="shrink-0 text-ink-25 transition group-hover:text-[var(--cyan)]"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 rounded-[1.25rem] border border-ink/8 bg-shade/20 p-3 sm:mt-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-72">
              {content.contact.phones.map((phone) => (
                <a
                  key={phone}
                  href={telHref(phone)}
                  className="font-latin inline-flex min-h-10 items-center gap-2 hover:text-ink"
                >
                  <Phone size={15} className="text-[var(--cyan)]" />
                  {phone}
                </a>
              ))}
              <a
                href="mailto:info@arattaexpo.ir"
                className="font-latin inline-flex min-h-10 items-center gap-2 hover:text-ink"
              >
                <Mail size={15} className="text-[var(--cyan)]" />
                info@arattaexpo.ir
              </a>
              <a
                href={content.contact.directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 hover:text-ink"
              >
                <MapPin size={15} className="text-[var(--cyan)]" />
                {isFa ? "دفتر کرمان، بلوار جهاد" : "Kerman office, Jahad Blvd"}
              </a>
            </div>
            <Link
              href={`/${lang}/registration#booth-request`}
              onClick={close}
              className="liquid-button liquid-button--gold inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-black"
            >
              {isFa ? "درخواست غرفه" : "Request a booth"}
              <Arrow size={16} />
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}

export function localizedHref(lang: Lang, id: string) {
  return navHref(lang, id);
}
