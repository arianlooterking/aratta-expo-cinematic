"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import {
  gregorianMonths,
  isoToJalali,
  isoToParts,
  jalaliMonths,
  monthGrid,
  shiftMonth,
  todayIso,
  viewOf,
  weekdayInitials,
  type CalendarSystem,
} from "@/lib/jalali";
import { date as formatDate, num } from "@/lib/portal/format";
import { usePortal } from "./PortalProvider";

type View = { year: number; month: number };

/**
 * The portal's date field. Persian staff pick from the Persian (shamsi)
 * calendar; the stored value is still a plain Gregorian day (yyyy-mm-dd), so
 * the database, sorting and reports don't change. A toggle inside the
 * calendar switches to Gregorian for dates on foreign documents.
 *
 * Works controlled (value + onChange) or inside a plain form (name +
 * defaultValue, read back with FormData).
 */
export function DatePicker({
  value: controlled,
  defaultValue = null,
  onChange,
  name,
  disabled,
  placeholder,
  clearable = true,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const [inner, setInner] = useState<string | null>(defaultValue);
  const value = controlled !== undefined ? controlled : inner;
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const set = useCallback(
    (next: string | null) => {
      if (controlled === undefined) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );

  const valid = value && isoToParts(value) ? value : null;
  const label = valid ? dayLabel(lang, valid, fa ? "persian" : "gregorian") : (placeholder ?? (fa ? "انتخاب تاریخ" : "Pick a date"));

  return (
    <div className={cn("relative min-w-0", className)}>
      {name ? <input type="hidden" name={name} value={valid ?? ""} /> : null}
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-p-line bg-p-surface px-3 text-start text-sm transition-colors hover:border-p-line-strong focus:border-p-brand focus:outline-none disabled:opacity-60",
          open && "border-p-brand",
          valid ? "text-p-ink" : "text-p-ink-3",
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-p-ink-3" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
      {open ? (
        <CalendarPopover
          anchor={trigger}
          value={valid}
          clearable={clearable}
          onPick={(iso) => {
            set(iso);
            setOpen(false);
            trigger.current?.focus();
          }}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

const noSubscribe = () => () => {};

function usePortalHost() {
  return useSyncExternalStore(
    noSubscribe,
    () => document.querySelector<HTMLElement>(".portal") ?? document.body,
    () => null,
  );
}

const WIDTH = 296;

function CalendarPopover({
  anchor,
  value,
  clearable,
  onPick,
  onClose,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>;
  value: string | null;
  clearable: boolean;
  onPick: (iso: string | null) => void;
  onClose: () => void;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const host = usePortalHost();
  const panel = useRef<HTMLDivElement>(null);
  const [system, setSystem] = useState<CalendarSystem>(fa ? "persian" : "gregorian");
  const today = todayIso();
  const [view, setView] = useState<View>(() => viewOf(fa ? "persian" : "gregorian", value ?? today));
  const [mode, setMode] = useState<"days" | "months">("days");
  // Fixed to the viewport so the sheet's scroll area never clips it; flips
  // above the field when there's no room below.
  useLayoutEffect(() => {
    const place = () => {
      const el = anchor.current;
      const box = panel.current;
      if (!el || !box) return;
      const r = el.getBoundingClientRect();
      const height = box.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.min(WIDTH, vw - 16);
      // Line up with the field's start edge (its right edge in Persian).
      let left = fa ? r.right - width : r.left;
      left = Math.max(8, Math.min(left, vw - width - 8));
      let top = r.bottom + 6;
      if (top + height > vh - 8 && r.top - height - 6 > 8) top = r.top - height - 6;
      top = Math.max(8, Math.min(top, vh - height - 8));
      box.style.top = `${top}px`;
      box.style.left = `${left}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, fa, mode, view, host]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || anchor.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [anchor, onClose]);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("[data-selected=true], [data-today=true], button")?.focus();
  }, []);

  if (!host) return null;

  const months = system === "persian" ? jalaliMonths[lang] : gregorianMonths[lang];
  const cells = monthGrid(system, view.year, view.month);
  const yearText = fa ? num(lang, view.year).replace(/٬|,/g, "") : String(view.year);
  const otherSystem: CalendarSystem = system === "persian" ? "gregorian" : "persian";

  const switchSystem = (next: CalendarSystem) => {
    setSystem(next);
    setView(viewOf(next, value ?? today));
  };

  // In a right-to-left layout "next month" sits on the left.
  const PrevIcon = fa ? ChevronRight : ChevronLeft;
  const NextIcon = fa ? ChevronLeft : ChevronRight;

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label={fa ? "تقویم" : "Calendar"}
      dir={fa ? "rtl" : "ltr"}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          // Keep the surrounding sheet open: only the calendar closes.
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          onClose();
        }
      }}
      style={{ width: `min(${WIDTH}px, calc(100vw - 16px))` }}
      className="animate-fade fixed z-[70] rounded-2xl border border-p-line bg-p-surface p-3 text-p-ink shadow-[var(--p-shadow-lg)]"
    >
      <div className="mb-2 flex items-center gap-1">
        <button
          type="button"
          aria-label={fa ? "ماه قبل" : "Previous month"}
          onClick={() => setView((v) => shiftMonth(v, mode === "months" ? -12 : -1))}
          className="grid size-8 place-items-center rounded-lg text-p-ink-2 hover:bg-p-sunken"
        >
          <PrevIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setMode((m) => (m === "days" ? "months" : "days"))}
          className="h-8 flex-1 rounded-lg text-sm font-semibold hover:bg-p-sunken"
          aria-live="polite"
        >
          {mode === "days" ? `${months[view.month - 1]} ${yearText}` : yearText}
        </button>
        <button
          type="button"
          aria-label={fa ? "ماه بعد" : "Next month"}
          onClick={() => setView((v) => shiftMonth(v, mode === "months" ? 12 : 1))}
          className="grid size-8 place-items-center rounded-lg text-p-ink-2 hover:bg-p-sunken"
        >
          <NextIcon className="size-4" />
        </button>
      </div>

      {mode === "days" ? (
        <div role="grid" className="grid grid-cols-7 gap-0.5 text-center">
          {weekdayInitials[system][lang].map((w, i) => (
            <span key={i} className={cn("pb-1 text-[11px] font-medium text-p-ink-3", system === "persian" && i === 6 && "text-p-danger/80")}>
              {w}
            </span>
          ))}
          {cells.map((cell, i) =>
            cell ? (
              <button
                key={cell.iso}
                type="button"
                data-selected={cell.iso === value}
                data-today={cell.iso === today}
                aria-pressed={cell.iso === value}
                aria-label={formatDate(lang, cell.iso, "long")}
                onClick={() => onPick(cell.iso)}
                className={cn(
                  "tabular grid h-9 place-items-center rounded-lg text-[13px] transition-colors",
                  cell.iso === value
                    ? "bg-p-brand font-semibold text-p-brand-ink"
                    : cell.iso === today
                      ? "font-semibold text-p-brand ring-1 ring-inset ring-p-brand/60 hover:bg-p-brand-soft"
                      : "hover:bg-p-sunken",
                  system === "persian" && i % 7 === 6 && cell.iso !== value && "text-p-danger/80",
                )}
              >
                {fa ? num(lang, cell.day) : cell.day}
              </button>
            ) : (
              <span key={`pad-${i}`} />
            ),
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {months.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setView((v) => ({ year: v.year, month: i + 1 }));
                setMode("days");
              }}
              className={cn(
                "h-10 rounded-lg text-[13px] transition-colors",
                view.month === i + 1 ? "bg-p-brand-soft font-semibold text-p-brand" : "hover:bg-p-sunken",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-p-line pt-2.5">
        <button
          type="button"
          onClick={() => onPick(today)}
          className="h-8 rounded-lg px-2.5 text-[13px] font-medium text-p-brand hover:bg-p-brand-soft"
        >
          {fa ? "امروز" : "Today"}
        </button>
        {clearable && value ? (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] text-p-ink-3 hover:text-p-danger"
          >
            <X className="size-3.5" />
            {fa ? "پاک کردن" : "Clear"}
          </button>
        ) : null}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => switchSystem(otherSystem)}
          className="h-8 rounded-lg px-2.5 text-xs text-p-ink-3 hover:bg-p-sunken hover:text-p-ink"
          title={fa ? "تغییر نوع تقویم" : "Switch calendar"}
        >
          {otherSystem === "gregorian" ? (fa ? "میلادی" : "Gregorian") : fa ? "شمسی" : "Persian"}
        </button>
      </div>
      {value ? <p className="mt-1 text-center text-[11px] text-p-ink-3">{otherCalendarLine(lang, value, system)}</p> : null}
    </div>,
    host,
  );
}

/** "۲۳ آبان ۱۴۰۵" or "14 November 2026": a stored day written in one calendar. */
export function dayLabel(lang: "fa" | "en", iso: string, system: CalendarSystem) {
  const g = isoToParts(iso);
  if (!g) return "";
  const p = system === "persian" ? isoToJalali(iso)! : g;
  const months = system === "persian" ? jalaliMonths[lang] : gregorianMonths[lang];
  if (lang === "en") return `${p.d} ${months[p.m - 1]} ${p.y}`;
  return `${num(lang, p.d)} ${months[p.m - 1]} ${num(lang, p.y).replace(/٬|,/g, "")}`;
}

/** The chosen day written in the calendar that isn't on screen. */
function otherCalendarLine(lang: "fa" | "en", iso: string, showing: CalendarSystem) {
  return dayLabel(lang, iso, showing === "persian" ? "gregorian" : "persian");
}
