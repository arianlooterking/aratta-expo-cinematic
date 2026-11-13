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
      <div className={compact ? "on-photo relative min-h-[360px] overflow-hidden rounded-[1.5rem] border border-ink/12 bg-shade/25" : "on-photo relative min-h-[520px] overflow-hidden rounded-[1.5rem] border border-ink/12 bg-shade/25"}>
        <MapBackdrop fa={fa} />
        <iframe
          title={fa ? "نقشه گوگل دفتر اَرَتَ در کرمان" : "Google map for Aratta office in Kerman"}
          src={content.contact.mapEmbedUrl}
          className="absolute inset-0 h-full w-full border-0 [color-scheme:normal]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,7,0.02),transparent_28%,transparent_72%,rgba(3,5,7,0.24)_100%)]" />

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[84%]">
          <div className="relative grid h-14 w-14 place-items-center rounded-full border border-gilt-200/60 bg-black shadow-[0_18px_42px_rgba(0,0,0,0.45),0_0_34px_rgba(214,174,101,0.34)] backdrop-blur-md sm:h-[4.25rem] sm:w-[4.25rem]">
            <Image
              src={brand.pin}
              alt=""
              width={48}
              height={46}
              unoptimized
              className="h-auto w-8 object-contain sm:w-10"
            />
            <span className="absolute -bottom-2 -z-10 h-4 w-4 rotate-45 border-b border-r border-gilt-200/60 bg-black" />
          </div>
        </div>

        {compact ? (
          <div className="absolute inset-x-3 top-3 z-10 sm:inset-x-5 sm:top-5">
            <div className="max-w-[min(30rem,100%)] rounded-[1.2rem] border border-ink/14 bg-shade/46 p-3 shadow-2xl shadow-umbra/28 backdrop-blur-xl sm:p-4">
              <div className="flex items-start gap-3">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink/10 bg-black shadow-lg shadow-umbra/25 sm:h-12 sm:w-12 sm:rounded-2xl">
                  <Image
                    src={brand.logo}
                    alt=""
                    fill
                    unoptimized
                    sizes="48px"
                    className="object-contain p-1.5"
                  />
                </span>
                <div>
                  <div className="section-kicker">{content.contact.mapLabel}</div>
                  <h2 className="mt-1 text-base font-black leading-7 text-ink sm:mt-2 sm:text-2xl sm:leading-8">
                    {content.contact.placeName}
                  </h2>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {compact ? (
          <div className="absolute inset-x-3 bottom-3 z-10 sm:inset-x-5 sm:bottom-5">
            <div className="grid gap-2 rounded-[1.2rem] border border-ink/14 bg-shade/48 p-2.5 backdrop-blur-xl sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-3 sm:p-3">
              <div className="min-w-0">
                <div className="text-[0.72rem] font-bold text-ink-60">
                  {fa ? "کد مکان گوگل" : "Google plus code"}{" "}
                  <span className="font-latin font-black text-[var(--cyan)]">{content.contact.plusCode}</span>
                </div>
              </div>
              <MapActions content={content} fa={fa} />
            </div>
          </div>
        ) : null}
      </div>
      {!compact ? (
        <div className="mt-3 grid gap-3 rounded-[1.35rem] border border-ink/14 bg-shade/38 p-3 backdrop-blur-xl sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-ink/10 bg-black shadow-lg shadow-umbra/25">
              <Image src={brand.logo} alt="" fill unoptimized sizes="48px" className="object-contain p-1.5" />
            </span>
            <div className="min-w-0">
              <div className="section-kicker">{content.contact.mapLabel}</div>
              <h2 className="mt-1 text-xl font-black leading-8 text-ink">{content.contact.placeName}</h2>
              <p className="mt-1 text-sm leading-7 text-ink-68">{content.contact.address}</p>
              <div className="mt-2 text-[0.72rem] font-bold text-ink-60">
                {fa ? "کد مکان گوگل" : "Google plus code"}{" "}
                <span className="font-latin font-black text-[var(--cyan)]">{content.contact.plusCode}</span>
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
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/14 bg-ink/[0.07] px-3 py-2.5 text-xs font-black text-ink transition hover:border-aqua-200/34 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
      >
        <ExternalLink size={17} />
        {fa ? "باز کردن نقشه" : "Open map"}
      </a>
      <a
        href={content.contact.directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="liquid-button inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black text-ink sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
      >
        <Navigation size={17} />
        {fa ? "مسیریابی" : "Directions"}
      </a>
    </>
  );
}

// Drawn street plan under the live map: it is what visitors see while Google
// Maps loads, or if the embed is blocked on their network.
function MapBackdrop({ fa }: { fa: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 600 520"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="map-glow" cx="50%" cy="46%" r="55%">
          <stop offset="0" stopColor="rgba(214,174,101,0.18)" />
          <stop offset="1" stopColor="rgba(214,174,101,0)" />
        </radialGradient>
        <pattern id="map-blocks" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <rect width="46" height="46" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="600" height="520" fill="#0b1014" />
      <rect width="600" height="520" fill="url(#map-blocks)" />
      <path d="M40 470 C150 420 210 330 300 300 S470 170 590 120" fill="none" stroke="rgba(125,220,232,0.08)" strokeWidth="26" strokeLinecap="round" />
      <ellipse cx="455" cy="395" rx="78" ry="46" fill="rgba(110,231,183,0.06)" />
      <path d="M-20 250 L620 205" stroke="rgba(214,174,101,0.38)" strokeWidth="9" strokeLinecap="round" />
      <path d="M-20 250 L620 205" stroke="rgba(255,236,196,0.5)" strokeWidth="1.5" strokeDasharray="10 12" />
      <path d="M300 -20 L282 540" stroke="rgba(255,255,255,0.16)" strokeWidth="6" />
      <path d="M120 -20 L160 540 M470 -20 L430 540 M-20 400 L620 360 M-20 110 L620 70" stroke="rgba(255,255,255,0.09)" strokeWidth="3" />
      <rect width="600" height="520" fill="url(#map-glow)" />
      <text x="470" y="196" fill="rgba(255,236,196,0.62)" fontSize="15" fontWeight="700" textAnchor="middle" transform="rotate(-4 470 196)">
        {fa ? "بلوار جهاد" : "Jahad Blvd"}
      </text>
      <text x="96" y="478" fill="rgba(255,255,255,0.3)" fontSize="13" fontWeight="700" textAnchor="middle">
        {fa ? "کرمان" : "Kerman"}
      </text>
    </svg>
  );
}
