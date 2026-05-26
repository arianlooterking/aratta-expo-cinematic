import Image from "next/image";
import { ExternalLink, Navigation } from "lucide-react";
import type { SiteContent } from "@/data/aratta-content";
import { getBrandAssets } from "@/lib/brand-assets";

type GoogleMapPanelProps = {
  content: SiteContent;
  compact?: boolean;
};

export function GoogleMapPanel({ content, compact = false }: GoogleMapPanelProps) {
  const fa = content.lang === "fa";
  const brand = getBrandAssets(content.lang);

  return (
    <div className="glass grid min-h-[430px] overflow-hidden rounded-[2rem] p-4 sm:p-6">
      <div className="relative min-h-[390px] overflow-hidden rounded-[1.5rem] border border-white/12 bg-black/25">
        <iframe
          title={fa ? "نقشه گوگل دفتر اَرَت در کرمان" : "Google map for Aratta office in Kerman"}
          src={content.contact.mapEmbedUrl}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,7,0.08),rgba(3,5,7,0.36)_100%)]" />

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[84%]">
          <div className="relative grid h-[4.25rem] w-[4.25rem] place-items-center rounded-full border border-amber-200/60 bg-black/82 shadow-[0_18px_42px_rgba(0,0,0,0.45),0_0_34px_rgba(214,174,101,0.34)] backdrop-blur-md">
            <Image
              src={brand.pin}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-contain bg-white p-1"
            />
            <span className="absolute -bottom-2 h-4 w-4 rotate-45 border-b border-r border-amber-200/60 bg-black/82" />
          </div>
        </div>

        <div className="absolute inset-x-4 top-4 z-10 sm:inset-x-6 sm:top-6">
          <div className="max-w-md rounded-[1.4rem] border border-white/14 bg-black/62 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-amber-200/35 bg-white shadow-lg shadow-black/25">
                <Image
                  src={brand.logo}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-contain p-1"
                />
              </span>
              <div>
                <div className="section-kicker">{content.contact.mapLabel}</div>
                <h2 className="mt-2 text-xl font-black leading-8 text-white sm:text-2xl">
                  {content.contact.placeName}
                </h2>
                <p className="mt-1 text-sm leading-7 text-white/68">{content.contact.address}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4 z-10 sm:inset-x-6 sm:bottom-6">
          <div className="grid gap-3 rounded-[1.4rem] border border-white/14 bg-black/64 p-3 backdrop-blur-xl sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <div className="min-w-0">
              <div className="font-latin text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--cyan)]">
                Google Maps / {content.contact.plusCode}
              </div>
              {!compact ? (
                <p className="mt-1 truncate text-sm text-white/62">
                  {fa ? "داده نقشه واقعی از گوگل مپس با مسیر مستقیم." : "Real Google Maps data with direct route access."}
                </p>
              ) : null}
            </div>
            <a
              href={content.contact.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.07] px-4 py-3 text-sm font-black text-white transition hover:border-cyan-200/34"
            >
              <ExternalLink size={17} />
              {fa ? "باز کردن نقشه" : "Open map"}
            </a>
            <a
              href={content.contact.directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="liquid-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white"
            >
              <Navigation size={17} />
              {fa ? "مسیریابی" : "Directions"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
