"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  Cog,
  Factory,
  Layers3,
  Mountain,
  RadioTower,
} from "lucide-react";
import { useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
import { boothStageFrames, mobileBoothStageFrames } from "@/lib/booth-scenes";
import { cn } from "@/lib/cn";

const capabilityIcons = [Mountain, Factory, Cog, RadioTower];
const capabilityRoutes = ["exhibitions", "exhibitions", "equipment", "participants"] as const;

const aboutDetails = {
  fa: {
    systemLabel: "Capability System",
    panelTitle: "از اعتبار صنعتی تا تجربه اجرایی",
    panelBody:
      "این بخش فقط معرفی نیست؛ مسیرهای اصلی فعالیت اَرَت را مثل یک نقشه عملیاتی نشان می دهد تا مخاطب سریع بفهمد کجا باید ادامه بدهد.",
    open: "ورود به مسیر",
    signal: "لایه فعال",
    metrics: [
      { label: "حوزه تخصصی", value: "صنعتی" },
      { label: "مسیرهای سایت", value: "۱۰+" },
      { label: "فایل رسمی", value: "۳" },
    ],
    cards: [
      "نمایشگاه های معدن، صنایع معدنی و زنجیره تامین با روایت اجرایی روشن.",
      "فولاد، مس و فلزات با ساختار محتوایی مناسب مشارکت کنندگان و بازدیدکنندگان.",
      "ماشین آلات، تجهیزات و نیازهای غرفه با مسیر مستقیم به فایل ها و پیگیری.",
      "رسانه، مشارکت کنندگان، خبر و گالری برای ادامه ارتباط بعد از نمایشگاه.",
    ],
  },
  en: {
    systemLabel: "Capability System",
    panelTitle: "From industrial credibility to execution",
    panelBody:
      "This is more than an introduction. It maps Aratta's operating lanes so visitors know exactly where to continue.",
    open: "Open lane",
    signal: "Active layer",
    metrics: [
      { label: "Focus", value: "Industrial" },
      { label: "Site lanes", value: "10+" },
      { label: "Official files", value: "3" },
    ],
    cards: [
      "Mining and mineral supply-chain exhibitions with a clear execution narrative.",
      "Steel, copper, and metals content structured for participants and visitors.",
      "Machinery, equipment, and booth needs connected to files and follow-up paths.",
      "Media, participants, news, and gallery content for post-event continuity.",
    ],
  },
} as const;

type AboutExperienceProps = {
  content: SiteContent;
};

export function AboutExperience({ content }: AboutExperienceProps) {
  const [active, setActive] = useState(0);
  const copy = aboutDetails[content.lang];
  const activeProof = content.about.proof[active] ?? content.about.proof[0];
  const activeBody = copy.cards[active] ?? copy.cards[0];
  const ActiveIcon = capabilityIcons[active] ?? Mountain;
  const activeMobileFrame = mobileBoothStageFrames[active] ?? mobileBoothStageFrames[5];

  return (
    <section id="about" className="relative overflow-hidden py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className="section-shell">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.018))] p-6 shadow-2xl shadow-black/25 sm:p-8"
          >
            <div className="pointer-events-none absolute -end-20 top-8 h-56 w-56 rounded-full border border-cyan-200/10 bg-cyan-200/6 blur-2xl" />
            <div className="relative">
              <div className="section-kicker">{content.about.kicker}</div>
              <h2 className="mt-4 text-balance text-4xl font-black leading-tight text-white sm:text-5xl">
                {content.about.title}
              </h2>
              <p className="mt-5 text-base font-semibold leading-8 text-white/68 sm:text-lg sm:leading-9">
                {content.about.body}
              </p>

              <motion.div
                key={activeMobileFrame.key}
                initial={{ opacity: 0.72, scale: 1.025 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="relative mt-6 h-40 overflow-hidden rounded-[1.35rem] border border-white/12 bg-black/30 shadow-2xl shadow-black/30 lg:hidden"
              >
                <Image
                  src={activeMobileFrame.src}
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.78))]" />
                <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/22 bg-black/44 px-3 py-2 text-[0.68rem] font-black text-[var(--cyan)] backdrop-blur-xl">
                    <ActiveIcon size={15} />
                    {activeProof}
                  </span>
                  <span className="font-latin rounded-full border border-amber-200/22 bg-amber-200/12 px-3 py-2 text-[0.68rem] font-black text-[var(--gold)] backdrop-blur-xl">
                    0{active + 1}
                  </span>
                </div>
              </motion.div>

              <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
                {copy.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[1.2rem] border border-white/10 bg-black/24 p-3 text-center"
                  >
                    <div className="font-latin text-lg font-black text-[var(--gold)]">
                      {metric.value}
                    </div>
                    <div className="mt-1 text-[0.68rem] font-bold leading-5 text-white/48">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 overflow-hidden rounded-[1.4rem] border border-cyan-200/16 bg-cyan-200/[0.045] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-latin text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--cyan)]">
                    {copy.systemLabel}
                  </span>
                  <Layers3 size={18} className="text-[var(--gold)]" />
                </div>
                <div className="grid gap-2">
                  {content.about.proof.map((item, index) => {
                    const RowIcon = capabilityIcons[index] ?? Mountain;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setActive(index)}
                        className={cn(
                          "group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-start transition",
                          active === index
                            ? "border-cyan-200/38 bg-cyan-200/10 text-white"
                            : "border-white/8 bg-black/18 text-white/66 hover:border-white/18 hover:bg-white/[0.045]",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="font-latin text-xs font-black text-[var(--cyan)]">
                            0{index + 1}
                          </span>
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/22 text-[var(--gold)]">
                            <RowIcon size={16} />
                          </span>
                          <span className="truncate text-sm font-black sm:text-base">{item}</span>
                        </span>
                        <CheckCircle2
                          size={18}
                          className={active === index ? "text-[var(--gold)]" : "text-white/32"}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.55, delay: 0.08, ease: "easeOut" }}
            className="industrial-card relative min-h-[520px] overflow-hidden rounded-[2rem]"
          >
            <Image
              src={boothStageFrames[5].src}
              alt=""
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="hidden object-cover md:block"
            />
            <Image
              src={mobileBoothStageFrames[5].src}
              alt=""
              fill
              sizes="100vw"
              className="object-cover md:hidden"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.76))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(125,220,232,0.2),transparent_16rem),radial-gradient(circle_at_82%_76%,rgba(214,174,101,0.22),transparent_18rem)]" />
            <motion.div
              aria-hidden="true"
              className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-cyan-200/58 to-transparent"
              animate={{
                insetInlineStart:
                  content.dir === "rtl" ? ["88%", "12%", "88%"] : ["12%", "88%", "12%"],
              }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 flex min-h-[520px] flex-col justify-between p-6 sm:p-8">
              <div className="ms-auto inline-flex items-center gap-2 rounded-full border border-amber-200/24 bg-black/36 px-4 py-2 text-xs font-black text-[var(--gold)] backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-[var(--gold)] shadow-[0_0_18px_rgba(214,174,101,0.8)]" />
                {copy.signal} 0{active + 1}
              </div>

              <motion.div
                key={activeProof}
                initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="max-w-xl rounded-[1.7rem] border border-white/14 bg-black/48 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
              >
                <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/24 bg-cyan-200/10 text-[var(--cyan)]">
                  <ActiveIcon size={25} strokeWidth={1.8} />
                </div>
                <h3 className="text-2xl font-black leading-tight text-white sm:text-3xl">
                  {activeProof}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-7 text-white/68 sm:text-base sm:leading-8">
                  {activeBody}
                </p>
                <Link
                  href={`/${content.lang}/${capabilityRoutes[active] ?? "exhibitions"}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-black text-white transition hover:border-cyan-200/36 hover:bg-cyan-200/10"
                >
                  {copy.open}
                  <ArrowUpRight size={17} />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {content.about.proof.map((item, index) => {
            const Icon = capabilityIcons[index] ?? Mountain;
            const isActive = active === index;
            return (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onViewportEnter={() => setActive(index)}
              >
                <Link
                  href={`/${content.lang}/${capabilityRoutes[index] ?? "exhibitions"}`}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  className={cn(
                    "group relative block overflow-hidden rounded-[1.55rem] border p-5 transition duration-300",
                    isActive
                      ? "border-cyan-200/44 bg-cyan-200/[0.09] shadow-[0_18px_70px_rgba(125,220,232,0.12)]"
                      : "border-white/10 bg-white/[0.035] hover:border-white/22 hover:bg-white/[0.065]",
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/12 bg-black/28 text-[var(--gold)] transition group-hover:text-[var(--cyan)]">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className="font-latin text-sm font-black text-[var(--cyan)]">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 min-h-14 text-xl font-black leading-7 text-white">
                    {item}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-white/56">
                    {copy.cards[index]}
                  </p>
                  <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--cyan)] to-[var(--gold)]"
                      animate={{ width: isActive ? "100%" : "34%" }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
