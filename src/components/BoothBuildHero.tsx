"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, FileDown, Images, UserRoundPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
import { boothStageFrames } from "@/lib/booth-scenes";

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
      className="relative h-[620svh] bg-black"
      aria-label={content.hero.title}
    >
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-black">
        <div className="absolute inset-0">
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

        <div dir={content.dir} className="pointer-events-none absolute inset-x-0 top-28 z-10 px-4 sm:top-32">
          <div className="section-shell">
            <div className="max-w-[39rem] text-white [text-shadow:0_5px_28px_rgba(0,0,0,0.72)]">
              <p className="font-latin text-[0.68rem] font-black uppercase tracking-[0.3em] text-[var(--cyan)]">
                Aratta Expo / 2026+
              </p>
              <h1 className="mt-4 text-balance text-4xl font-black leading-[1.12] sm:text-5xl lg:text-[4.5rem]">
                {content.hero.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-white/88 sm:text-lg">
                {content.hero.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div dir={content.dir} className="absolute inset-x-0 bottom-0 z-10 px-4 pb-5 sm:pb-8">
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
