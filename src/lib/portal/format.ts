import type { Lang } from "@/lib/lang";

const locales: Record<Lang, string> = { fa: "fa-IR", en: "en-US" };
const dateLocales: Record<Lang, string> = { fa: "fa-IR-u-ca-persian", en: "en-GB" };

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>();
function memo<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>(key: string, make: () => T): T {
  let f = cache.get(key) as T | undefined;
  if (!f) {
    f = make();
    cache.set(key, f);
  }
  return f;
}

export function num(lang: Lang, value: number, digits = 0) {
  return memo(`n:${lang}:${digits}`, () =>
    new Intl.NumberFormat(locales[lang], { maximumFractionDigits: digits }),
  ).format(value);
}

export function compact(lang: Lang, value: number) {
  return memo(`c:${lang}`, () =>
    new Intl.NumberFormat(locales[lang], { notation: "compact", maximumFractionDigits: 1 }),
  ).format(value);
}

export function percent(lang: Lang, share: number) {
  return memo(`p:${lang}`, () => new Intl.NumberFormat(locales[lang], { style: "percent", maximumFractionDigits: 0 })).format(
    share,
  );
}

const currencyNames: Record<string, Record<Lang, string>> = {
  IRR: { fa: "ریال", en: "IRR" },
  IRT: { fa: "تومان", en: "Toman" },
  USD: { fa: "دلار", en: "USD" },
  EUR: { fa: "یورو", en: "EUR" },
  AED: { fa: "درهم", en: "AED" },
};

export function currencyName(lang: Lang, currency: string) {
  return currencyNames[currency]?.[lang] ?? currency;
}

/** "12.5 B IRR" style: compact for dashboards. */
export function moneyCompact(lang: Lang, value: number, currency: string) {
  return `${compact(lang, value)} ${currencyName(lang, currency)}`;
}

/** Full amount with grouping, for panels and invoices. */
export function money(lang: Lang, value: number, currency: string) {
  return `${num(lang, value)} ${currencyName(lang, currency)}`;
}

export function area(lang: Lang, m2: number) {
  return `${num(lang, m2, 1)} ${lang === "fa" ? "متر" : "m²"}`;
}

function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  // Plain dates (yyyy-mm-dd) are calendar days; read them at local noon so the
  // day doesn't shift with the time zone.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
}

export function date(lang: Lang, value: string | Date | null | undefined, style: "short" | "medium" | "long" = "medium") {
  if (!value) return "";
  const options: Intl.DateTimeFormatOptions =
    style === "short" ? { day: "numeric", month: "short" } : style === "long" ? { dateStyle: "full" } : { dateStyle: "medium" };
  return memo(`d:${lang}:${style}`, () => new Intl.DateTimeFormat(dateLocales[lang], options)).format(toDate(value));
}

export function time(lang: Lang, value: string | Date) {
  return memo(`t:${lang}`, () => new Intl.DateTimeFormat(dateLocales[lang], { hour: "2-digit", minute: "2-digit" })).format(
    toDate(value),
  );
}

const DAY = 86_400_000;

/** Whole days from today to the given day (negative = in the past). */
export function daysUntil(value: string | Date, now = new Date()) {
  const d = toDate(value);
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / DAY);
}

export function relativeDays(lang: Lang, value: string | Date, now = new Date()) {
  const days = daysUntil(value, now);
  return memo(`r:${lang}`, () => new Intl.RelativeTimeFormat(lang, { numeric: "auto" })).format(days, "day");
}

export function relativeTime(lang: Lang, value: string | Date, now = new Date()) {
  const diff = toDate(value).getTime() - now.getTime();
  const rtf = memo(`rt:${lang}`, () => new Intl.RelativeTimeFormat(lang, { numeric: "auto" }));
  const abs = Math.abs(diff);
  if (abs < 60_000) return rtf.format(0, "minute");
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < DAY) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / DAY), "day");
}

/** Pick the language's name with a fallback to the other one. */
export function pick(lang: Lang, fa: string | null | undefined, en: string | null | undefined) {
  return (lang === "en" ? en || fa : fa || en) ?? "";
}

/**
 * The separator between short facts on one line. Persian uses its comma: a middle dot before a
 * Persian digit is drawn on the wrong side of it and reads as a zero ("۱۰" instead of "· ۱").
 */
export function sep(lang: Lang) {
  return lang === "fa" ? "، " : " · ";
}
