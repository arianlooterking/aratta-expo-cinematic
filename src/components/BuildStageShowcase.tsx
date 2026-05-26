"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ArrowDown, BadgeCheck, Check, CircuitBoard, DraftingCompass, Lightbulb, ScanLine } from "lucide-react";
import type { SiteContent } from "@/data/aratta-content";
import { boothStageFrames } from "@/lib/booth-scenes";

type BuildStageShowcaseProps = {
  content: SiteContent;
};

const stageIcons = [DraftingCompass, CircuitBoard, Lightbulb, ScanLine, BadgeCheck, Check];

export function BuildStageShowcase({ content }: BuildStageShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const stages = content.hero.stages;
  const activeStage = stages[activeIndex];
  const progressPercent = Math.round(
    (activeIndex / Math.max(stages.length - 1, 1)) * 100,
  );
  const activeFrameIndex = Math.min(boothStageFrames.length - 1, activeIndex);
  const stageLabel = useMemo(() => `${activeIndex + 1}/${stages.length}`, [activeIndex, stages.length]);

  return (
    <section
      id="build-stage"
      className="relative isolate overflow-hidden py-16 sm:py-20"
      aria-labelledby="build-stage-title"
    >
      <div className="section-shell">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <div className="section-kicker">
              {content.lang === "fa" ? "طراحی تجربه غرفه" : "Booth Experience System"}
            </div>
            <h2 id="build-stage-title" className="mt-4 max-w-2xl text-3xl font-black text-white sm:text-5xl">
              {content.lang === "fa"
                ? "از سالن خام تا غرفه آماده مذاکره"
                : "From clean hall to negotiation-ready booth"}
            </h2>
          </div>
          <p className="max-w-3xl text-base leading-8 text-white/64 lg:justify-self-end">
            {content.lang === "fa"
              ? "روایت غرفه به صورت مرحله ای نمایش داده می شود: از سالن خام و نقشه فنی تا هویت اَرَت و تجربه آماده مذاکره."
              : "The booth story is presented in clear stages: from an empty hall and technical plan to Aratta identity and a negotiation-ready experience."}
          </p>
        </div>

        <div className="stage-canvas glass relative mx-auto min-h-[620px] max-w-6xl overflow-hidden rounded-[2rem] p-4 sm:min-h-[720px] sm:rounded-[2.5rem] sm:p-6">
          <div className="absolute inset-0 -z-10">
            {boothStageFrames.map((frame, index) => (
              <Image
                key={frame.key}
                src={frame.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 1120px, 100vw"
                priority={index === 0}
                className={`stage-frame object-cover object-center transition-opacity duration-700 ${
                  index === activeFrameIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,12,0.34),rgba(4,8,12,0.52)_38%,rgba(2,4,7,0.88))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,transparent_0%,rgba(0,0,0,0.5)_72%)]" />
          </div>

          <div className={`stage-final-light pointer-events-none absolute inset-0 transition-opacity duration-700 ${activeIndex >= stages.length - 1 ? "opacity-100" : "opacity-0"}`}>
            <div className="absolute inset-x-[8%] top-[8%] h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />
            <div className="absolute inset-x-[18%] top-[14%] h-40 bg-[radial-gradient(ellipse_at_center,rgba(216,180,106,0.34),transparent_68%)] blur-3xl" />
            <div className="absolute bottom-[26%] right-[12%] h-36 w-36 rounded-full bg-cyan-300/12 blur-3xl rtl:left-[12%] rtl:right-auto" />
          </div>

          <div className="stage-grid pointer-events-none absolute inset-x-4 top-6 h-[58%] rounded-[2rem] border border-cyan-200/9 bg-[linear-gradient(rgba(62,231,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(62,231,255,0.13)_1px,transparent_1px)] bg-[length:34px_34px] opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent)] sm:inset-x-8" />

          <div className="relative min-h-[390px] sm:min-h-[470px]" aria-hidden="true">
            <div className={`blueprint-outline absolute inset-x-[6%] top-[16%] h-[16rem] rounded-[2.2rem] border border-cyan-200/23 bg-cyan-200/[0.018] transition-opacity duration-500 sm:inset-x-[12%] sm:h-[17rem] ${activeIndex >= 1 ? "opacity-100" : "opacity-55"}`} />
            <div className={`blueprint-outline absolute left-[14%] top-[30%] h-[10.8rem] w-[44%] rounded-[1.8rem] border border-cyan-200/44 bg-cyan-200/[0.018] transition-opacity duration-500 rtl:left-auto rtl:right-[14%] ${activeIndex >= 1 ? "opacity-100" : "opacity-0"}`} />
            <div className={`blueprint-outline absolute right-[15%] top-[22%] h-[13.7rem] w-[30%] rounded-[2rem] border border-cyan-200/27 bg-cyan-200/[0.014] transition-opacity duration-500 rtl:left-[15%] rtl:right-auto ${activeIndex >= 1 ? "opacity-100" : "opacity-0"}`} />
            <div className={`blueprint-outline absolute left-[22%] top-[46%] h-px w-[55%] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent transition-opacity duration-500 rtl:left-auto rtl:right-[22%] ${activeIndex >= 1 ? "opacity-100" : "opacity-0"}`} />
            <div className={`blueprint-outline absolute left-[8%] top-[58%] h-px w-[72%] bg-cyan-200/25 transition-opacity duration-500 rtl:left-auto rtl:right-[8%] ${activeIndex >= 1 ? "opacity-100" : "opacity-0"}`} />

            <div className={`stage-column absolute bottom-[12%] left-[19%] h-[11.5rem] w-2 rounded-full bg-gradient-to-t from-cyan-200/14 to-cyan-200/64 shadow-[0_0_28px_rgba(62,231,255,0.28)] transition-opacity duration-500 rtl:left-auto rtl:right-[19%] ${activeIndex >= 3 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-column absolute bottom-[12%] left-[42%] h-[13.4rem] w-2 rounded-full bg-gradient-to-t from-cyan-200/14 to-cyan-200/56 transition-opacity duration-500 rtl:left-auto rtl:right-[42%] ${activeIndex >= 3 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-column absolute bottom-[12%] right-[27%] h-[12.4rem] w-2 rounded-full bg-gradient-to-t from-amber-200/14 to-amber-200/58 transition-opacity duration-500 rtl:left-[27%] rtl:right-auto ${activeIndex >= 3 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-column absolute bottom-[12%] right-[13%] h-[10.2rem] w-2 rounded-full bg-gradient-to-t from-amber-200/14 to-amber-200/48 transition-opacity duration-500 rtl:left-[13%] rtl:right-auto ${activeIndex >= 3 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-roof absolute left-[17%] top-[22%] h-5 w-[66%] rounded-full border border-amber-200/26 bg-gradient-to-r from-cyan-200/14 via-white/10 to-amber-200/20 shadow-[0_0_34px_rgba(216,180,106,0.16)] transition-opacity duration-500 rtl:left-auto rtl:right-[17%] ${activeIndex >= 3 ? "opacity-100" : "opacity-0"}`} />

            <div className={`stage-panel absolute bottom-[16%] left-[24%] h-[7.5rem] w-[18%] rounded-xl border border-white/15 bg-white/[0.055] backdrop-blur-md transition-opacity duration-500 rtl:left-auto rtl:right-[24%] ${activeIndex >= 4 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-panel absolute bottom-[16%] left-[45%] h-[8.6rem] w-[22%] rounded-xl border border-cyan-200/24 bg-cyan-200/[0.035] backdrop-blur-md transition-opacity duration-500 rtl:left-auto rtl:right-[45%] ${activeIndex >= 4 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-panel absolute bottom-[16%] right-[16%] grid h-[9rem] w-[18%] place-items-center rounded-xl border border-amber-200/28 bg-black/35 text-center backdrop-blur-md transition-opacity duration-500 rtl:left-[16%] rtl:right-auto ${activeIndex >= 4 ? "opacity-100" : "opacity-0"}`}>
              <span className="font-latin text-[0.66rem] font-black uppercase tracking-[0.18em] text-white/82">
                ARATTA
                <span className="block text-[var(--gold)]">EXPO</span>
              </span>
            </div>

            <div className={`stage-material absolute bottom-[10%] left-[13%] h-12 w-24 rounded-[999px] border border-cyan-200/20 bg-gradient-to-br from-slate-300/20 via-slate-600/40 to-black/70 shadow-[0_18px_32px_rgba(0,0,0,0.34)] transition-opacity duration-500 rtl:left-auto rtl:right-[13%] ${activeIndex >= 2 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-material absolute bottom-[8%] right-[24%] h-14 w-14 rounded-full border border-amber-200/22 bg-[radial-gradient(circle_at_28%_28%,#ffe1a0,#b46b34_42%,#3a1e11_78%)] transition-opacity duration-500 rtl:left-[24%] rtl:right-auto ${activeIndex >= 2 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-material absolute bottom-[9%] right-[15%] h-8 w-28 rounded-full border border-amber-200/20 bg-gradient-to-r from-[#502410] via-[#d98842] to-[#ffe0a0] transition-opacity duration-500 rtl:left-[15%] rtl:right-auto ${activeIndex >= 2 ? "opacity-100" : "opacity-0"}`} />

            <div className={`stage-visitors absolute bottom-[9%] left-[33%] h-14 w-5 rounded-full bg-white/60 shadow-[0_0_18px_rgba(255,255,255,0.2)] transition-opacity duration-500 rtl:left-auto rtl:right-[33%] ${activeIndex >= 5 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-visitors absolute bottom-[9%] left-[37%] h-12 w-4 rounded-full bg-cyan-100/45 transition-opacity duration-500 rtl:left-auto rtl:right-[37%] ${activeIndex >= 5 ? "opacity-100" : "opacity-0"}`} />
            <div className={`stage-visitors absolute bottom-[9%] right-[34%] h-16 w-5 rounded-full bg-amber-100/52 transition-opacity duration-500 rtl:left-[34%] rtl:right-auto ${activeIndex >= 5 ? "opacity-100" : "opacity-0"}`} />
          </div>

          <div className="stage-card relative z-10 mx-auto mt-1 max-w-[880px] rounded-[1.45rem] border border-white/16 bg-[rgba(18,24,31,0.88)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:rounded-[1.8rem] sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--cyan)]">
                  {activeStage.label}
                </div>
                <h3 className="mt-4 break-words text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                  {activeStage.title}
                </h3>
              </div>
              <div className="font-latin shrink-0 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-sm font-black text-white/62">
                {stageLabel}
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-white/72">
              {activeStage.body}
            </p>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--cyan)] via-white to-[var(--gold)] transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="relative z-10 mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            {stages.map((stage, index) => {
              const Icon = stageIcons[index] ?? DraftingCompass;
              const isActive = index === activeIndex;
              const isComplete = index <= activeIndex;
              return (
                <button
                  key={stage.label}
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => setActiveIndex(index)}
                  className={`group flex min-h-20 items-center gap-3 rounded-2xl border px-4 py-3 text-start transition ${
                    isActive
                      ? "border-cyan-200/45 bg-cyan-200/9 text-white"
                      : "border-white/10 bg-white/[0.035] text-white/62 hover:border-white/22 hover:text-white"
                  }`}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                      isComplete
                        ? "border-amber-200/38 text-[var(--gold)]"
                        : "border-cyan-200/28 text-[var(--cyan)]"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="font-latin block text-[0.66rem] font-black uppercase tracking-[0.18em]">
                      {stage.label}
                    </span>
                    <span className="mt-1 block truncate text-xs font-bold">{stage.title}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative z-10 mt-5 flex justify-center text-white/46">
            <ArrowDown size={18} aria-hidden="true" />
            <span className="sr-only">
              {content.lang === "fa" ? "ادامه صفحه با اسکرول طبیعی" : "Continue with normal page scroll"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
