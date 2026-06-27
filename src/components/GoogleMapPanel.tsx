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
    <div className={compact ? "glass grid min-h-[390px] overflow-hidden rounded-[2rem] p-3 sm:p-4" : "glass grid min-h-[560px] overflow-hidden rounded-[2rem] p-3 sm:p-5"}>
      <div className={compact ? "relative min-h-[360px] overflow-hidden rounded-[1.5rem] border border-white/12 bg-black/25" : "relative min-h-[520px] overflow-hidden rounded-[1.5rem] border border-white/12 bg-black/25"}>
        <iframe
          title={fa ? "نقشه گوگل دفتر اَرَت در کرمان" : "Google map for Aratta office in Kerman"}
          src={content.contact.mapEmbedUrl}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,7,0.02),transparent_28%,transparent_72%,rgba(3,5,7,0.24)_100%)]" />

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[84%]">
          <div className="relative grid h-14 w-14 place-items-center rounded-full border border-amber-200/60 bg-black/82 shadow-[0_18px_42px_rgba(0,0,0,0.45),0_0_34px_rgba(214,174,101,0.34)] backdrop-blur-md sm:h-[4.25rem] sm:w-[4.25rem]">
            <Image
              src={brand.pin}
              alt=""
              width={48}
              height={48}
              className="h-10 w-10 rounded-full object-cover sm:h-12 sm:w-12"
            />
            <span className="absolute -bottom-2 h-4 w-4 rotate-45 border-b border-r border-amber-200/60 bg-black/82" />
          </div>
        </div>

        {compact ? (
          <div className="absolute inset-x-3 top-3 z-10 sm:inset-x-5 sm:top-5">
            <div className="max-w-[min(30rem,100%)] rounded-[1.2rem] border border-white/14 bg-black/46 p-3 shadow-2xl shadow-black/28 backdrop-blur-xl sm:p-4">
              <div className="flex items-start gap-3">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-amber-200/35 bg-black shadow-lg shadow-black/25 sm:h-12 sm:w-12 sm:rounded-2xl">
                  <Image
                    src={brand.logo}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </span>
                <div>
                  <div className="section-kicker">{content.contact.mapLabel}</div>
                  <h2 className="mt-1 text-base font-black leading-7 text-white sm:mt-2 sm:text-2xl sm:leading-8">
                    {content.contact.placeName}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {compact ? (
          <div className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-5 sm:bottom-5">
            <div className="grid gap-2 rounded-[1.2rem] border border-white/14 bg-black/48 p-2.5 backdrop-blur-xl sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-3 sm:p-3">
              <div className="min-w-0">
                <div className="font-latin text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--cyan)]">
                  Google Maps / {content.contact.plusCode}
                </div>
              </div>
              <MapActions content={content} fa={fa} />
            </div>
          </div>
        ) : null}
      </div>
      {!compact ? (
        <div className="mt-3 grid gap-3 rounded-[1.35rem] border border-white/14 bg-black/38 p-3 backdrop-blur-xl sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-amber-200/35 bg-black shadow-lg shadow-black/25">
              <Image src={brand.logo} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <div className="min-w-0">
              <div className="section-kicker">{content.contact.mapLabel}</div>
              <h2 className="mt-1 text-xl font-black leading-8 text-white">{content.contact.placeName}</h2>
              <p className="mt-1 text-sm leading-7 text-white/68">{content.contact.address}</p>
              <div className="font-latin mt-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--cyan)]">
                Google Maps / {content.contact.plusCode}
              </div>
            </div>
          </div>
          <MapActions content={content} fa={fa} />
        </div>
      ) : null}
    </div>
  );
}

function MapActions({ content, fa }: { content: SiteContent; fa: boolean }) {
  return (
    <>
      <a
        href={content.contact.mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/14 bg-white/[0.07] px-3 py-2.5 text-xs font-black text-white transition hover:border-cyan-200/34 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
      >
        <ExternalLink size={17} />
        {fa ? "باز کردن نقشه" : "Open map"}
      </a>
      <a
        href={content.contact.directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="liquid-button inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black text-white sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
      >
        <Navigation size={17} />
        {fa ? "مسیریابی" : "Directions"}
      </a>
    </>
  );
}
