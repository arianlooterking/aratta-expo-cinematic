"use client";

import { ChevronDown, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { num } from "@/lib/portal/format";
import { DatePicker } from "./DatePicker";
import { usePortal } from "./PortalProvider";
import { Combobox, Input } from "./ui";

/** Western digits from Persian or Arabic ones, and no grouping marks. */
export function parseDigits(raw: string) {
  return raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٬,\s]/g, "")
    .replace(/٫/g, ".");
}

/** A whole-number amount box that shows thousands separators while you type. */
export function MoneyInput({
  value,
  onChange,
  name,
  autoFocus,
  required,
  placeholder,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  name?: string;
  autoFocus?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const { lang } = usePortal();
  return (
    <div className="grid gap-1">
      <Input
        name={name}
        inputMode="numeric"
        dir="ltr"
        autoFocus={autoFocus}
        required={required}
        placeholder={placeholder}
        value={value == null ? "" : value.toLocaleString("en-US")}
        onChange={(e) => {
          const digits = parseDigits(e.target.value).replace(/[^\d]/g, "");
          onChange(digits ? Number(digits) : null);
        }}
        className="tabular text-end"
      />
      {value ? <span className="text-xs text-p-ink-3">{num(lang, value)}</span> : null}
    </div>
  );
}

/** A field that shows the chosen item and opens a search list to change it. */
export function PickerField<T>({
  value,
  items,
  getKey,
  getLabel,
  getHint,
  onChange,
  placeholder,
  emptyText,
  clearable,
  disabled,
  createLabel,
  onCreate,
}: {
  value: T | null;
  items: readonly T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getHint?: (item: T) => string | null | undefined;
  onChange: (item: T | null) => void;
  placeholder: string;
  emptyText: string;
  clearable?: boolean;
  disabled?: boolean;
  createLabel?: (q: string) => string;
  onCreate?: (q: string) => void;
}) {
  const { lang } = usePortal();
  const [open, setOpen] = useState(false);
  if (open)
    return (
      <div className="grid gap-1.5 rounded-2xl border border-p-brand/40 p-2">
        <Combobox
          autoFocus
          items={items}
          getKey={getKey}
          getLabel={getLabel}
          getHint={getHint}
          placeholder={placeholder}
          emptyText={emptyText}
          createLabel={createLabel}
          onCreate={
            onCreate
              ? (q) => {
                  onCreate(q);
                  setOpen(false);
                }
              : undefined
          }
          onPick={(item) => {
            onChange(item);
            setOpen(false);
          }}
        />
        <button type="button" onClick={() => setOpen(false)} className="justify-self-start px-1 text-xs text-p-ink-3 hover:text-p-ink">
          {lang === "fa" ? "انصراف" : "Cancel"}
        </button>
      </div>
    );
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-p-line bg-p-surface px-3 text-start text-sm transition-colors hover:border-p-line-strong disabled:opacity-60"
      >
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-p-ink-3")}>{value ? getLabel(value) : placeholder}</span>
        {value && getHint?.(value) ? <span className="shrink-0 text-xs text-p-ink-3">{getHint(value)}</span> : null}
        <ChevronDown className="size-4 shrink-0 text-p-ink-3" />
      </button>
      {clearable && value && !disabled ? (
        <button type="button" onClick={() => onChange(null)} aria-label={lang === "fa" ? "پاک کردن" : "Clear"} className="grid size-10 place-items-center rounded-xl text-p-ink-3 hover:bg-p-sunken">
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function isoDay(offset: number, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's date as yyyy-mm-dd in local time. */
export function todayIso() {
  return isoDay(0);
}

/**
 * A date picker with one-tap choices (today, tomorrow, next week...) and the date shown in the
 * reader's calendar, so Persian users see the Jalali date whatever the browser's picker shows.
 */
export function DateQuick({
  value,
  onChange,
  name,
  allowEmpty = true,
  past,
  label,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  name?: string;
  allowEmpty?: boolean;
  /** Offer past days (for payment dates) instead of future ones. */
  past?: boolean;
  label?: ReactNode;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  const chips: Array<[string, string]> = past
    ? [
        [isoDay(0), fa ? "امروز" : "Today"],
        [isoDay(-1), fa ? "دیروز" : "Yesterday"],
        [isoDay(-7), fa ? "هفته پیش" : "A week ago"],
      ]
    : [
        [isoDay(0), fa ? "امروز" : "Today"],
        [isoDay(1), fa ? "فردا" : "Tomorrow"],
        [isoDay(3), fa ? "۳ روز دیگر" : "In 3 days"],
        [isoDay(7), fa ? "هفته بعد" : "Next week"],
        [isoDay(14), fa ? "دو هفته" : "2 weeks"],
      ];
  return (
    <div className="grid gap-1.5">
      {label ? <span className="text-[13px] font-medium text-p-ink-2">{label}</span> : null}
      <div className="flex flex-wrap gap-1.5">
        {chips.map(([v, text]) => (
          <button
            key={text}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={value === v}
            className={cn(
              "h-7 rounded-lg px-2.5 text-xs font-medium transition-colors",
              value === v ? "bg-p-brand text-p-brand-ink" : "bg-p-sunken text-p-ink-2 hover:bg-p-line",
            )}
          >
            {text}
          </button>
        ))}
        {allowEmpty && value ? (
          <button type="button" onClick={() => onChange(null)} className="h-7 rounded-lg px-2 text-xs text-p-ink-3 hover:text-p-danger">
            {fa ? "بدون تاریخ" : "No date"}
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <DatePicker name={name} value={value} onChange={onChange} clearable={allowEmpty} className="w-full max-w-64" />
      </div>
    </div>
  );
}

/** Turns yyyy-mm-dd into an ISO timestamp at a set local hour, for due dates and follow-ups. */
export function dayToIso(day: string | null, hour = 10) {
  if (!day) return null;
  const d = new Date(`${day}T00:00:00`);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** The local yyyy-mm-dd of an ISO timestamp. */
export function isoToDay(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
