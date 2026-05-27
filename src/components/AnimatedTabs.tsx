"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  FileText,
  Handshake,
  Images,
  Layers3,
  RadioTower,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { SiteContent } from "@/data/aratta-content";
import { cn } from "@/lib/cn";
import { boothStageFrames } from "@/lib/booth-scenes";

const serviceMeta = [
  {
    icon: Handshake,
    route: "exhibitions",
    frame: boothStageFrames[1].src,
  },
  {
    icon: FileText,
    route: "forms",
    frame: boothStageFrames[2].src,
  },
  {
    icon: Cpu,
    route: "equipment",
    frame: boothStageFrames[3].src,
  },
  {
    icon: Images,
    route: "gallery",
    frame: boothStageFrames[5].src,
  },
] as const;

const sectionCopy = {
  fa: {
    intro:
      "هر مسیر اجرایی در این بخش به یک صفحه واقعی وصل است: نمایشگاه ها، فرم ها، تجهیزات و رسانه. کاربر باید از همین نقطه بتواند تصمیم بگیرد و وارد مسیر درست شود.",
    activeLabel: "مسیر فعال",
    open: "باز کردن مسیر",
    deliverables: "خروجی قابل تحویل",
    liveRoute: "صفحه آماده بازدید",
    tabsLabel: "ماژول های اجرایی",
    proofTitle: "ریتم اجرای پروژه",
    proof: [
      {
        label: "Brief",
        title: "دریافت و دسته بندی نیاز",
        body: "هدف مشارکت، متراژ، صنعت، زمان بندی و فایل های رسمی در یک مسیر روشن جمع می شود.",
      },
      {
        label: "Plan",
        title: "طراحی تجربه و جریان سالن",
        body: "جانمایی، مسیر بازدید، برنامه ارتباطی و نیازهای غرفه به برنامه اجرایی تبدیل می شود.",
      },
      {
        label: "Operate",
        title: "تحویل، رسانه و پیگیری",
        body: "تجهیزات، فرم ها، تصویر، خبر و کانال تماس تا پایان رویداد قابل پیگیری می ماند.",
      },
    ],
    tracks: [
      ["نقشه سالن", "تقویم اجرایی", "هماهنگی حامیان", "مسیر بازدیدکننده"],
      ["فرم شرکت", "فهرست مشارکت کنندگان", "دانلود رسمی", "پیگیری امن درخواست"],
      ["لیست تجهیزات", "نیازسنجی غرفه", "هماهنگی لجستیک", "آماده سازی اجرا"],
      ["آرشیو تصویر", "خبر رویداد", "گالری قابل انتشار", "محتوای معرفی نمایشگاه"],
    ],
  },
  en: {
    intro:
      "Every operational lane connects to a real page: exhibitions, forms, equipment, and media. Visitors can decide, verify, and continue without dead ends.",
    activeLabel: "Active lane",
    open: "Open lane",
    deliverables: "Deliverables",
    liveRoute: "Live page",
    tabsLabel: "Operating modules",
    proofTitle: "Project rhythm",
    proof: [
      {
        label: "Brief",
        title: "Capture and classify demand",
        body: "Participation goal, area, industry, timeline, and official files enter one clear path.",
      },
      {
        label: "Plan",
        title: "Design the hall experience",
        body: "Placement, visitor movement, communications, and booth needs become an execution plan.",
      },
      {
        label: "Operate",
        title: "Deliver, publish, and follow up",
        body: "Equipment, forms, imagery, news, and contact channels remain traceable through the event.",
      },
    ],
    tracks: [
      ["Hall map", "Execution calendar", "Sponsor coordination", "Visitor circulation"],
      ["Participation form", "Participant list", "Official downloads", "Safe inquiry follow-up"],
      ["Equipment list", "Booth requirements", "Logistics coordination", "Show-floor readiness"],
      ["Image archive", "Event news", "Publishable gallery", "Exhibition communication"],
    ],
  },
} as const;

type AnimatedTabsProps = {
  content: SiteContent;
};

