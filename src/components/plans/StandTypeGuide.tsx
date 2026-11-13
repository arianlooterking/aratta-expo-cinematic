"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  KIMEX_2025_MIN_AREA,
  standBuilds,
  standKinds,
  standOpenSides,
  standSizes,
  type StandBuild,
  type StandKind,
} from "@/data/plans";

// Drawing units: 10 per metre. The canvas is 18 x 12 m, enough for the
// largest preset (12 x 6 m) with a 3 m aisle on every side, so every size is
// drawn at the same scale and can be compared directly.
const U = 10;
const W = 18 * U;
const H = 12 * U;
const AISLE = 3 * U;

const num = (fa: boolean, n: number) => (fa ? n.toLocaleString("fa-IR") : String(n));

export function StandTypeGuide({ lang }: { lang: "fa" | "en" }) {
  const fa = lang === "fa";
  const id = `stg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [kind, setKind] = useState<StandKind>("corner");
  const [build, setBuild] = useState<StandBuild>("shell");
  const [size, setSize] = useState(3);
  // In the KIMEX 2025 form island stands were space only, so the guide does not draw a shell island.
  const effectiveBuild: StandBuild = kind === "island" ? "space" : build;
  const { w, d } = standSizes[size];
  const area = w * d;
  const kindInfo = standKinds.find((k) => k.id === kind)!;
  const buildInfo = standBuilds.find((b) => b.id === effectiveBuild)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
      <div className="min-w-0">
        <div className="grid gap-4">
          <Choice
            label={fa ? "نوع غرفه" : "Stand type"}
            options={standKinds.map((k) => ({ id: k.id, label: k.name[lang], hint: k.sides[lang] }))}
            value={kind}
            onChange={(v) => setKind(v as StandKind)}
          />
          <Choice
            label={fa ? "غرفه" : "Build"}
            options={standBuilds.map((b) => ({ id: b.id, label: b.name[lang], disabled: kind === "island" && b.id === "shell" }))}
            value={effectiveBuild}
            onChange={(v) => setBuild(v as StandBuild)}
          />
          <Choice
            label={fa ? "ابعاد (متر)" : "Size (metres)"}
            options={standSizes.map((s, i) => ({ id: String(i), label: `${num(fa, s.w)} × ${num(fa, s.d)}`, latin: !fa }))}
            value={String(size)}
            onChange={(v) => setSize(Number(v))}
            compact
          />
        </div>

        <figure className="mt-5 overflow-hidden rounded-[1.6rem] border border-ink/12 bg-shade/30 p-2 sm:p-3">
          <StandDrawing id={id} fa={fa} kind={kind} build={effectiveBuild} w={w} d={d} />
          <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 pb-1 pt-3 text-xs text-ink-60">
            <Legend swatch="bg-[color-mix(in_srgb,var(--carpet)_30%,transparent)] border-[var(--gold)]" label={fa ? "غرفه شما" : "Your stand"} />
            <Legend swatch="bg-ink/[0.03] border-ink/20" label={fa ? "راهرو (۳ متر)" : "Aisle (3 m)"} />
            <Legend swatch="bg-[repeating-linear-gradient(45deg,var(--border)_0_1px,transparent_1px_5px)] border-ink/20" label={fa ? "غرفه‌های همسایه" : "Neighbouring stands"} />
            <span className="ms-auto">{fa ? "مقیاس: هر خانه ۱ متر" : "Scale: each square is 1 m"}</span>
          </figcaption>
        </figure>
      </div>

      <div className="grid gap-4">
        <article className="glass rounded-[1.6rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-2xl font-black text-ink">
              {kindInfo.name[lang]} <span className="text-base font-bold text-[var(--cyan)]">· {kindInfo.sides[lang]}</span>
            </h3>
            <span className={cn("rounded-full border border-gilt-200/30 bg-gilt-200/10 px-3 py-1 text-sm font-black text-[var(--gold)]", !fa && "font-latin")}>
              <bdi dir="ltr">
                {num(fa, w)} × {num(fa, d)}
              </bdi>{" "}
              = {num(fa, area)} {fa ? "متر مربع" : "m²"}
            </span>
          </div>
          <ul className="mt-4 grid gap-2.5 text-sm leading-7 text-ink-72">
            {kindInfo.points.map((p) => (
              <li key={p.en} className="flex gap-2">
                <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--cyan)]" />
                <span>{p[lang]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-2xl border border-ink/10 bg-shade/24 p-4">
            <div className="font-black text-ink">{buildInfo.name[lang]}</div>
            <p className="mt-1 text-sm leading-7 text-ink-68">{buildInfo.summary[lang]}</p>
            <ul className="mt-2 grid gap-2 text-sm leading-7 text-ink-62">
              {buildInfo.points.map((p) => (
                <li key={p.en} className="flex gap-2">
                  <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                  <span>{p[lang]}</span>
                </li>
              ))}
            </ul>
          </div>
          {area < KIMEX_2025_MIN_AREA ? (
            <p className="mt-4 flex gap-2 text-sm leading-7 text-ink-66">
              <Info size={16} className="mt-1.5 shrink-0 text-[var(--gold)]" />
              {fa
                ? `این اندازه کمتر از حداقل ${num(fa, KIMEX_2025_MIN_AREA)} متر مربعی است که فرم KIMEX 2025 برای فضای سالن و فضای باز تعیین کرده بود.`
                : `This is below the ${KIMEX_2025_MIN_AREA} m² starting size the KIMEX 2025 form set for hall space and open-air space.`}
            </p>
          ) : null}
          {kind === "island" ? (
            <p className="mt-4 flex gap-2 text-sm leading-7 text-ink-66">
              <Info size={16} className="mt-1.5 shrink-0 text-[var(--gold)]" />
              {fa ? "غرفه جزیره در این راهنما فقط به صورت فضای خام نشان داده می‌شود، مطابق فرم KIMEX 2025." : "Island stands are shown as bare space only, as in the KIMEX 2025 form."}
            </p>
          ) : null}
          <Link
            href={`/${lang}/registration#booth-request`}
            className="liquid-button mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 font-black text-ink"
          >
            <ArrowUpRight size={18} />
            {fa ? "همین را در درخواست غرفه بنویسید" : "Describe it in a booth request"}
          </Link>
        </article>
        <p className="flex gap-2 rounded-2xl border border-ink/10 bg-ink/[0.03] p-4 text-sm leading-7 text-ink-62">
          <Info size={17} className="mt-1 shrink-0 text-[var(--cyan)]" />
          {fa
            ? "این یک راهنمای تصویری است، نه نقشه تخصیص و نه فهرست قیمت. نوع، اندازه و جای غرفه فقط در قرارداد با دفتر اَرَتَ قطعی می‌شود و شماره سالن و غرفه را برگزارکننده روی فرم ثبت می‌کند."
            : "This is a visual guide, not an allocation and not a price list. Stand type, size and position are only confirmed in a contract with the Aratta office, and the organiser fills in the hall and stand number on the form."}
        </p>
      </div>
    </div>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  options: Array<{ id: string; label: string; hint?: string; disabled?: boolean; latin?: boolean }>;
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      <div className="mb-2 text-xs font-black text-[var(--gold)]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={o.disabled}
              onClick={() => onChange(o.id)}
              className={cn(
                "min-h-11 rounded-2xl border text-start transition disabled:cursor-not-allowed disabled:opacity-40",
                compact ? "px-3 py-2 text-sm font-bold" : "px-4 py-2",
                o.latin && "font-latin",
                active ? "border-gilt-200/50 bg-gilt-200/14 text-ink" : "border-ink/12 bg-ink/[0.04] text-ink-72 hover:border-ink/26",
              )}
            >
              <span dir={compact ? "ltr" : undefined} className={cn("block", !compact && "text-sm font-black")}>
                {o.label}
              </span>
              {o.hint ? <span className="block text-xs text-ink-55">{o.hint}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={cn("h-3.5 w-5 rounded-[4px] border", swatch)} />
      {label}
    </span>
  );
}

