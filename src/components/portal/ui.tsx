"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

type ButtonTone = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg";

const buttonTones: Record<ButtonTone, string> = {
  primary: "bg-p-brand text-p-brand-ink hover:brightness-110 shadow-[var(--p-shadow)]",
  secondary: "bg-p-surface text-p-ink border border-p-line hover:border-p-line-strong hover:bg-p-surface-2 shadow-[var(--p-shadow)]",
  ghost: "text-p-ink-2 hover:bg-p-sunken hover:text-p-ink",
  quiet: "bg-p-sunken text-p-ink hover:bg-p-line",
  danger: "bg-p-danger-soft text-p-danger hover:brightness-95",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-3.5 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; size?: ButtonSize; icon?: ReactNode }
>(function Button({ tone = "secondary", size = "md", icon, className, children, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background,color,border,filter] disabled:pointer-events-none disabled:opacity-45",
        buttonTones[tone],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: ButtonTone; size?: "sm" | "md"; active?: boolean }
>(function IconButton({ label, tone = "ghost", size = "md", active, className, children, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl transition-colors disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "size-8" : "size-10",
        active ? "bg-p-brand-soft text-p-brand" : buttonTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-2xl border border-p-line bg-p-surface shadow-[var(--p-shadow)]", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-p-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-[13px] text-p-ink-3">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

type PillTone = "neutral" | "brand" | "ok" | "warn" | "danger" | "info" | "violet" | "gold";
const pillTones: Record<PillTone, string> = {
  neutral: "bg-p-sunken text-p-ink-2",
  brand: "bg-p-brand-soft text-p-brand",
  ok: "bg-p-ok-soft text-p-ok",
  warn: "bg-p-warn-soft text-p-warn",
  danger: "bg-p-danger-soft text-p-danger",
  info: "bg-p-info-soft text-p-info",
  violet: "bg-p-violet-soft text-p-violet",
  gold: "bg-p-gold-soft text-p-gold",
};

export function Pill({ tone = "neutral", className, children }: { tone?: PillTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium", pillTones[tone], className)}>
      {children}
    </span>
  );
}

/** A pill coloured by a map tone (booth status or equipment state). */
export function TonePill({ tone, children, className }: { tone: string; children: ReactNode; className?: string }) {
  return (
    <span data-tone={tone} className={cn("tone-pill inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

export function Progress({ value, tone = "brand", className, label }: { value: number; tone?: "brand" | "ok" | "warn" | "gold" | "info"; className?: string; label?: string }) {
  const color = { brand: "bg-p-brand", ok: "bg-p-ok", warn: "bg-p-warn", gold: "bg-p-gold", info: "bg-p-info" }[tone];
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn("h-2 overflow-hidden rounded-full bg-p-sunken", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-p-sunken", className)} />;
}

export function Empty({ icon, title, hint, action }: { icon?: ReactNode; title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon ? <div className="mb-1 grid size-12 place-items-center rounded-2xl bg-p-sunken text-p-ink-3">{icon}</div> : null}
      <p className="text-[15px] font-semibold text-p-ink">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-p-ink-3">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-p-line bg-p-surface-2 px-1 font-sans text-[11px] text-p-ink-3">
      {children}
    </kbd>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid gap-1.5", className)}>
      <span className="text-[13px] font-medium text-p-ink-2">{label}</span>
      {children}
      {hint ? <span className="text-xs text-p-ink-3">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "h-10 w-full min-w-0 rounded-xl border border-p-line bg-p-surface px-3 text-sm text-p-ink placeholder:text-p-ink-3 transition-colors hover:border-p-line-strong focus:border-p-brand focus:outline-none disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

const compactSelectClass =
  "h-8 w-auto min-w-0 rounded-lg border border-p-line bg-p-surface px-2 text-[13px] text-p-ink transition-colors hover:border-p-line-strong focus:border-p-brand focus:outline-none disabled:opacity-60";

/** A native select. `compact` is the small filter-bar size. */
export function Select({ className, children, compact, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { compact?: boolean }) {
  return (
    <select className={cn(compact ? compactSelectClass : inputClass, "appearance-auto pe-2", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "h-auto min-h-20 py-2 leading-relaxed", className)} {...props} />;
}

/** A segmented control for 2-5 options. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: ReactNode; icon?: ReactNode }>;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-xl bg-p-sunken p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors",
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
            value === o.value ? "bg-p-surface text-p-ink shadow-[var(--p-shadow)]" : "text-p-ink-3 hover:text-p-ink",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Dialog on desktop, bottom sheet on phones. Closes on Escape and backdrop. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  closeLabel?: string;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const host = useSheetHost();
  useEffect(() => {
    if (!open || !host) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose, host]);
  if (!open || !host) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="animate-fade absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "animate-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-p-line bg-p-surface shadow-[var(--p-shadow-lg)] sm:rounded-3xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-p-line px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <IconButton label={closeLabel} size="sm" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="thin-scroll overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-p-line px-5 py-3">{footer}</div> : null}
      </div>
    </div>,
    host,
  );
}

const noSubscribe = () => () => {};

/**
 * Sheets render at the top of the portal, outside whatever opened them, so a faded card or a
 * transformed panel never shows through. The theme lives on the .portal element, so they go there.
 */
function useSheetHost() {
  return useSyncExternalStore(
    noSubscribe,
    () => document.querySelector<HTMLElement>(".portal") ?? document.body,
    () => null,
  );
}

/** Small anchored menu. Click outside or Escape closes it. */
export function Popover({
  open,
  onClose,
  children,
  className,
  align = "end",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "animate-fade absolute top-full z-40 mt-2 min-w-56 rounded-2xl border border-p-line bg-p-surface p-1.5 shadow-[var(--p-shadow-lg)]",
        align === "end" ? "end-0" : "start-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  active,
  danger,
  hint,
  disabled,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start text-sm transition-colors disabled:opacity-45",
        active ? "bg-p-brand-soft text-p-brand" : danger ? "text-p-danger hover:bg-p-danger-soft" : "text-p-ink hover:bg-p-sunken",
      )}
    >
      {icon ? <span className="grid size-5 place-items-center text-current opacity-80">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint ? <span className="text-xs text-p-ink-3">{hint}</span> : null}
    </button>
  );
}

/** Search-as-you-type picker over a list. */
export function Combobox<T>({
  items,
  getKey,
  getLabel,
  getHint,
  onPick,
  placeholder,
  emptyText,
  createLabel,
  onCreate,
  autoFocus,
}: {
  items: readonly T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getHint?: (item: T) => string | null | undefined;
  onPick: (item: T) => void;
  placeholder: string;
  emptyText: string;
  createLabel?: (query: string) => string;
  onCreate?: (query: string) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const normal = (s: string) => s.replace(/[‌\s]+/g, " ").replace(/ي/g, "ی").replace(/ك/g, "ک").trim().toLowerCase();
  const q = normal(query);
  const results = (q ? items.filter((i) => normal(`${getLabel(i)} ${getHint?.(i) ?? ""}`).includes(q)) : items).slice(0, 40);
  const canCreate = Boolean(onCreate && q && !results.some((r) => normal(getLabel(r)) === q));
  const total = results.length + (canCreate ? 1 : 0);
  const choose = (index: number) => {
    if (index < results.length) onPick(results[index]);
    else if (canCreate) onCreate?.(query.trim());
  };
  return (
    <div className="grid gap-2">
      <Input
        autoFocus={autoFocus}
        value={query}
        placeholder={placeholder}
        role="combobox"
        aria-expanded
        aria-controls={listId}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(total - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter" && total > 0) {
            e.preventDefault();
            choose(active);
          }
        }}
      />
      <div id={listId} role="listbox" className="thin-scroll max-h-72 overflow-y-auto rounded-xl border border-p-line">
        {results.map((item, index) => (
          <button
            key={getKey(item)}
            type="button"
            role="option"
            aria-selected={index === active}
            onMouseEnter={() => setActive(index)}
            onClick={() => choose(index)}
            className={cn(
              "flex w-full items-center justify-between gap-3 border-b border-p-line px-3 py-2.5 text-start text-sm last:border-0",
              index === active ? "bg-p-brand-soft" : "hover:bg-p-surface-2",
            )}
          >
            <span className="min-w-0 truncate font-medium">{getLabel(item)}</span>
            {getHint?.(item) ? <span className="shrink-0 text-xs text-p-ink-3">{getHint(item)}</span> : null}
          </button>
        ))}
        {canCreate ? (
          <button
            type="button"
            role="option"
            aria-selected={active === results.length}
            onClick={() => choose(results.length)}
            className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm font-medium text-p-brand", active === results.length ? "bg-p-brand-soft" : "hover:bg-p-surface-2")}
          >
            {createLabel?.(query.trim())}
          </button>
        ) : null}
        {total === 0 ? <p className="px-3 py-6 text-center text-sm text-p-ink-3">{emptyText}</p> : null}
      </div>
    </div>
  );
}
