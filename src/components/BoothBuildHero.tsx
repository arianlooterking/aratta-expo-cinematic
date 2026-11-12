"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, FileDown, Images, UserRoundPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SiteContent } from "@/data/aratta-content";
import type { BoothQuality, BoothScene } from "@/components/booth3d/booth-scene";
import { CHAPTER_STARTS, chapterAt } from "@/components/booth3d/timeline";

type BoothBuildHeroProps = {
  content: SiteContent;
};

const faDigits = (value: string) => value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/**
 * Landing hero: a real 3D exhibition booth is built piece by piece while the
 * visitor scrolls, in the real build order: plot and plan, rigging, raised floor,
 * structure, walls and glass, power and light, brand and media, hosting.
 * GSAP ScrollTrigger owns the scroll; the scene eases toward it for a smooth glide.
 */
export function BoothBuildHero({ content }: BoothBuildHeroProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const finaleRef = useRef<HTMLDivElement | null>(null);
  const chapterRef = useRef(-1);
  const [chapter, setChapter] = useState(-1);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);

  const fa = content.lang === "fa";
  const stages = content.hero.stages.slice(0, CHAPTER_STARTS.length);
  const total = stages.length;
  const number = (n: number) => {
    const text = String(n).padStart(2, "0");
    return fa ? faDigits(text) : text;
  };
  const mobileCtas = fa
    ? { registration: "درخواست غرفه", exhibitions: "نمایشگاه‌ها", forms: "فرم‌ها", continue: "ادامه" }
    : { registration: "Book a booth", exhibitions: "Exhibitions", forms: "Forms", continue: "Continue" };
  const loaderLabel = fa ? "در حال آماده‌سازی سالن نمایشگاه" : "Preparing the exhibition hall";

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    gsap.registerPlugin(ScrollTrigger);

    let scene: BoothScene | null = null;
    let disposed = false;
    let progress = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compact = window.matchMedia("(max-width: 767px), (pointer: coarse) and (max-width: 1100px)").matches;
    // ?booth=high|low pins a rendering tier (for reviews and captures); default is automatic.
    const requested = new URLSearchParams(window.location.search).get("booth");
    const quality: BoothQuality = requested === "high" || requested === "low" ? requested : "auto";

    const paint = (p: number) => {
      for (const bar of barRefs.current) if (bar) bar.style.transform = `scaleX(${Math.max(0.02, p)})`;
      const next = chapterAt(p);
      if (next !== chapterRef.current) {
        chapterRef.current = next;
        setChapter(next);
      }
    };

    const trigger = reduced
      ? null
      : ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            progress = self.progress;
            if (scene) scene.setTarget(progress);
            else paint(progress);
          },
        });
    if (reduced) {
      progress = 1;
      paint(1);
    }

    const supportsWebGL = (() => {
      try {
        const probe = document.createElement("canvas");
        return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
      } catch {
        return false;
      }
    })();

    const fallbackTimer = window.setTimeout(() => setReady(true), 6_000);
    if (!supportsWebGL) {
      requestAnimationFrame(() => {
        setFallback(true);
        setReady(true);
      });
    } else {
      import("@/components/booth3d/booth-scene")
        .then(({ createBoothScene }) =>
          createBoothScene(canvas, {
            lang: content.lang,
            compact,
            quality,
            fontFamily: getComputedStyle(document.body).fontFamily || "sans-serif",
            onFrame: paint,
            // The closing elevation sits between the fixed site header and the closing copy.
            safeBand: () => {
              const frame = canvas.getBoundingClientRect();
              const closing = finaleRef.current?.getBoundingClientRect();
              if (!closing || frame.height < 1) return null;
              const header = document.querySelector("header")?.getBoundingClientRect();
              const shift = finaleRef.current?.classList.contains("is-on") ? 0 : 20;
              const top = header ? (header.bottom - frame.top) / frame.height + 0.025 : 0.1;
              const bottom = (closing.top - shift - frame.top) / frame.height - 0.025;
              return { top: Math.max(0.07, top), bottom };
            },
          }),
        )
        .then((created) => {
          if (disposed) {
            created.dispose();
            return;
          }
          scene = created;
          scene.resize();
          scene.setTarget(progress, true);
          setReady(true);
        })
        .catch(() => {
          setFallback(true);
          setReady(true);
        });
    }

    const visibility = new IntersectionObserver(([entry]) => scene?.setActive(entry.isIntersecting), { rootMargin: "120px" });
    visibility.observe(root);

    const onResize = () => scene?.resize();
    window.addEventListener("resize", onResize);
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const onPointer = (event: PointerEvent) => {
      scene?.setPointer((event.clientX / window.innerWidth - 0.5) * 2, (event.clientY / window.innerHeight - 0.5) * -2);
    };
    if (finePointer) window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      disposed = true;
      window.clearTimeout(fallbackTimer);
      trigger?.kill();
      visibility.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      scene?.dispose();
    };
  }, [content.lang]);

  const inChapter = chapter >= 0 && chapter < total;
  const finale = chapter >= total;

  return (
    <section id="home" ref={rootRef} className="booth3d relative h-[840svh] bg-[#06080a]" aria-label={content.hero.title}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-[#06080a]">
        <canvas ref={canvasRef} className="booth3d__canvas absolute inset-0 h-full w-full" aria-hidden="true" />
        {fallback ? (
          <>
            <Image src="/hero-v6/desktop/stage-06.webp" alt="" fill unoptimized priority sizes="100vw" className="absolute inset-0 hidden object-cover md:block" />
            <Image src="/hero-v6/mobile/stage-06.webp" alt="" fill unoptimized priority sizes="100vw" className="absolute inset-0 object-cover md:hidden" />
          </>
        ) : null}
        <div className={`booth3d__vignette pointer-events-none absolute inset-0 ${finale ? "is-on" : ""}`} aria-hidden="true" />
        <div className="hero-copy-scrim booth3d__scrim pointer-events-none absolute inset-0" aria-hidden="true" />

        {/* Intro: the promise, before anything is built. */}
        <div dir={content.dir} className={`booth3d__intro pointer-events-none absolute inset-x-0 z-10 ${chapter === -1 ? "is-on" : ""}`}>
          <div className="section-shell text-center text-white">
            <p className="font-latin text-[0.68rem] font-black uppercase tracking-[0.42em] text-[var(--gold)]">Aratta Expo · Kerman</p>
            <h1 className="hero-display-title booth3d__title mx-auto mt-5 text-balance">{content.hero.title}</h1>
            <p className="hero-subtitle mx-auto mt-5 text-white/78">{content.hero.subtitle}</p>
            <p className="booth3d__hint mt-9 hidden flex-col md:inline-flex items-center gap-3 text-xs font-bold text-white/62">
              <span>{content.hero.scrollHint}</span>
              <span className="booth3d__hint-line" aria-hidden="true" />
            </p>
          </div>
        </div>

        <div dir={content.dir} className={`booth3d__side-scrim pointer-events-none absolute inset-0 hidden md:block ${inChapter ? "is-on" : ""}`} aria-hidden="true" />
        <div className={`booth3d__low-scrim pointer-events-none absolute inset-0 ${finale ? "is-on" : ""}`} aria-hidden="true" />

        {/* Chapter copy on wide screens: reading-start side, large and calm. */}
        <div dir={content.dir} className="pointer-events-none absolute inset-0 z-10 hidden md:block">
          <div className="booth3d__chapter-wrap section-shell flex h-full items-center">
            <div className={`booth3d__chapter booth3d__stack ${inChapter ? "is-on" : ""}`}>
              {/* Every chapter is laid out in the same cell: the copy cross-fades without a layout shift. */}
              {stages.map((item, index) => (
                <div key={`chapter-${item.label}`} aria-hidden={index !== chapter} className={`hero-stage-copy ${index === chapter ? "is-on" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-[0.72rem] font-black text-[var(--gold)] ${fa ? "" : "font-latin tracking-[0.3em]"}`}>
                      {fa ? (
                        <>
                          {faDigits(String(index + 1))} <span className="text-white/40">از {faDigits(String(total))}</span>
                        </>
                      ) : (
                        <>
                          {number(index + 1)} <span className="text-white/36">/ {number(total)}</span>
                        </>
                      )}
                    </span>
                    <span className="h-px w-10 bg-[var(--gold)]/50" aria-hidden="true" />
                    <span className="text-xs font-bold text-white/66">{item.label}</span>
                  </div>
                  <h2 className="booth3d__chapter-title mt-5 text-balance text-white">{item.title}</h2>
                  <p className={`mt-5 max-w-[30rem] leading-8 text-white/78 ${fa ? "text-[1.06rem]" : "text-[0.98rem]"}`}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step rail on wide screens. */}
        <div dir={content.dir} className={`booth3d__rail absolute inset-x-0 bottom-0 z-10 hidden pb-7 md:block ${chapter === -1 ? "" : "is-on"}`}>
          <div className="section-shell">
            <div className="relative">
              <div className="h-px overflow-hidden bg-white/14">
                <span ref={(el) => void (barRefs.current[0] = el)} className="booth3d__bar block h-full bg-gradient-to-r from-[var(--gold)] to-[#f2d28c]" />
              </div>
              <ol className="mt-3 grid grid-cols-8 gap-2">
                {stages.map((item, index) => (
                  <li key={item.label} className={`booth3d__step text-[0.7rem] font-bold ${index === chapter ? "is-current" : index < chapter || finale ? "is-done" : ""}`}>
                    <span className="font-latin me-1.5">{number(index + 1)}</span>
                    {item.label}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Finale: the call to action once the booth stands complete. */}
        <div ref={finaleRef} dir={content.dir} className={`booth3d__finale absolute inset-x-0 z-20 ${finale ? "is-on" : ""}`}>
          <div className="section-shell text-center text-white">
            <p className={`text-xs font-black text-[var(--gold)] ${fa ? "" : "tracking-[0.2em] uppercase"}`}>{content.hero.finale.kicker}</p>
            <h2 className="booth3d__chapter-title mx-auto mt-4 max-w-[22ch] text-balance">{content.hero.finale.title}</h2>
            <p className="mx-auto mt-4 max-w-[38rem] text-sm leading-7 text-white/74 md:text-base md:leading-8">{content.hero.finale.body}</p>
            <div className="mt-7 hidden flex-wrap justify-center gap-2.5 md:flex">
              <Link tabIndex={finale ? 0 : -1} href={`/${content.lang}/registration`} className="booth3d__cta booth3d__cta--gold">
                <UserRoundPlus size={17} aria-hidden="true" />
                {content.hero.primary}
              </Link>
              <Link tabIndex={finale ? 0 : -1} href={`/${content.lang}/exhibitions`} className="booth3d__cta">
                <Images size={17} aria-hidden="true" />
                {content.hero.secondary}
              </Link>
              <Link tabIndex={finale ? 0 : -1} href={`/${content.lang}/forms`} className="booth3d__cta">
                <FileDown size={17} aria-hidden="true" />
                {mobileCtas.forms}
              </Link>
              <a tabIndex={finale ? 0 : -1} href="#about" className="booth3d__cta">
                {mobileCtas.continue}
                <ArrowDown size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {/* Phone card: chapter copy, progress and the main actions. */}
        <div dir={content.dir} className="booth3d__card-wrap absolute inset-x-3 z-20 md:hidden">
          <div data-mobile-hero-card className="booth3d__card rounded-[1.25rem] px-4 pb-3.5 pt-4 text-white">
            {/* Chapters share one cell, so the card keeps its height; it folds away for the closing copy. */}
            <div className={`booth3d__card-copy ${finale ? "is-folded" : ""}`} aria-hidden={finale}>
              <div className="booth3d__card-inner">
                <div className="booth3d__stack pb-3">
                  <p aria-hidden={chapter !== -1} className={`hero-stage-copy self-center text-center text-[0.875rem] font-bold leading-[1.7] text-white/72 ${chapter === -1 ? "is-on" : ""}`}>
                    {content.hero.scrollHint}
                  </p>
                  {stages.map((item, index) => (
                    <div key={`m-chapter-${item.label}`} aria-hidden={index !== chapter} className={`hero-stage-copy ${index === chapter ? "is-on" : ""}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.75rem] font-black leading-5 text-[var(--gold)]">{item.label}</span>
                        <span className="text-[0.75rem] font-black leading-5 text-white/56">
                          {fa ? `${faDigits(String(index + 1))} از ${faDigits(String(total))}` : `${number(index + 1)}/${number(total)}`}
                        </span>
                      </div>
                      <h2 className={`booth3d__card-title mt-1.5 text-balance font-black ${fa ? "leading-[1.45]" : "leading-[1.25]"}`}>{item.title}</h2>
                      <p className="mt-1.5 text-[0.9375rem] leading-[1.8] text-white/76">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="h-[2px] overflow-hidden rounded-full bg-white/14">
              <span ref={(el) => void (barRefs.current[1] = el)} className="booth3d__bar block h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[#f2d28c]" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/${content.lang}/registration`} className="booth3d__cta booth3d__cta--gold min-h-11 justify-center px-3 text-[0.8125rem]">
                <UserRoundPlus size={15} aria-hidden="true" />
                {mobileCtas.registration}
              </Link>
              {finale ? (
                <Link href={`/${content.lang}/exhibitions`} className="booth3d__cta min-h-11 justify-center px-3 text-[0.8125rem]">
                  <Images size={15} aria-hidden="true" />
                  {mobileCtas.exhibitions}
                </Link>
              ) : (
                <a href="#about" className="booth3d__cta min-h-11 justify-center px-3 text-[0.8125rem]">
                  {mobileCtas.continue}
                  <ArrowDown size={15} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Every chapter in plain text for screen readers and search engines. */}
        <ol className="sr-only">
          {stages.map((item) => (
            <li key={`sr-${item.label}`}>
              {item.title}: {item.body}
            </li>
          ))}
        </ol>

        <div
          data-hero-loader
          role="status"
          aria-live="polite"
          aria-label={loaderLabel}
          className={`hero-loader absolute inset-0 z-30 grid place-items-center bg-[#06080a] ${ready ? "hero-loader--ready pointer-events-none" : ""}`}
        >
          <div className="hero-loader__content text-center text-white">
            <span className="hero-loader__mark mx-auto block w-[5.5rem] rounded-[0.6rem] bg-white p-1.5 sm:w-24">
              <Image src="/brand-v3/aratta-logo-official-tight.png" alt="" width={2008} height={1914} unoptimized priority className="block h-auto w-full" />
            </span>
            <p className="mt-5 text-sm font-bold text-white/72">{loaderLabel}</p>
            <div className="hero-loader__track mx-auto mt-4 h-px w-40 overflow-hidden bg-white/15">
              <span className="hero-loader__bar block h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--gold)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
