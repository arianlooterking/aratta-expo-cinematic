"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, FileDown, Images, UserRoundPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SiteContent } from "@/data/aratta-content";
import type { BoothScene } from "@/components/booth3d/booth-scene";
import { CHAPTER_STARTS, chapterAt } from "@/components/booth3d/timeline";

type BoothBuildHeroProps = {
  content: SiteContent;
};

const faDigits = (value: string) => value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/**
 * Landing hero: a real 3D exhibition booth is built piece by piece while the
 * visitor scrolls (hall → plan → floor → structure → walls → identity → furniture).
 * GSAP ScrollTrigger owns the scroll; the scene eases toward it for a smooth glide.
 */
export function BoothBuildHero({ content }: BoothBuildHeroProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
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
            fontFamily: getComputedStyle(document.body).fontFamily || "sans-serif",
            onFrame: paint,
          }),
        )
        .then((created) => {
          if (disposed) {
            created.dispose();
            return;
          }
          scene = created;
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
  const stage = inChapter ? stages[chapter] : null;

  return (
    <section id="home" ref={rootRef} className="booth3d relative h-[720svh] bg-[#06080a]" aria-label={content.hero.title}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-[#06080a]">
        <canvas ref={canvasRef} className="booth3d__canvas absolute inset-0 h-full w-full" aria-hidden="true" />
        {fallback ? (
          <>
            <Image src="/hero-v6/desktop/stage-06.webp" alt="" fill unoptimized priority sizes="100vw" className="absolute inset-0 hidden object-cover md:block" />
            <Image src="/hero-v6/mobile/stage-06.webp" alt="" fill unoptimized priority sizes="100vw" className="absolute inset-0 object-cover md:hidden" />
          </>
        ) : null}
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
            <div className={`booth3d__chapter ${inChapter ? "is-on" : ""}`}>
              {stage ? (
                <div key={`chapter-${chapter}`} className="hero-stage-copy">
                  <div className="flex items-center gap-3">
                    <span className={`text-[0.72rem] font-black text-[var(--gold)] ${fa ? "" : "font-latin tracking-[0.3em]"}`}>
                      {fa ? (
                        <>
                          {faDigits(String(chapter + 1))} <span className="text-white/40">از {faDigits(String(total))}</span>
                        </>
                      ) : (
                        <>
                          {number(chapter + 1)} <span className="text-white/36">/ {number(total)}</span>
                        </>
                      )}
                    </span>
                    <span className="h-px w-10 bg-[var(--gold)]/50" aria-hidden="true" />
                    <span className="text-xs font-bold text-white/66">{stage.label}</span>
                  </div>
                  <h2 className="booth3d__chapter-title mt-5 text-balance text-white">{stage.title}</h2>
                  <p className={`mt-5 max-w-[30rem] leading-8 text-white/78 ${fa ? "text-[1.06rem]" : "text-[0.98rem]"}`}>{stage.body}</p>
                </div>
              ) : null}
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
              <ol className="mt-3 grid grid-cols-7 gap-2">
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
        <div dir={content.dir} className={`booth3d__finale absolute inset-x-0 z-20 ${finale ? "is-on" : ""}`}>
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
        <div dir={content.dir} className="absolute inset-x-3 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-20 md:hidden">
          <div data-mobile-hero-card className="booth3d__card rounded-[1.25rem] p-3.5 text-white">
            {stage ? (
              <div key={`m-chapter-${chapter}`} className="hero-stage-copy">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.66rem] font-black text-[var(--gold)]">{stage.label}</span>
                  <span className="text-[0.66rem] font-black text-white/56">
                    {fa ? `${faDigits(String(chapter + 1))} از ${faDigits(String(total))}` : `${number(chapter + 1)}/${number(total)}`}
                  </span>
                </div>
                <h2 className="mt-1.5 text-balance text-[clamp(1rem,4.8vw,1.18rem)] font-black leading-[1.4]">{stage.title}</h2>
                <p className="mt-1 text-[0.74rem] leading-[1.75] text-white/70 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">{stage.body}</p>
              </div>
            ) : finale ? null : (
              <p className="text-center text-[0.74rem] font-bold text-white/70">{content.hero.scrollHint}</p>
            )}
            <div className={`h-[2px] overflow-hidden rounded-full bg-white/14 ${finale ? "" : "mt-2.5"}`}>
              <span ref={(el) => void (barRefs.current[1] = el)} className="booth3d__bar block h-full rounded-full bg-gradient-to-r from-[var(--gold)] to-[#f2d28c]" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/${content.lang}/registration`} className="booth3d__cta booth3d__cta--gold min-h-11 justify-center text-[0.74rem]">
                <UserRoundPlus size={14} aria-hidden="true" />
                {mobileCtas.registration}
              </Link>
              {finale ? (
                <Link href={`/${content.lang}/exhibitions`} className="booth3d__cta min-h-11 justify-center text-[0.74rem]">
                  <Images size={14} aria-hidden="true" />
                  {mobileCtas.exhibitions}
                </Link>
              ) : (
                <a href="#about" className="booth3d__cta min-h-11 justify-center text-[0.74rem]">
                  {mobileCtas.continue}
                  <ArrowDown size={14} aria-hidden="true" />
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
            <Image src="/brand-v2/aratta-official-mark.png" alt="" width={703} height={703} unoptimized priority className="hero-loader__mark mx-auto h-auto w-16 sm:w-20" />
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