export function AnimatedTabs({ content }: AnimatedTabsProps) {
  const [active, setActive] = useState(0);
  const copy = sectionCopy[content.lang];
  const current = content.services.items[active] ?? content.services.items[0];
  const activeMeta = serviceMeta[active] ?? serviceMeta[0];
  const ActiveIcon = activeMeta.icon;
  const activeTracks = copy.tracks[active] ?? copy.tracks[0];

  return (
    <section id="forms" className="relative overflow-hidden py-24 sm:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/22 to-transparent" />
      <div className="section-shell">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div>
            <div className="section-kicker">{content.services.kicker}</div>
            <h2 className="section-display-title mt-4 max-w-4xl text-balance font-black text-white">
              {content.services.title}
            </h2>
          </div>
          <p className="site-copy max-w-2xl text-lg text-white/64 lg:ms-auto">
            {copy.intro}
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.article
            key={current.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="industrial-card relative min-h-[660px] overflow-hidden rounded-[2rem]"
          >
            <Image
              src={activeMeta.frame}
              alt={current.title}
              fill
              sizes="(min-width: 1024px) 62vw, 100vw"
              className="object-cover"
              priority={false}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(1,8,10,0.98)_0%,rgba(1,8,10,0.9)_35%,rgba(1,8,10,0.28)_68%,rgba(1,8,10,0.62)_100%)] ltr:bg-[linear-gradient(90deg,rgba(1,8,10,0.62)_0%,rgba(1,8,10,0.28)_32%,rgba(1,8,10,0.9)_65%,rgba(1,8,10,0.98)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.78))]" />

            <div className="relative z-10 flex min-h-[660px] max-w-2xl flex-col justify-between p-6 sm:p-8 lg:p-10">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-latin inline-flex items-center gap-2 rounded-full border border-cyan-100/22 bg-cyan-100/8 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--cyan)]">
                    <RadioTower size={15} />
                    {copy.activeLabel} 0{active + 1}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/8 px-4 py-2 text-xs font-bold text-[var(--gold)]">
                    <CheckCircle2 size={15} />
                    {copy.liveRoute}
                  </span>
                </div>

                <div className="mt-9 grid h-20 w-20 place-items-center rounded-[1.4rem] border border-white/18 bg-white/12 text-[var(--cyan)] shadow-[0_20px_90px_rgba(62,231,255,0.18)] backdrop-blur-2xl">
                  <ActiveIcon size={34} strokeWidth={1.7} />
                </div>

                <h3 className="card-display-title mt-8 text-balance font-black text-white">
                  {current.title}
                </h3>
                <p className="site-copy mt-5 max-w-xl text-base text-white/72 sm:text-lg">
                  {current.body}
                </p>
              </div>

              <div className="mt-10">
                <div className="mb-4 flex items-center gap-2 text-sm font-black text-white/86">
                  <Layers3 size={18} className="text-[var(--gold)]" />
                  {copy.deliverables}
                </div>
                <div className="grid border-y border-white/12 sm:grid-cols-2">
                  {activeTracks.map((track, index) => (
                    <div
                      key={track}
                      className={cn(
                        "flex items-center gap-3 py-4 text-sm font-bold text-white/78",
                        index % 2 === 0 ? "sm:border-e sm:border-white/12" : "",
                        index > 1 ? "border-t border-white/12" : "",
                      )}
                    >
                      <span className="font-latin text-xs font-black text-[var(--gold)]">
                        0{index + 1}
                      </span>
                      <span>{track}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/${content.lang}/${activeMeta.route}`}
                  className="liquid-button mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-black text-white"
                >
                  {copy.open}
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </div>
          </motion.article>

          <div className="grid content-start gap-4">
            <div className="mb-1 flex items-center justify-between gap-4">
              <div className="text-sm font-black text-white">{copy.tabsLabel}</div>
              <div className="font-latin text-xs font-black uppercase tracking-[0.22em] text-white/38">
                04 lanes
              </div>
            </div>

            {content.services.items.map((item, index) => {
              const meta = serviceMeta[index] ?? serviceMeta[0];
              const RowIcon = meta.icon;
              const isActive = active === index;

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setActive(index)}
                  className={cn(
                    "group relative overflow-hidden rounded-[1.5rem] border p-5 text-start transition duration-300",
                    isActive
                      ? "border-cyan-200/45 bg-cyan-200/12 shadow-[0_22px_80px_rgba(62,231,255,0.12)]"
                      : "border-white/10 bg-white/[0.035] hover:border-white/24 hover:bg-white/[0.06]",
                  )}
                >
                  <div className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-[var(--cyan)] to-[var(--gold)] opacity-0 transition group-hover:opacity-80" />
                  <div
                    className={cn(
                      "absolute inset-y-5 end-5 w-px bg-gradient-to-b from-transparent via-white/16 to-transparent transition",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="relative flex items-start gap-4">
                    <span
                      className={cn(
                        "grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-[1.1rem] border transition",
                        isActive
                          ? "border-cyan-100/32 bg-cyan-100/12 text-[var(--cyan)]"
                          : "border-white/12 bg-black/28 text-[var(--gold)]",
                      )}
                    >
                      <RowIcon size={23} strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-latin block text-xs font-black uppercase tracking-[0.2em] text-white/38">
                        0{index + 1}
                      </span>
                      <span className="mt-2 block text-lg font-black leading-7 text-white">
                        {item.title}
                      </span>
                      <span className="mt-2 block text-sm leading-7 text-white/56">
                        {item.body}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <h3 className="text-2xl font-black text-white">{copy.proofTitle}</h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/14 to-transparent" />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {copy.proof.map((item) => (
            <div
              key={item.label}
              className="industrial-card rounded-[1.5rem] p-5 transition hover:-translate-y-1 hover:border-cyan-200/32"
            >
              <div className="font-latin text-xs font-black uppercase tracking-[0.22em] text-[var(--gold)]">
                {item.label}
              </div>
              <h3 className="mt-4 text-xl font-black text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/58">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
