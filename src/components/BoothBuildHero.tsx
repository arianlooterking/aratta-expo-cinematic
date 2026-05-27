"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, FileDown, Images, UserRoundPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
import { boothStageFrames, mobileBoothStageFrames } from "@/lib/booth-scenes";

type BoothBuildHeroProps = {
  content: SiteContent;
};

export function BoothBuildHero({ content }: BoothBuildHeroProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  const stageFrames = boothStageFrames.map((frame, index) => ({
    ...frame,
    stage: content.hero.stages[index] ?? content.hero.stages[content.hero.stages.length - 1],
  }));
  const mobileStageFrames = mobileBoothStageFrames.map((frame, index) => ({
    ...frame,
    stage: content.hero.stages[index] ?? content.hero.stages[content.hero.stages.length - 1],
  }));

  const activeIndex = useMemo(() => {
    return Math.min(stageFrames.length - 1, Math.floor(progress * stageFrames.length));
  }, [progress, stageFrames.length]);

  const activeStage = stageFrames[activeIndex]?.stage ?? stageFrames[0].stage;

  useEffect(() => {
    let frame = 0;

    const update = () => {
      if (!rootRef.current) return;
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = rootRef.current?.getBoundingClientRect();
        const sectionTop = window.scrollY + (rect?.top ?? 0);
        const sectionHeight = rootRef.current?.offsetHeight ?? window.innerHeight;
        const scrollable = Math.max(1, sectionHeight - window.innerHeight);
        const raw = (window.scrollY - sectionTop) / scrollable;
        setProgress(Math.max(0, Math.min(1, raw)));
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section
      id="home"
      ref={rootRef}
      className="relative h-[560svh] bg-black md:h-[620svh]"
      aria-label={content.hero.title}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-black">
        <div className="absolute inset-0 hidden md:block">
          {stageFrames.map((frame, index) => {
            const local = progress * (stageFrames.length - 1);
            const distance = Math.abs(local - index);
            const opacity = Math.max(0, 1 - distance);
            const scale = 1.035 - Math.min(0.035, distance * 0.018);

            return (
              <Image
                key={frame.key}
                src={frame.src}
                alt=""
                fill
                priority={index < 2}
                sizes="100vw"
                className="absolute inset-0 object-cover object-center"
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  transition: "opacity 120ms linear, transform 120ms linear",
                }}
              />
            );
          })}
        </div>

        <div className="absolute inset-0 md:hidden">
          {mobileStageFrames.map((frame, index) => {
            const local = progress * (mobileStageFrames.length - 1);
            const distance = Math.abs(local - index);
            const opacity = Math.max(0, 1 - distance);
            const scale = 1.025 - Math.min(0.025, distance * 0.014);

            return (
              <Image
                key={frame.key}
                src={frame.src}
                alt=""
                fill
                priority={index < 2}
                sizes="100vw"
                className="absolute inset-0 object-cover object-center"
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  transition: "opacity 120ms linear, transform 120ms linear",
                }}
              />
            );
          })}
        </div>

        <div className="hero-copy-scrim absolute inset-0" />

        <div
          dir={content.dir}
          className="pointer-events-none absolute inset-x-0 top-[clamp(7.4rem,15svh,10.25rem)] z-10 hidden md:block"
        >
          <div className="section-shell">
            <div className="hero-copy-cluster text-white [text-shadow:0_5px_28px_rgba(0,0,0,0.78)]">
              <p className="text-start">
                <span className="font-latin inline-block text-[0.68rem] font-black uppercase tracking-[0.3em] text-[var(--cyan)]">
                  Aratta Expo / 2026+
                </span>
              </p>
              <h1 className="hero-display-title mt-4 text-balance font-black text-white">
                {content.hero.title}
              </h1>
              <p className="hero-subtitle mt-5 font-semibold text-white/88">
                {content.hero.subtitle}
              </p>
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

        <div dir={content.dir} className="absolute inset-x-3 bottom-3 z-10 md:hidden">
          <div className="rounded-[1.45rem] border border-white/16 bg-black/48 p-3 text-white shadow-2xl shadow-black/45 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <span className="font-latin rounded-full border border-cyan-200/22 bg-cyan-200/8 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.22em] text-[var(--cyan)]">
                {activeStage.label}
              </span>
              <span className="font-latin text-xs font-black text-white/66">
                {activeIndex + 1}/{mobileStageFrames.length}
              </span>
            </div>
            <h2 className="mt-3 text-balance text-2xl font-black leading-tight text-white">
              {activeStage.title}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/78">
              {activeStage.body}
            </p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/18">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--gold)]"
                style={{ width: `${Math.max(5, progress * 100)}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={`/${content.lang}/registration`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-amber-200/32 bg-amber-200/18 px-3 text-xs font-black text-white"
              >
                <UserRoundPlus className="me-2" size={16} />
                {content.hero.primary}
              </Link>
              <Link
                href={`/${content.lang}/exhibitions`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/14 bg-white/8 px-3 text-xs font-black text-white"
              >
                <Images className="me-2" size={16} />
                {content.hero.secondary}
              </Link>
              <Link
                href={`/${content.lang}/forms`}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/14 bg-white/8 px-3 text-xs font-black text-white"
              >
                <FileDown className="me-2" size={16} />
                {content.lang === "fa" ? "فرم ها" : "Forms"}
              </Link>
              <Link
                href="#about"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-cyan-200/28 bg-cyan-200/12 px-3 text-xs font-black text-white"
              >
                {content.lang === "fa" ? "ادامه" : "Continue"}
                <ArrowDown className="ms-2" size={16} />
              </Link>
            </div>
          </div>
        </div>

        <div dir={content.dir} className="absolute inset-x-0 bottom-0 z-10 hidden px-4 pb-5 sm:pb-8 md:block">
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
                <h2 className="mt-2 text-xl font-black leading-7 sm:text-2xl">{activeStage.title}</h2>
                <p className="mt-1 text-xs leading-6 text-white/74 sm:text-sm">{activeStage.body}</p>
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
