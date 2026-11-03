// Text, number and date helpers for Aratta's hand-made Persian spreadsheets.

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Unify Arabic/Persian letters and digits and collapse whitespace. */
export function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[‎‏‪-‮]/g, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable key for de-duplicating company names typed slightly differently. */
export function companyKey(name) {
  return normalizeText(name)
    .replace(/‌/g, "")
    .replace(/^(شرکت|شركت|گروه)\s+/u, "")
    .replace(/[()[\]{}«»"'.,،؛:_\-–—/\\|*+]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** Plain value of an exceljs cell (rich text, formulas, hyperlinks, dates). */
export function cellValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((r) => r.text).join("");
    if ("result" in value) return cellValue(value.result);
    if ("text" in value) return cellValue(value.text);
    if ("error" in value) return null;
    return null;
  }
  return value;
}

export function cellText(value) {
  const v = cellValue(value);
  if (v === null) return "";
  if (v instanceof Date) return v.toISOString();
  return normalizeText(v);
}

/**
 * Money and quantities: accepts numbers, "4,032,600,000", "2.000.000",
 * "60 میلیون" and "1.5 میلیارد". Returns null when nothing numeric is found.
 */
export function parseAmount(value) {
  const v = cellValue(value);
  if (v === null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const text = normalizeText(v);
  const scale = /میلیارد/.test(text) ? 1e9 : /میلیون/.test(text) ? 1e6 : /هزار/.test(text) ? 1e3 : 1;
  const match = text.match(/-?\d[\d.,٬]*/);
  if (!match) return null;
  let digits = match[0].replace(/٬/g, ",");
  const groups = digits.split(/[.,]/);
  const looksGrouped = groups.length > 2 || (groups.length === 2 && groups[1].length === 3 && scale === 1);
  digits = looksGrouped ? groups.join("") : digits.replace(",", ".");
  const n = Number(digits);
  return Number.isFinite(n) ? n * scale : null;
}

/** Iranian mobile and landline numbers found inside free text. */
export function extractPhones(value) {
  const text = normalizeText(cellValue(value) ?? "");
  const found = [];
  for (const raw of text.match(/\+?\d[\d\s-]{6,}\d/g) ?? []) {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("98") && digits.length === 12) digits = `0${digits.slice(2)}`;
    if (/^9\d{9}$/.test(digits)) digits = `0${digits}`;
    if (/^[1-8]\d{9}$/.test(digits)) digits = `0${digits}`;
    if (digits.length >= 8 && digits.length <= 11) found.push(digits);
  }
  return [...new Set(found)];
}

/** Text left after removing phone numbers, e.g. a contact's name. */
export function stripPhones(value) {
  return normalizeText(normalizeText(cellValue(value) ?? "").replace(/\+?\d[\d\s-]{6,}\d/g, " "));
}

// --- Jalali (Solar Hijri) calendar -----------------------------------------

export const jalaliMonths = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

/** Convert a Jalali date to a Gregorian {year, month, day}. */
export function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days =
    -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > monthDays[gm]; gm++) gd -= monthDays[gm];
  return { year: gy, month: gm, day: gd };
}

/**
 * Finds a Jalali date in free text: "1402/05/28", "19تیر", "سه شنبه _ 1 مهر".
 * `defaultYear` fills in dates written without a year. Returns an ISO string
 * (Tehran time, +03:30) or null.
 */
export function parseJalaliDate(value, defaultYear) {
  const v = cellValue(value);
  if (v instanceof Date) return v.toISOString();
  const text = normalizeText(v ?? "");
  if (!text) return null;
  let y;
  let m;
  let d;
  const numeric = text.match(/(1[34]\d{2})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (numeric) {
    [y, m, d] = [Number(numeric[1]), Number(numeric[2]), Number(numeric[3])];
  } else {
    const monthIndex = jalaliMonths.findIndex((name) => text.includes(name));
    if (monthIndex === -1) return null;
    const near = text.match(new RegExp(`(\\d{1,2})\\s*${jalaliMonths[monthIndex]}`));
    if (!near) return null;
    [m, d] = [monthIndex + 1, Number(near[1])];
    const year = text.match(/\b(1[34]\d{2})\b/);
    y = year ? Number(year[1]) : defaultYear;
  }
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const g = jalaliToGregorian(y, m, d);
  const time = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const hh = time ? time[1].padStart(2, "0") : "09";
  const mm = time ? time[2] : "00";
  const pad = (n) => String(n).padStart(2, "0");
  return new Date(`${g.year}-${pad(g.month)}-${pad(g.day)}T${hh}:${mm}:00+03:30`).toISOString();
}