function StandDrawing({ id, fa, kind, build, w, d }: { id: string; fa: boolean; kind: StandKind; build: StandBuild; w: number; d: number }) {
  const sw = w * U;
  const sd = d * U;
  const sx = (W - sw) / 2;
  const sy = (H - sd) / 2;
  // Sides in order front (towards the viewer), end, back, start. "End" is the
  // reading end of the line: left in Persian, right in English.
  const [front, endSide, back, startSide] = standOpenSides[kind];
  const right = fa ? startSide : endSide;
  const left = fa ? endSide : startSide;
  const grid: string[] = [];
  for (let x = sx + U; x < sx + sw; x += U) grid.push(`M${x} ${sy}V${sy + sd}`);
  for (let y = sy + U; y < sy + sd; y += U) grid.push(`M${sx} ${y}H${sx + sw}`);
  const closed: string[] = [];
  if (!front) closed.push(`M${sx} ${sy + sd}H${sx + sw}`);
  if (!back) closed.push(`M${sx} ${sy}H${sx + sw}`);
  if (!left) closed.push(`M${sx} ${sy}V${sy + sd}`);
  if (!right) closed.push(`M${sx + sw} ${sy}V${sy + sd}`);
  const open: string[] = [];
  if (front) open.push(`M${sx} ${sy + sd}H${sx + sw}`);
  if (back) open.push(`M${sx} ${sy}H${sx + sw}`);
  if (left) open.push(`M${sx} ${sy}V${sy + sd}`);
  if (right) open.push(`M${sx + sw} ${sy}V${sy + sd}`);
  // Spotlights along the back wall of a shell stand, one per 1.5 m.
  const spots: number[] = [];
  for (let x = sx + 7.5; x < sx + sw; x += 15) spots.push(x);
  const label = { fontFamily: fa ? "var(--font-persian), Tahoma, sans-serif" : "var(--font-geist-sans), Inter, Arial, sans-serif" };
  const halo = { paintOrder: "stroke" as const, stroke: "var(--background)", strokeWidth: 2.4, strokeLinejoin: "round" as const };
  const n = (v: number) => num(fa, v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={fa ? `نقشه غرفه ${n(w)} در ${n(d)} متر` : `Plan of a ${w} by ${d} m stand`}>
      <defs>
        <pattern id={`${id}-hatch`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V4" stroke="var(--ink)" strokeOpacity="0.16" strokeWidth="0.6" />
        </pattern>
        <pattern id={`${id}-build`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <path d="M0 0V3" stroke="var(--gold)" strokeOpacity="0.45" strokeWidth="0.45" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill={`url(#${id}-hatch)`} />
      {/* Aisles run the full length of the hall along every open side. */}
      <g fill="var(--background)">
        {front ? <rect x="0" y={sy + sd} width={W} height={AISLE} /> : null}
        {back ? <rect x="0" y={sy - AISLE} width={W} height={AISLE} /> : null}
        {left ? <rect x={sx - AISLE} y="0" width={AISLE} height={H} /> : null}
        {right ? <rect x={sx + sw} y="0" width={AISLE} height={H} /> : null}
      </g>
      <g fill="var(--ink)" fillOpacity="0.03">
        {front ? <rect x="0" y={sy + sd} width={W} height={AISLE} /> : null}
        {back ? <rect x="0" y={sy - AISLE} width={W} height={AISLE} /> : null}
        {left ? <rect x={sx - AISLE} y="0" width={AISLE} height={H} /> : null}
        {right ? <rect x={sx + sw} y="0" width={AISLE} height={H} /> : null}
      </g>
      {/* The stand. */}
      <rect x={sx} y={sy} width={sw} height={sd} fill="var(--background)" />
      {build === "shell" ? (
        <rect x={sx} y={sy} width={sw} height={sd} fill="var(--carpet)" fillOpacity="0.22" />
      ) : (
        <rect x={sx} y={sy} width={sw} height={sd} fill={`url(#${id}-build)`} />
      )}
      <path d={grid.join("")} stroke="var(--ink)" strokeOpacity="0.14" strokeWidth="0.3" fill="none" />
      {build === "shell" ? (
        <>
          <path d={closed.join("")} stroke="var(--gold)" strokeWidth="1.6" fill="none" strokeLinecap="square" />
          <path d={open.join("")} stroke="var(--cyan)" strokeWidth="0.7" strokeDasharray="2.4 1.6" fill="none" />
          {!back
            ? spots.map((x) => <circle key={x} cx={x} cy={sy + 2.6} r="0.9" fill="var(--gold)" />)
            : null}
          {front ? (
            <text x={sx + sw / 2} y={sy + sd - 2.6} textAnchor="middle" fontSize="3.4" fontWeight="700" fill="var(--cyan)" style={label}>
              {fa ? "تابلو نام شرکت" : "Company name board"}
            </text>
          ) : null}
        </>
      ) : (
        <path d={`M${sx} ${sy}H${sx + sw}V${sy + sd}H${sx}Z`} stroke="var(--gold)" strokeWidth="0.9" strokeDasharray="3 1.8" fill="none" />
      )}
      <text x={sx + sw / 2} y={sy + sd / 2 + 2} textAnchor="middle" fontSize={sd >= 40 ? 7 : 5.4} fontWeight="900" fill="var(--ink)" style={{ ...label, ...halo }}>
        {fa ? `${n(w * d)} متر مربع` : `${w * d} m²`}
      </text>
      {/* Dimensions: width above the stand, depth beside it. */}
      <g stroke="var(--ink)" strokeOpacity="0.55" strokeWidth="0.4" fill="none">
        <path d={`M${sx} ${sy - 4}H${sx + sw}M${sx} ${sy - 6}V${sy - 2}M${sx + sw} ${sy - 6}V${sy - 2}`} />
        <path d={`M${sx + sw + 4} ${sy}V${sy + sd}M${sx + sw + 2} ${sy}H${sx + sw + 6}M${sx + sw + 2} ${sy + sd}H${sx + sw + 6}`} />
      </g>
      <g fontSize="4" fontWeight="700" fill="var(--ink)" style={{ ...label, ...halo }}>
        <text x={sx + sw / 2} y={sy - 6.5} textAnchor="middle">
          {fa ? `${n(w)} متر` : `${w} m`}
        </text>
        <text x={sx + sw + 7} y={sy + sd / 2 + 1.4} textAnchor="start">
          {fa ? `${n(d)} متر` : `${d} m`}
        </text>
      </g>
      {front ? (
        <text x={W / 2} y={sy + sd + AISLE / 2 + 1.6} textAnchor="middle" fontSize="4" fontWeight="700" fill="var(--ink)" fillOpacity="0.62" style={label}>
          {fa ? "راهرو" : "Aisle"}
        </text>
      ) : null}
      {/* Scale bar, 3 m. */}
      <g transform={`translate(${fa ? W - 6 - 3 * U : 6} ${H - 6})`}>
        <rect x="0" y="0" width={U} height="1.6" fill="var(--ink)" fillOpacity="0.7" />
        <rect x={U} y="0" width={U} height="1.6" fill="none" stroke="var(--ink)" strokeOpacity="0.7" strokeWidth="0.3" />
        <rect x={2 * U} y="0" width={U} height="1.6" fill="var(--ink)" fillOpacity="0.7" />
        <text x={fa ? 3 * U : 0} y="-1.6" fontSize="3.2" fill="var(--ink)" fillOpacity="0.7" textAnchor={fa ? "end" : "start"} style={label}>
          {fa ? "۳ متر" : "3 m"}
        </text>
      </g>
    </svg>
  );
}
