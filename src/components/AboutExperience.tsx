"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Cog, Factory, Mountain, Users } from "lucide-react";
import { useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
import { boothStageFrames, mobileBoothStageFrames } from "@/lib/booth-scenes";
import { cn } from "@/lib/cn";
import { BuildBackdrop } from "@/components/backdrops/BuildBackdrop";

const sectorIcons = [Mountain, Factory, Cog, Users];
const sectorRoutes = ["exhibitions", "exhibitions", "equipment", "participants"] as const;
const sectorFrames = [2, 3, 4, 5] as const;

const aboutDetails = {
  fa: {
    factsTitle: "اَرَتَ در عدد",
    factsNote: "ارقام از گزارش‌های رسمی دوره‌های برگزارشده",
    archive: "آرشیو گزارش‌ها",
    sectorsLabel: "حوزه‌های تخصصی",
    cards: [
      "نمایشگاه بین‌المللی معدن کرمان (KIMEX) تا امروز ۹ دوره برگزار شده و معدن، صنایع معدنی، ماشین‌آلات و خدمات وابسته را گرد هم می‌آورد.",
      "نمایشگاه زنجیره تأمین فولاد، مس و انرژی در کرمان و نمایشگاه نهضت تولید در سیرجان، تأمین‌کنندگان را به صنایع بزرگ منطقه وصل می‌کنند.",
      "ماشین‌آلات راه‌سازی و معدنی، تجهیزات و خدمات فنی؛ و برای غرفه‌داران، اجاره مبلمان، نمایشگر و برق غرفه.",
      "شرکت‌هایی مانند گل‌گهر، صنایع مس ایران و گهر زمین در دوره‌های گذشته حضور داشته‌اند. فهرست رسمی مشارکت‌کنندگان را ببینید.",
    ],
    ctas: ["نمایشگاه معدن کرمان", "نمایشگاه زنجیره فولاد و مس", "اجاره تجهیزات غرفه", "مشارکت‌کنندگان و حامیان"],
  },
  en: {
    factsTitle: "Aratta in numbers",
    factsNote: "Figures from the official reports of past editions",
    archive: "Report archive",
    sectorsLabel: "Specialist sectors",
    cards: [
      "Kerman's international mining exhibition (KIMEX) has run nine editions, bringing together mining, mineral industries, machinery and related services.",
      "The steel, copper and energy supply-chain exhibition in Kerman and the production exhibition in Sirjan connect suppliers with the region's major industries.",
      "Road and mining machinery, equipment and technical services, plus furniture, screens and power rental for exhibitors.",
      "Companies such as Gol-E-Gohar, National Iranian Copper Industries and Gohar Zamin have taken part in past editions. See the official participant lists.",
    ],
    ctas: ["Kerman mining exhibition", "Steel and copper exhibition", "Booth equipment rental", "Participants and supporters"],
  },
} as const;

type AboutExperienceProps = {
  content: SiteContent;
};

export function AboutExperience({ content }: AboutExperienceProps) {
  const [active, setActive] = useState(0);
  const lang = content.lang;
  const copy = aboutDetails[lang];
  const sectors = content.about.proof;
  const ActiveIcon = sectorIcons[active] ?? Mountain;
  const frame = sectorFrames[active] ?? 5;

  return (
    <section id="about" className="relative isolate overflow-hidden section-pad">
      <BuildBackdrop motif="logo" lang={lang} className="end-[-22%] top-[-1rem] w-[min(460px,88vw)] lg:max-[1599px]:hidden min-[1600px]:end-[calc(50%-590px-25.5rem)] min-[1600px]:top-auto min-[1600px]:bottom-8 min-[1600px]:w-[24rem]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="section-shell grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex flex-col justify-between gap-8 py-2"
        >
          <div>
            <div className="section-kicker">{content.about.kicker}</div>
            <h2 className="section-display-title mt-4 text-balance font-black text-white">
              {content.about.title}
            </h2>
            <p className="site-copy mt-5 text-base text-white/68 sm:text-lg">
              {content.about.body}
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-black text-white">{copy.factsTitle}</h3>
              <Link
                href={`/${lang}/archive`}
                className="inline-flex min-h-11 items-center text-xs font-bold text-[var(--cyan)] hover:underline"
              >
                {copy.archive}
              </Link>
            </div>
            <dl className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {content.hero.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="industrial-card rounded-[1.35rem] px-4 py-4 sm:px-5"
                >
                  <dt className="sr-only">{metric.label}</dt>
                  <dd>
                    <span className="block text-3xl font-black leading-none text-[var(--gold)] sm:text-4xl">
                      {metric.value}
                    </span>
                    <span className="mt-2 block text-xs font-semibold leading-5 text-white/56 sm:text-[0.8rem]">
                      {metric.label}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[0.72rem] text-white/38">{copy.factsNote}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
          className="industrial-card relative isolate min-h-[560px] overflow-hidden rounded-[2rem] sm:min-h-[600px]"
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={frame}
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0 -z-10"
            >
              <Image
                src={boothStageFrames[frame].src}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="hidden object-cover md:block"
              />
              <Image
                src={mobileBoothStageFrames[frame].src}
                alt=""
                fill
                unoptimized
                sizes="100vw"
                className="object-cover md:hidden"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.35)_45%,rgba(0,0,0,0.86)_100%)]" />

          <div className="flex min-h-[560px] flex-col justify-end gap-4 p-4 sm:min-h-[600px] sm:p-6">
            <div className="glass rounded-[1.6rem] p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/14 bg-white/8 text-[var(--gold)]">
                  <ActiveIcon size={21} strokeWidth={1.8} />
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h3
                    key={active}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="text-xl font-black text-white sm:text-2xl"
                  >
                    {sectors[active]}
                  </motion.h3>
                </AnimatePresence>
              </div>
              <p className="min-h-[5.25rem] text-sm leading-7 text-white/72 sm:text-[0.95rem]">
                {copy.cards[active]}
              </p>
              <Link
                href={`/${lang}/${sectorRoutes[active] ?? "exhibitions"}`}
                className="liquid-button mt-4 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-black text-white"
              >
                {copy.ctas[active]}
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div aria-label={copy.sectorsLabel} role="group" className="grid grid-cols-2 gap-2">
              {sectors.map((item, index) => {
                const Icon = sectorIcons[index] ?? Mountain;
                const isActive = active === index;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActive(index)}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2.5 text-start text-xs font-bold backdrop-blur-xl transition sm:text-[0.8rem]",
                      isActive
                        ? "border-[var(--gold)]/50 bg-black/55 text-white shadow-[0_0_24px_-8px_rgba(214,174,101,0.6)]"
                        : "border-white/10 bg-black/40 text-white/70 hover:border-white/25 hover:text-white",
                    )}
                  >
                    <Icon size={15} className={isActive ? "shrink-0 text-[var(--gold)]" : "shrink-0 text-white/45"} />
                    <span className="leading-5">{item}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
