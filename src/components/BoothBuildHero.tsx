"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, FileDown, Images, UserRoundPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SiteContent } from "@/data/aratta-content";
import { boothStageFrames, mobileBoothStageFrames } from "@/lib/booth-scenes";

type BoothBuildHeroProps = {
  content: SiteContent;
};

export function BoothBuildHero({ content }: BoothBuildHeroProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [heroReady, setHeroReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const stageFrames = boothStageFrames.map((frame, index) => ({
    ...frame,
    stage:
      content.hero.stages[index] ??
      content.hero.stages[content.hero.stages.length - 1],
  }));
  const mobileStageFrames = mobileBoothStageFrames.map((frame, index) => ({
    ...frame,
    stage:
      content.hero.stages[index] ??
      content.hero.stages[content.hero.stages.length - 1],
  }));
  const mobileCtas =
    content.lang === "fa"
      ? {
          registration: "درخواست غرفه",
          exhibitions: "نمایشگاه‌ها",
          forms: "فرم‌ها",
          continue: "ادامه",
        }
      : {
          registration: "Register",
          exhibitions: "Exhibits",
          forms: "Forms",
          continue: "More",
        };

  const getFrameState = (count: number) => {
    const local = Math.min(count - 0.0001, Math.max(0, progress * count));
    const current = Math.min(count - 1, Math.floor(local));
    const next = Math.min(count - 1, current + 1);
    const segment = local - current;
    const fadeWindow = 0.2;
    const fadeStart = 1 - fadeWindow;
    const rawFade =
      current === count - 1
        ? 0
        : Math.max(0, Math.min(1, (segment - fadeStart) / fadeWindow));
    const fade = rawFade * rawFade * (3 - 2 * rawFade);
    const active = fade >= 0.5 ? next : current;

    return { local, current, next, fade, active };
  };

  const activeIndex = getFrameState(stageFrames.length).active;

  const activeStage = stageFrames[activeIndex]?.stage ?? stageFrames[0].stage;
  const introOpacity = reducedMotion
    ? 1
    : Math.max(0, Math.min(1, (0.18 - progress) / 0.07));
  const introStyle = {
    opacity: heroReady ? introOpacity : 0,
    transform: `translate3d(0, ${(1 - introOpacity) * -16}px, 0)`,
  };
  const getLayerStyle = (index: number, count: number) => {
    const { current, next, fade } = getFrameState(count);
    const opacity = index === current ? 1 - fade : index === next ? fade : 0;

    return {
      opacity,
      zIndex: index === next && fade > 0 ? 2 : index === current ? 1 : 0,
      transition: "opacity 360ms ease-out",
    };
  };

  useEffect(() => {
    const readyFallback = window.setTimeout(() => setHeroReady(true), 4_000);
    return () => window.clearTimeout(readyFallback);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const frame = requestAnimationFrame(() => setReducedMotion(false));
      const trigger = ScrollTrigger.create({
        trigger: rootRef.current,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => setProgress(self.progress),
        onRefresh: (self) => setProgress(self.progress),
      });
      return () => {
        cancelAnimationFrame(frame);
        trigger.kill();
      };
    });
    media.add("(prefers-reduced-motion: reduce)", () => {
      const frame = requestAnimationFrame(() => {
        setReducedMotion(true);
        setProgress(1);
      });
      return () => cancelAnimationFrame(frame);
    });
    return () => media.revert();
  }, []);

  return (
    <section
      id="home"
      ref={rootRef}
      className="relative h-[720svh] bg-black md:h-[620svh]"
      aria-label={content.hero.title}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-black">
        <div className="absolute inset-0 hidden md:block">
          {stageFrames.map((frame, index) => {
            return (
              <Image
                key={frame.key}
                src={frame.src}
                alt=""
                fill
                unoptimized
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                sizes="(min-width: 768px) 100vw, 1px"
                className="absolute inset-0 object-cover object-center"
                style={getLayerStyle(index, stageFrames.length)}
                onLoad={index === 0 ? () => setHeroReady(true) : undefined}
                onError={index === 0 ? () => setHeroReady(true) : undefined}
              />
            );
          })}
        </div>

        <div className="absolute inset-0 md:hidden">
          {mobileStageFrames.map((frame, index) => {
            return (
              <Image
                key={frame.key}
                src={frame.src}
                alt=""
                fill
                unoptimized
                loading={index < 2 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                sizes="(max-width: 767px) 100vw, 1px"
                className="absolute inset-0 object-cover object-center"
                style={getLayerStyle(index, mobileStageFrames.length)}
                onLoad={index === 0 ? () => setHeroReady(true) : undefined}
                onError={index === 0 ? () => setHeroReady(true) : undefined}
              />
            );
          })}
        </div>

        <div
          className="hero-copy-scrim pointer-events-none absolute inset-0"
          aria-hidden="true"
        />

        <div
          dir={content.dir}
          className="hero-intro-layer pointer-events-none absolute inset-x-0 z-10"
          style={introStyle}
        >
          <div className="section-shell">
            <div className="hero-copy-cluster text-white [text-shadow:0_5px_28px_rgba(0,0,0,0.78)]">
              <p className="text-start">
                <span className="font-latin inline-block text-[0.68rem] font-black uppercase tracking-[0.3em] text-[var(--cyan)]">
                  Aratta Expo / 2026+
                </span>
              </p>
              <h1 className="hero-display-title mt-4 text-balance text-white">
                {content.hero.title}
              </h1>
              <p className="hero-subtitle mt-5 font-semibold text-white/88">
                {content.hero.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div
          data-hero-loader
          role="status"
          aria-live="polite"
          aria-label={
            content.lang === "fa"
              ? "در حال آماده‌سازی تجربه نمایشگاهی"
              : "Preparing the exhibition experience"
          }
          className={[
            "hero-loader absolute inset-0 z-30 grid place-items-center bg-black",
            heroReady ? "hero-loader--ready pointer-events-none" : "",
          ].join(" ")}
        >
          <div className="hero-loader__content text-center text-white">
            <Image
              src="/brand-v2/aratta-official-mark.png"
              alt=""
              width={703}
              height={703}
              unoptimized
              priority
              className="hero-loader__mark mx-auto h-auto w-20 sm:w-24"
            />
            <p className="mt-5 text-sm font-bold text-white/72">
              {content.lang === "fa"
                ? "در حال آماده‌سازی تجربه نمایشگاهی"
                : "Preparing the exhibition experience"}
            </p>
            <div className="hero-loader__track mx-auto mt-4 h-px w-40 overflow-hidden bg-white/15">
              <span className="hero-loader__bar block h-full bg-gradient-to-r from-[var(--cyan)] to-[var(--gold)]" />
            </div>
          </div>
        </div>

        <div className="absolute end-4 top-1/2 z-10 grid -translate-y-1/2 gap-2 md:hidden">
          {mobileStageFrames.map((frame, index) => (
            <span
              key={frame.key}
              className={[
                "h-2 w-2 rounded-full border transition",
                index === activeIndex
                  ? "scale-125 border-amber-200 bg-[var(--gold)] shadow-[0_0_18px_rgba(216,180,106,0.72)]"
                  : "border-white/30 bg-white/18",
              ].join(" ")}
              aria-hidden="true"
            />
          ))}
        </div>

        <div
          dir={content.dir}
          className="absolute inset-x-3 bottom-[calc(0.55rem+env(safe-area-inset-bottom))] z-10 md:hidden"
        >
          <div
            data-mobile-hero-card
            className="rounded-[1.15rem] border border-white/14 bg-black/48 p-2.5 text-white shadow-2xl shadow-black/36 backdrop-blur-lg"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-latin rounded-full border border-cyan-200/22 bg-cyan-200/8 px-2 py-0.5 text-[0.5rem] font-black uppercase tracking-[0.16em] text-[var(--cyan)]">
                {activeStage.label}
              </span>
              <span className="font-latin text-[0.64rem] font-black text-white/64">
                {activeIndex + 1}/{mobileStageFrames.length}
              </span>
            </div>
            <div
              key={`mobile-stage-copy-${activeIndex}`}
              className="hero-stage-copy"
            >
              <h2 className="mt-1.5 text-balance text-[clamp(0.92rem,4.55vw,1.08rem)] font-black leading-[1.35] text-white">
                {activeStage.title}
              </h2>
              <p className="mt-0.5 overflow-hidden text-[0.62rem] font-bold leading-[1.65] text-white/66 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:1]">
                {activeStage.body}
              </p>
            </div>
            <div className="mt-1.5 h-[2px] overflow-hidden rounded-full bg-white/16">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--gold)]"
                style={{ width: `${Math.max(5, progress * 100)}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Link
                href={`/${content.lang}/registration`}
                className="inline-flex min-h-11 items-center justify-center rounded-[0.72rem] border border-amber-200/30 bg-amber-200/16 px-2 text-[0.66rem] font-black leading-4 text-white"
              >
                <UserRoundPlus className="me-1" size={12} />
                {mobileCtas.registration}
              </Link>
              <Link
                href={`/${content.lang}/exhibitions`}
                className="inline-flex min-h-11 items-center justify-center rounded-[0.72rem] border border-white/13 bg-white/7 px-2 text-[0.66rem] font-black leading-4 text-white"
              >
                <Images className="me-1" size={12} />
                {mobileCtas.exhibitions}
              </Link>
              <Link
                href={`/${content.lang}/forms`}
                className="inline-flex min-h-11 items-center justify-center rounded-[0.72rem] border border-white/13 bg-white/7 px-2 text-[0.66rem] font-black leading-4 text-white"
              >
                <FileDown className="me-1" size={12} />
                {mobileCtas.forms}
              </Link>
              <Link
                href="#about"
                className="inline-flex min-h-11 items-center justify-center rounded-[0.72rem] border border-cyan-200/28 bg-cyan-200/11 px-2 text-[0.66rem] font-black leading-4 text-white"
              >
                {mobileCtas.continue}
                <ArrowDown className="ms-1" size={12} />
              </Link>
            </div>
          </div>
        </div>

        <div
          dir={content.dir}
          className="absolute inset-x-0 bottom-0 z-10 hidden px-4 pb-5 sm:pb-8 md:block"
        >
          <div className="section-shell">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-[42rem] rounded-[1rem] border border-white/14 bg-black/22 p-3 text-white shadow-2xl shadow-black/30 backdrop-blur-sm sm:p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-latin text-[0.7rem] font-black uppercase tracking-[0.24em] text-[var(--cyan)]">
                    {activeStage.label}
                  </span>
                  <span className="font-latin text-sm font-black text-white/72">
                    {activeIndex + 1}/{stageFrames.length}
                  </span>
                </div>
                <div
                  key={`desktop-stage-copy-${activeIndex}`}
                  className="hero-stage-copy"
                >
                  <h2 className="mt-2 text-xl font-black leading-7 sm:text-2xl">
                    {activeStage.title}
                  </h2>
                  <p className="mt-1 text-xs leading-6 text-white/74 sm:text-sm">
                    {activeStage.body}
                  </p>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/18">
                  <div
                    className="h-full rounded-full bg-[var(--gold)]"
                    style={{ width: `${Math.max(4, progress * 100)}%` }}
                  />
                </div>
              </div>

              <div className="pointer-events-auto flex flex-wrap gap-2 lg:justify-end">
                <Link
                  href={`/${content.lang}/registration`}
                  className="rounded-full border border-white/18 bg-black/38 px-4 py-3 text-sm font-black text-white shadow-xl shadow-black/25 backdrop-blur-md transition hover:bg-white/12"
                >
                  <UserRoundPlus className="me-2 inline-block" size={17} />
                  {content.hero.primary}
                </Link>
                <Link
                  href={`/${content.lang}/exhibitions`}
                  className="rounded-full border border-white/18 bg-black/38 px-4 py-3 text-sm font-black text-white shadow-xl shadow-black/25 backdrop-blur-md transition hover:bg-white/12"
                >
                  <Images className="me-2 inline-block" size={17} />
                  {content.hero.secondary}
                </Link>
                <Link
                  href={`/${content.lang}/forms`}
                  className="rounded-full border border-white/18 bg-black/38 px-4 py-3 text-sm font-black text-white shadow-xl shadow-black/25 backdrop-blur-md transition hover:bg-white/12"
                >
                  <FileDown className="me-2 inline-block" size={17} />
                  {content.lang === "fa" ? "فرم ها" : "Forms"}
                </Link>
                <Link
                  href="#about"
                  className="rounded-full border border-amber-200/45 bg-amber-200/18 px-4 py-3 text-sm font-black text-white shadow-xl shadow-black/25 backdrop-blur-md transition hover:bg-amber-200/26"
                >
                  {content.lang === "fa" ? "ادامه" : "Continue"}
                  <ArrowDown className="ms-2 inline-block" size={17} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
