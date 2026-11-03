"use client";

import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Columns3,
  Copy,
  Grid3x3,
  Lock,
  LockOpen,
  Minus,
  Plus,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { num, sep } from "@/lib/portal/format";
import type { Rect } from "@/lib/portal/geometry";
import { featureLabel } from "@/lib/portal/i18n";
import { clearWidth, columnsAlong, repeatRect, resize, snapToWall, turn, wallOf, type Wall } from "@/lib/portal/structure";
import type { FeatureKind, Hall, HallFeature, Patch } from "@/lib/portal/types";
import { usePortal } from "../PortalProvider";
import { Button, Field, IconButton, Input, Pill, Segmented, Select } from "../ui";

const KINDS: FeatureKind[] = ["aisle", "column", "wall", "entrance", "door", "loading", "zone", "stage", "service", "utility", "label"];
const WALL_KINDS = new Set<FeatureKind>(["entrance", "door", "loading"]);

type NewFeature = Partial<HallFeature> & Rect & { kind: FeatureKind };

export function FeaturePanel({
  feature,
  hall,
  locked,
  onClose,
  onUpdate,
  onDelete,
  onLock,
  onDuplicate,
  onAddFeatures,
}: {
  feature: HallFeature;
  hall: Hall | null;
  locked: boolean;
  onClose: () => void;
  onUpdate: (patch: Patch<"hall_features">) => void;
  onDelete: () => void;
  onLock: (locked: boolean) => void;
  onDuplicate: () => void;
  onAddFeatures: (rows: NewFeature[]) => string[] | undefined;
}) {
  const { lang, can, toast } = usePortal();
  const fa = lang === "fa";
  const size = hall ?? { width_m: 1000, depth_m: 1000 };
  const step = Math.max(Math.min(hall?.grid_m || 0.5, 1), 0.1);
  const rect: Rect = { x: feature.x, y: feature.y, width: feature.width, depth: feature.depth };
  const editable = can.edit;
  const set = (next: Rect) => {
    const patch: Patch<"hall_features"> = {};
    (["x", "y", "width", "depth"] as const).forEach((k) => {
      if (Math.abs(next[k] - rect[k]) > 0.001) patch[k] = next[k];
    });
    if (Object.keys(patch).length) onUpdate(patch);
  };
  const name = feature.label_fa || feature.label_en ? (fa ? feature.label_fa || feature.label_en : feature.label_en || feature.label_fa) : null;

  return (
    <div className="flex h-full min-h-0 flex-col" key={feature.id + feature.updated_at}>
      <div className="flex items-center gap-3 border-b border-p-line px-4 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{name ?? featureLabel[feature.kind][lang]}</h2>
          <p className="text-xs text-p-ink-3">
            {featureLabel[feature.kind][lang]}{sep(lang)}{num(lang, feature.width, 1)} × {num(lang, feature.depth, 1)} {fa ? "متر" : "m"}
          </p>
        </div>
        {locked ? (
          <Pill tone="gold">
            <Lock className="size-3" />
            {fa ? "قفل" : "Locked"}
          </Pill>
        ) : null}
        <IconButton label={fa ? "بستن" : "Close"} size="sm" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>

      <div className="thin-scroll grid min-h-0 flex-1 content-start gap-5 overflow-y-auto p-4">
        {editable ? (
          <button
            type="button"
            data-tour="feature-lock"
            onClick={() => onLock(!locked)}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-3 text-start transition-colors",
              locked ? "border-p-gold/40 bg-p-gold-soft" : "border-p-line bg-p-surface-2 hover:border-p-line-strong",
            )}
          >
            <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl", locked ? "bg-p-gold text-white" : "bg-p-sunken text-p-ink-2")}>
              {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
            </span>
            <span className="grid gap-0.5">
              <span className="text-sm font-semibold">{locked ? (fa ? "قفل است" : "Locked in place") : fa ? "قفل نیست" : "Not locked"}</span>
              <span className="text-xs leading-relaxed text-p-ink-3">
                {locked
                  ? fa
                    ? "روی نقشه جابجا یا کشیده نمی شود. اندازه ها را هنوز می توانید دقیق همین جا وارد کنید. برای باز کردن قفل بزنید."
                    : "It can't be dragged or resized on the map. You can still type exact sizes here. Tap to unlock."
                  : fa
                    ? "برای جلوگیری از جابجایی تصادفی، ساختار ثابت سالن را قفل کنید."
                    : "Lock fixed structure so nobody moves it by accident."}
              </span>
            </span>
          </button>
        ) : null}

        <section className="grid gap-3">
          <h3 className="text-[13px] font-semibold text-p-ink-2">{fa ? "اندازه و جای دقیق" : "Exact size and position"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Stepper label={fa ? "عرض" : "Width"} value={rect.width} min={0.1} step={step} disabled={!editable} onChange={(v) => set(resize(rect, { width: v }, size))} />
            <Stepper label={fa ? "عمق" : "Depth"} value={rect.depth} min={0.1} step={step} disabled={!editable} onChange={(v) => set(resize(rect, { depth: v }, size))} />
            <Stepper label={fa ? "فاصله از چپ" : "From left"} value={rect.x} min={0} step={step} disabled={!editable} onChange={(v) => set(resize(rect, { x: v }, size))} />
            <Stepper label={fa ? "فاصله از بالا" : "From top"} value={rect.y} min={0} step={step} disabled={!editable} onChange={(v) => set(resize(rect, { y: v }, size))} />
          </div>
          {feature.kind === "aisle" ? (
            <p className="rounded-xl bg-p-info-soft px-3 py-2 text-xs text-p-info">
              {fa ? "عرض عبور راهرو" : "Walking width"}: <b>{num(lang, clearWidth(rect), 1)} {fa ? "متر" : "m"}</b>
              {clearWidth(rect) < 2.5 ? (fa ? "، کمتر از ۲٫۵ متر برای ازدحام نمایشگاه تنگ است" : " · under 2.5 m is tight for show-day crowds") : null}
            </p>
          ) : null}
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={<RotateCw className="size-4" />} onClick={() => set(turn(rect, size))}>
                {fa ? "چرخش ۹۰ درجه" : "Turn 90°"}
              </Button>
              <Button size="sm" icon={<Copy className="size-4" />} onClick={onDuplicate}>
                {fa ? "کپی" : "Duplicate"}
              </Button>
            </div>
          ) : null}
        </section>

        {editable && WALL_KINDS.has(feature.kind) && hall ? <WallPicker rect={rect} hall={hall} onPick={(w) => set(snapToWall(rect, w, hall))} /> : null}

        {editable && feature.kind === "aisle" ? (
          <ColumnsAlong
            aisle={rect}
            onAdd={(rects) => {
              const ids = onAddFeatures(rects.map((r) => ({ ...r, kind: "column" as const, style: { locked: true } })));
              if (ids?.length) toast(fa ? `${num(lang, ids.length)} ستون اضافه و قفل شد` : `${ids.length} columns added and locked`);
            }}
          />
        ) : null}

        {editable && hall ? (
          <Repeat
            kind={feature.kind}
            rect={rect}
            step={step}
            onAdd={(copies, spacing, direction) => {
              const rects = repeatRect(rect, copies, spacing, direction, hall);
              if (!rects.length) {
                toast(fa ? "جای کافی در سالن نیست" : "There's no room left in the hall", "error");
                return;
              }
              const ids = onAddFeatures(
                rects.map((r) => ({ ...r, kind: feature.kind, label_fa: feature.label_fa, label_en: feature.label_en, style: locked ? { locked: true } : {} })),
              );
              if (ids?.length) toast(fa ? `${num(lang, ids.length)} مورد اضافه شد` : `${ids.length} added`);
            }}
          />
        ) : null}

        <section className="grid gap-3">
          <h3 className="text-[13px] font-semibold text-p-ink-2">{fa ? "نام و نوع" : "Name and type"}</h3>
          <Field label={fa ? "نوع" : "Type"}>
            <Select value={feature.kind} disabled={!editable} onChange={(e) => onUpdate({ kind: e.target.value as FeatureKind })}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {featureLabel[k][lang]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={fa ? "برچسب فارسی" : "Label (Persian)"}>
            <Input
              defaultValue={feature.label_fa ?? ""}
              dir="rtl"
              disabled={!editable}
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== feature.label_fa) onUpdate({ label_fa: v });
              }}
            />
          </Field>
          <Field label={fa ? "برچسب انگلیسی" : "Label (English)"}>
            <Input
              defaultValue={feature.label_en ?? ""}
              dir="ltr"
              disabled={!editable}
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== feature.label_en) onUpdate({ label_en: v });
              }}
            />
          </Field>
        </section>

        {editable ? (
          <Button tone="danger" className="justify-self-start" icon={<Trash2 className="size-4" />} onClick={onDelete}>
            {fa ? "حذف" : "Delete"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** A number box with big minus and plus buttons, usable with a thumb. */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  digits = 2,
  disabled,
  suffix,
}: {
  label: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  digits?: number;
  disabled?: boolean;
  suffix?: string;
}) {
  const { lang } = usePortal();
  const clamp = (v: number) => {
    const r = Math.round(v * 10 ** digits) / 10 ** digits;
    return Math.max(min, max === undefined ? r : Math.min(max, r));
  };
  const commit = (raw: string) => {
    const v = Number(raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٫,]/g, "."));
    if (Number.isFinite(v) && clamp(v) !== value) onChange(clamp(v));
  };
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-medium text-p-ink-2">{label}</span>
      <div className="flex h-10 items-stretch overflow-hidden rounded-xl border border-p-line bg-p-surface focus-within:border-p-brand">
        <button
          type="button"
          aria-label={lang === "fa" ? "کمتر" : "Less"}
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="grid w-9 shrink-0 place-items-center text-p-ink-2 hover:bg-p-sunken disabled:opacity-35"
        >
          <Minus className="size-4" />
        </button>
        <input
          key={value}
          inputMode="decimal"
          dir="ltr"
          disabled={disabled}
          defaultValue={String(value)}
          aria-label={typeof label === "string" ? label : undefined}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onChange(clamp(value + step));
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              onChange(clamp(value - step));
            }
          }}
          className="w-full min-w-0 bg-transparent text-center text-sm tabular-nums focus:outline-none disabled:opacity-60"
        />
        {suffix ? <span className="grid place-items-center pe-1 text-xs text-p-ink-3">{suffix}</span> : null}
        <button
          type="button"
          aria-label={lang === "fa" ? "بیشتر" : "More"}
          disabled={disabled || (max !== undefined && value >= max)}
          onClick={() => onChange(clamp(value + step))}
          className="grid w-9 shrink-0 place-items-center text-p-ink-2 hover:bg-p-sunken disabled:opacity-35"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function WallPicker({ rect, hall, onPick }: { rect: Rect; hall: Hall; onPick: (wall: Wall) => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const current = wallOf(rect, hall);
  const walls: Array<{ wall: Wall; label: string; icon: React.ReactNode }> = [
    { wall: "top", label: fa ? "بالا" : "Top", icon: <ArrowUpToLine className="size-4" /> },
    { wall: "bottom", label: fa ? "پایین" : "Bottom", icon: <ArrowDownToLine className="size-4" /> },
    { wall: "left", label: fa ? "چپ" : "Left", icon: <ArrowLeftToLine className="size-4" /> },
    { wall: "right", label: fa ? "راست" : "Right", icon: <ArrowRightToLine className="size-4" /> },
  ];
  return (
    <section className="grid gap-2">
      <h3 className="text-[13px] font-semibold text-p-ink-2">{fa ? "روی کدام دیوار باشد؟" : "Which wall is it on?"}</h3>
      <div className="grid grid-cols-4 gap-2">
        {walls.map((w) => (
          <button
            key={w.wall}
            type="button"
            aria-pressed={current === w.wall}
            onClick={() => onPick(w.wall)}
            className={cn(
              "grid h-14 place-items-center gap-0.5 rounded-xl border text-xs font-medium transition-colors",
              current === w.wall ? "border-p-brand bg-p-brand-soft text-p-brand" : "border-p-line hover:border-p-line-strong",
            )}
          >
            {w.icon}
            {w.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-p-ink-3">{fa ? "ورودی به دیوار می چسبد و طول آن در امتداد دیوار قرار می گیرد." : "It moves flush to that wall, long side along the wall."}</p>
    </section>
  );
}

function ColumnsAlong({ aisle, onAdd }: { aisle: Rect; onAdd: (rects: Rect[]) => void }) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const long = Math.max(aisle.width, aisle.depth);
  const [count, setCount] = useState(Math.max(2, Math.round(long / 9)));
  const [size, setSize] = useState(0.6);
  const [placement, setPlacement] = useState<"centre" | "edges">("centre");
  const rects = columnsAlong(aisle, count, size, placement);
  return (
    <section className="grid gap-3 rounded-2xl border border-p-line p-3">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-p-ink-2">
        <Columns3 className="size-4" />
        {fa ? "ستون در طول این راهرو" : "Columns along this corridor"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <Stepper label={fa ? "تعداد" : "How many"} value={count} min={1} max={60} digits={0} onChange={setCount} />
        <Stepper label={fa ? "اندازه ستون (متر)" : "Column size (m)"} value={size} min={0.2} max={2} step={0.1} onChange={setSize} />
      </div>
      <Segmented
        size="sm"
        value={placement}
        onChange={setPlacement}
        options={[
          { value: "centre", label: fa ? "وسط راهرو" : "Centre line" },
          { value: "edges", label: fa ? "دو لبه" : "Both edges" },
        ]}
      />
      <Button size="sm" tone="quiet" className="justify-self-start" icon={<Plus className="size-4" />} onClick={() => onAdd(rects)}>
        {fa ? `افزودن ${num(lang, rects.length)} ستون` : `Add ${rects.length} columns`}
      </Button>
    </section>
  );
}

function Repeat({
  kind,
  rect,
  step,
  onAdd,
}: {
  kind: FeatureKind;
  rect: Rect;
  step: number;
  onAdd: (copies: number, spacing: number, direction: "across" | "down") => void;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [copies, setCopies] = useState(kind === "column" ? 4 : 1);
  const base = direction === "across" ? rect.width : rect.depth;
  const [spacing, setSpacing] = useState(kind === "column" ? 9 : Math.max(base + step, 1));
  return (
    <details className="group rounded-2xl border border-p-line p-3" open={kind === "column"}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-p-ink-2">
        <Grid3x3 className="size-4" />
        {kind === "column" ? (fa ? "تکرار ستون (شبکه ستون ها)" : "Repeat column (column grid)") : fa ? "تکرار" : "Repeat"}
      </summary>
      <div className="mt-3 grid gap-3">
        <Segmented
          size="sm"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "across", label: fa ? "به سمت راست" : "To the right" },
            { value: "down", label: fa ? "به سمت پایین" : "Downwards" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Stepper label={fa ? "تعداد کپی" : "Copies"} value={copies} min={1} max={60} digits={0} onChange={setCopies} />
          <Stepper label={fa ? "فاصله مرکز تا مرکز" : "Centre to centre (m)"} value={spacing} min={0.2} step={step} onChange={setSpacing} />
        </div>
        <Button size="sm" tone="quiet" className="justify-self-start" icon={<Plus className="size-4" />} onClick={() => onAdd(copies, spacing, direction)}>
          {fa ? "افزودن" : "Add copies"}
        </Button>
      </div>
    </details>
  );
}
