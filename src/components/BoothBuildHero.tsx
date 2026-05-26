"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Download,
  FileDown,
  Headphones,
  MapPin,
  Sparkles,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { SiteContent } from "@/data/aratta-content";
import { boothStageFrames } from "@/lib/booth-scenes";

type BoothBuildHeroProps = {
  content: SiteContent;
};

export function BoothBuildHero({ content }: BoothBuildHeroProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const Arrow = content.dir === "rtl" ? ArrowLeft : ArrowRight;
  const activeStage = useMemo(() => {
    const index = Math.min(
      content.hero.stages.length - 1,
      Math.floor(progress * content.hero.stages.length),
    );
    return content.hero.stages[index];
  }, [content.hero.stages, progress]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !rootRef.current) {
      setProgress(1);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const scope = rootRef.current;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".blueprint-layer",
        { opacity: 0.95, xPercent: content.dir === "rtl" ? 4 : -4 },
        {
          opacity: 0.26,
          xPercent: 0,
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: "bottom top",
            scrub: 0.65,
            onUpdate: (self) => setProgress(self.progress),
          },
        },
      );
      gsap.fromTo(
        ".hero-reveal",
        { opacity: 0.72, scale: 1.04 },
        {
          opacity: 1,
          scale: 1,
          scrollTrigger: {
            trigger: scope,
            start: "top top",
            end: "bottom top",
            scrub: 0.65,
          },
        },
      );
    }, scope);

    return () => ctx.revert();
  }, [content.dir, content.lang]);

  return (
    <section
      id="home"
      ref={rootRef}
      className="relative isolate overflow-hidden pb-7 pt-[5.75rem] lg:min-h-screen"
      aria-label={content.hero.title}
    >
      <div className="absolute inset-0 -z-10">
        <Image
          src={boothStageFrames[5].src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-reveal object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,5,8,0.96)_0%,rgba(2,5,8,0.82)_30%,rgba(2,5,8,0.18)_68%,rgba(2,5,8,0.32)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,5,8,0.05)_0%,rgba(2,5,8,0.16)_48%,#05070a_100%)]" />
      </div>

      <div className="blueprint-layer pointer-events-none absolute inset-y-0 start-0 -z-10 w-[56%] bg-[linear-gradient(rgba(62,231,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(62,231,255,0.18)_1px,transparent_1px)] bg-[length:56px_56px] [mask-image:linear-gradient(90deg,black,transparent)]" />

      <div className="mx-auto w-full max-w-[1510px] px-4 md:px-6">
        <div className="grid min-h-[330px] items-center gap-7 py-3 [direction:ltr] lg:grid-cols-[0.88fr_1.12fr] lg:py-4">
          <div dir={content.dir} className="max-w-[42rem] min-w-0 lg:px-4">
            <div className="mb-5 inline-flex items-center gap-3 text-[0.68rem] font-black uppercase tracking-[0.28em] text-[var(--cyan)]">
              <span className="h-px w-16 bg-[var(--cyan)]" />
              Aratta Expo / 2026+
            </div>
            <h1 className="text-balance max-w-full break-words text-4xl font-black leading-[1.14] text-white sm:text-5xl lg:text-[4.1rem] xl:text-[4.55rem]">
              {content.hero.title}
            </h1>
            <p className="mt-4 max-w-[calc(100vw-2rem)] break-words text-sm leading-7 text-white/82 sm:max-w-xl sm:text-lg">
              {content.hero.subtitle}
            </p>
            <div className="mt-5 space-y-2">
              <p className="font-latin max-w-[calc(100vw-2rem)] break-words text-xs leading-5 text-white/76 sm:max-w-md sm:text-sm">
                {content.lang === "fa"
                  ? "International exhibitions organizer for Mining, Metals, Steel & Copper Industries"
                  : "Cinematic registration, official forms, media, participants and contact paths in one clean system."}
              </p>
            </div>
          </div>

          <div className="hidden min-h-[390px] lg:block" aria-hidden="true" />
        </div>

        <div className="dashboard-card glass mx-auto -mt-2 grid w-full max-w-[1120px] gap-3 rounded-[1.3rem] p-3 md:grid-cols-4">
          {content.hero.metrics.map((metric, index) => {
            const Icon = [Users, Building2, UserRoundPlus, CalendarDays][index] ?? Users;
            return (
              <div
                key={metric.label}
                className="flex items-center gap-3 border-white/10 px-4 py-3 md:border-e"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-200/25 bg-black/30 text-[var(--gold)]">
                  <Icon size={21} />
                </span>
                <span>
                  <span className="font-latin block text-2xl font-black text-white">{metric.value}</span>
                  <span className="block text-xs leading-5 text-white/62">{metric.label}</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid w-full gap-3 lg:grid-cols-[1.85fr_1fr]">
          <div className="dashboard-card industrial-card rounded-[1.35rem] p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-white/52">
                  {content.lang === "fa" ? "نمایشگاه های رسمی آرشیوشده" : "Official archived exhibitions"}
                </p>
                <h2 className="font-latin text-2xl font-semibold uppercase tracking-[0.12em] text-white">
                  {content.lang === "fa" ? "EXHIBITIONS" : "EXHIBITIONS"}
                </h2>
              </div>
              <Link
                href={`/${content.lang}/exhibitions`}
                className="inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)]"
              >
                {content.lang === "fa" ? "مشاهده همه" : "View all"}
                <Arrow size={16} />
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {content.exhibitions.items.map((event, index) => (
                <Link
                  key={event.title}
                  href={`/${content.lang}/exhibitions`}
                  className="group relative min-h-44 overflow-hidden rounded-xl border border-white/12 bg-black/30"
                >
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    sizes="(min-width:1024px) 28vw, 100vw"
                    priority={index === 0}
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/35 to-black/5" />
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <p className="mb-2 text-xs font-bold text-[var(--gold)]">{event.date}</p>
                    <h3 className="line-clamp-2 text-base font-black leading-6 text-white">
                      {event.title}
                    </h3>
                    <div className="mt-3 flex items-center justify-between text-xs text-white/72">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} />
                        {event.location}
                      </span>
                      <span className="grid h-8 w-8 place-items-center rounded-lg border border-amber-200/35 text-[var(--gold)]">
                        <Arrow size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="dashboard-card industrial-card rounded-[1.35rem] p-5">
            <h2 className="text-center text-sm font-black text-white">
              {content.lang === "fa" ? "ثبت نام و دریافت" : "REGISTER & DOWNLOAD"}
            </h2>
            <div className="mt-6 grid grid-cols-2 divide-x divide-white/12 text-center rtl:divide-x-reverse">
              <Link
                href={`/${content.lang}/registration`}
                className="group grid place-items-center gap-3 px-3 py-2"
              >
                <span className="grid h-16 w-16 place-items-center rounded-2xl border border-amber-200/45 bg-black/22 text-[var(--gold)] transition group-hover:bg-amber-200/10">
                  <UserRoundPlus size={28} />
                </span>
                <span className="text-sm font-bold text-white">
                  {content.lang === "fa" ? "ثبت نام بازدیدکننده" : "Visitor registration"}
                </span>
              </Link>
              <Link
                href={`/${content.lang}/forms`}
                className="group grid place-items-center gap-3 px-3 py-2"
              >
                <span className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan-200/45 bg-black/22 text-[var(--cyan)] transition group-hover:bg-cyan-200/10">
                  <FileDown size={28} />
                </span>
                <span className="text-sm font-bold text-white">
                  {content.lang === "fa" ? "دریافت فرم ها" : "Download forms"}
                </span>
              </Link>
            </div>
            <Link
              href={`/${content.lang}/registration`}
              className="liquid-button mt-6 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white"
            >
              <Sparkles size={16} />
              {content.hero.primary}
            </Link>
          </div>
        </div>

        <div className="mt-3 grid w-full gap-3 lg:grid-cols-[1.85fr_1fr]">
          <div className="dashboard-card industrial-card overflow-hidden rounded-[1.35rem] p-4">
            <div className="grid gap-4 md:grid-cols-[0.26fr_0.74fr] md:items-center">
              <div>
                <p className="text-xs text-white/52">
                  {content.lang === "fa" ? "گالری تصاویر" : "Image gallery"}
                </p>
                <h2 className="font-latin text-2xl font-semibold uppercase tracking-[0.14em] text-white">
                  Gallery
                </h2>
                <Link
                  href={`/${content.lang}/gallery`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--gold)]"
                >
                  {content.lang === "fa" ? "مشاهده همه" : "View all"}
                  <Arrow size={16} />
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {content.gallery.items.slice(0, 4).map((image) => (
                  <Link
                    key={image.src}
                    href={`/${content.lang}/gallery`}
                    className="relative aspect-[16/10] overflow-hidden rounded-lg border border-white/12"
                  >
                    <Image src={image.src} alt={image.alt} fill sizes="20vw" className="object-cover" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="dashboard-card industrial-card flex items-center justify-between gap-4 rounded-[1.35rem] p-5">
            <div className="space-y-3">
              <p className="text-xs text-white/52">
                {content.lang === "fa" ? "برای مشارکت و اطلاعات بیشتر" : "For participation and details"}
              </p>
              <a href="tel:03491305910" className="flex items-center gap-3 text-lg text-white/82">
                <Headphones size={19} />
                034-91305910
              </a>
              <a href="mailto:info@arattaexpo.ir" className="flex items-center gap-3 text-lg text-white/82">
                <Download size={18} />
                info@arattaexpo.ir
              </a>
            </div>
            <Link
              href={`/${content.lang}/contact`}
              className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white/8 text-white"
            >
              <Headphones size={34} />
              <span className="text-[0.65rem] font-bold">{content.lang === "fa" ? "تماس" : "Contact"}</span>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-full border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55 backdrop-blur-xl">
          <span>{activeStage.label}: {activeStage.title}</span>
          <span className="font-latin">{Math.round(progress * 100)}%</span>
        </div>
      </div>
    </section>
  );
}
