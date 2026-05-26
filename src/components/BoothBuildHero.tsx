"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  FileDown,
  Images,
  UserRoundPlus,
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
import { boothStageFrames } from "@/lib/booth-scenes";
import { cn } from "@/lib/cn";

type BoothBuildHeroProps = {
  content: SiteContent;
};

export function BoothBuildHero({ content }: BoothBuildHeroProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const Arrow = content.dir === "rtl" ? ArrowLeft : ArrowRight;

  const activeIndex = useMemo(() => {
    return Math.min(
      content.hero.stages.length - 1,
      Math.floor(progress * content.hero.stages.length),
    );
  }, [content.hero.stages.length, progress]);

  const activeStage = content.hero.stages[activeIndex] ?? content.hero.stages[0];
  const trackShift = content.dir === "rtl" ? progress * 14 : progress * -14;
  const stageFrames = boothStageFrames.map((frame, index) => ({
    ...frame,
    stage: content.hero.stages[index] ?? content.hero.stages[content.hero.stages.length - 1],
  }));

  useEffect(() => {
    let frame = 0;

    const update = () => {
      if (!rootRef.current) return;
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const top = rootRef.current?.offsetTop ?? 0;
        const height = rootRef.current?.offsetHeight ?? window.innerHeight;
        const raw = (window.scrollY - top) / Math.max(1, height * 0.86);
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
      className="relative isolate min-h-[100svh] overflow-hidden pb-7 pt-[6.25rem]"
      aria-label={content.hero.title}
    >
      <div className="absolute inset-0 -z-10 overflow-hidden bg-black">
        <div
          className="process-row-track absolute inset-y-0 left-0 flex h-full min-w-max"
          style={{ transform: `translate3d(${trackShift}vw, 0, 0)` }}
          aria-hidden="true"
        >
          <div className="process-row-inner flex h-full min-w-max">
            {[...stageFrames, ...stageFrames].map((frame, index) => (
              <div
                key={`${frame.key}-${index}`}
                className="relative h-full w-[88vw] min-w-[88vw] overflow-hidden bg-black/40 sm:w-[72vw] sm:min-w-[72vw] lg:w-[58vw] lg:min-w-[58vw] xl:w-[49vw] xl:min-w-[49vw]"
              >
                <Image
                  src={frame.src}
                  alt=""
                  fill
                  priority={index < 2}
                  sizes="(min-width: 1280px) 46vw, (min-width: 1024px) 54vw, (min-width: 640px) 68vw, 82vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.44))]" />
                <div className="absolute bottom-5 start-5 max-w-[20rem] rounded-2xl border border-white/14 bg-black/34 p-4 text-white shadow-xl shadow-black/35 backdrop-blur-xl">
                  <div className="font-latin text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--gold)]">
                    {frame.stage.label}
                  </div>
                  <div className="mt-1 text-base font-black">{frame.stage.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,5,8,0.86)_0%,rgba(2,5,8,0.64)_30%,rgba(2,5,8,0.18)_62%,rgba(2,5,8,0.58)_100%)] rtl:bg-[linear-gradient(270deg,rgba(2,5,8,0.86)_0%,rgba(2,5,8,0.64)_30%,rgba(2,5,8,0.18)_62%,rgba(2,5,8,0.58)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(125,220,232,0.11),transparent_30rem),radial-gradient(circle_at_78%_18%,rgba(214,174,101,0.14),transparent_31rem),linear-gradient(180deg,rgba(2,5,8,0.04)_0%,rgba(2,5,8,0.16)_45%,#040608_100%)]" />
      </div>

      <div className="section-shell relative z-10 flex min-h-[calc(100svh-7rem)] flex-col justify-between gap-6">
        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.78fr_1fr]">
          <div dir={content.dir} className="max-w-[43rem]">
            <p className="font-latin inline-flex items-center gap-3 text-[0.68rem] font-black uppercase tracking-[0.28em] text-[var(--cyan)]">
              <span className="h-px w-14 bg-[var(--cyan)]" />
              Aratta Expo / 2026+
            </p>
            <h1 className="mt-5 text-balance text-4xl font-black leading-[1.12] text-white drop-shadow-2xl sm:text-5xl lg:text-[4.35rem]">
              {content.hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/82 sm:text-lg">
              {content.hero.subtitle}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/${content.lang}/registration`}
                className="liquid-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-white"
              >
                <UserRoundPlus size={18} />
                {content.hero.primary}
              </Link>
              <Link
                href={`/${content.lang}/exhibitions`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/16 bg-white/[0.07] px-5 py-3 text-sm font-black text-white backdrop-blur-xl transition hover:border-cyan-200/35"
              >
                <Images size={18} />
                {content.hero.secondary}
              </Link>
              <Link
                href={`/${content.lang}/forms`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/16 bg-black/24 px-5 py-3 text-sm font-black text-white/82 backdrop-blur-xl transition hover:text-white"
              >
                <FileDown size={18} />
                {content.lang === "fa" ? "فرم های رسمی" : "Official forms"}
              </Link>
            </div>

          </div>

          <div className="hidden justify-end lg:flex">
            <div className="process-bubble glass max-w-[20rem] rounded-[1.6rem] p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="font-latin text-[0.7rem] font-black uppercase tracking-[0.26em] text-[var(--cyan)]">
                  {activeStage.label}
                </span>
                <span className="font-latin rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-black text-white/76">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <h2 className="mt-3 text-2xl font-black leading-8 text-white">{activeStage.title}</h2>
              <p className="mt-2 text-xs leading-6 text-white/66">{activeStage.body}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--gold)]"
                  style={{ width: `${Math.max(8, progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div dir={content.dir} className="pb-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="section-kicker">
                {content.lang === "fa" ? "فرایند ساخت غرفه" : "Booth Build Process"}
              </div>
              <p className="mt-2 text-sm text-white/58">
                {content.lang === "fa"
                  ? "تصاویر فرایند در پس زمینه حرکت می کنند؛ برای ادامه، پایین بروید."
                  : "The process frames move in the background; scroll down to explore the site."}
              </p>
            </div>
            <a
              href="#about"
              className="hidden items-center gap-2 rounded-full border border-white/14 bg-white/[0.07] px-4 py-2 text-sm font-black text-white/82 backdrop-blur-xl transition hover:text-white sm:inline-flex"
            >
              {content.lang === "fa" ? "ادامه سایت" : "Explore site"}
              <ArrowDown size={16} />
            </a>
          </div>

          <div className="process-bubble-row flex gap-3 overflow-x-auto pb-2">
            {stageFrames.map((frame, index) => (
              <div
                key={frame.key}
                className={cn(
                  "process-bubble min-w-[15.5rem] rounded-[1.35rem] border p-4 shadow-2xl backdrop-blur-2xl transition",
                  index === activeIndex
                    ? "border-cyan-200/42 bg-cyan-200/[0.11] shadow-cyan-950/30"
                    : "border-white/14 bg-black/34 shadow-black/28",
                )}
                style={{ animationDelay: `${index * 180}ms` } as CSSProperties}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-latin text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--cyan)]">
                    {frame.stage.label}
                  </span>
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-amber-200/32 bg-amber-200/10 text-xs font-black text-[var(--gold)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-3 line-clamp-1 text-base font-black text-white">{frame.stage.title}</h3>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/62">{frame.stage.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-black/24 px-4 py-2 text-xs text-white/55 backdrop-blur-xl">
            <span>{activeStage.label}: {activeStage.title}</span>
            <Link href="#about" className="inline-flex items-center gap-2 font-black text-[var(--gold)]">
              {content.lang === "fa" ? "کاوش سایت" : "Explore"}
              <Arrow size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
