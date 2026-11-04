/**
 * Persian (Jalali, solar hijri) calendar maths. Dates are stored as plain
 * Gregorian days (yyyy-mm-dd) everywhere; this only converts for display and
 * for the date picker. Algorithm: the 33-year break table used by jalaali-js
 * (Borkowski), valid for Jalali years -61 to 3177.
 */

export type DayParts = { y: number; m: number; d: number };

const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

const div = (a: number, b: number) => Math.trunc(a / b);
const mod = (a: number, b: number) => a - Math.trunc(a / b) * b;

function jalCal(jy: number) {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;
  if (jy < jp || jy >= breaks[breaks.length - 1]) throw new RangeError(`Jalali year ${jy} is out of range`);
  for (let i = 1; i < breaks.length; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

/** Julian day number of a Gregorian date. */
function g2d(gy: number, gm: number, gd: number) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): DayParts {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const d = div(mod(i, 153), 5) + 1;
  const m = mod(div(i, 153), 12) + 1;
  const y = div(j, 1461) - 100100 + div(8 - m, 6);
  return { y, m, d };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): DayParts {
  const gy = d2g(jdn).y;
  let jy = gy - 621;
  const r = jalCal(jy);
  const start = g2d(gy, 3, r.march);
  let k = jdn - start;
  if (k >= 0) {
    if (k <= 185) return { y: jy, m: 1 + div(k, 31), d: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { y: jy, m: 7 + div(k, 30), d: mod(k, 30) + 1 };
}

export function toJalali(g: DayParts): DayParts {
  return d2j(g2d(g.y, g.m, g.d));
}

export function toGregorian(j: DayParts): DayParts {
  return d2g(j2d(j.y, j.m, j.d));
}

export function isJalaliLeapYear(jy: number) {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy: number, jm: number) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function gregorianMonthLength(gy: number, gm: number) {
  return new Date(Date.UTC(gy, gm, 0)).getUTCDate();
}

const pad = (n: number) => String(n).padStart(2, "0");

export function partsToIso(g: DayParts) {
  return `${String(g.y).padStart(4, "0")}-${pad(g.m)}-${pad(g.d)}`;
}

/** Reads "yyyy-mm-dd" (or the date part of an ISO timestamp). */
export function isoToParts(iso: string | null | undefined): DayParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!match) return null;
  const parts = { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  if (parts.m < 1 || parts.m > 12 || parts.d < 1 || parts.d > gregorianMonthLength(parts.y, parts.m)) return null;
  return parts;
}

export function isoToJalali(iso: string | null | undefined) {
  const g = isoToParts(iso);
  return g ? toJalali(g) : null;
}

export function jalaliToIso(j: DayParts) {
  return partsToIso(toGregorian(j));
}

/** 0 = Saturday … 6 = Friday: the column of a day in an Iranian week. */
export function persianWeekColumn(g: DayParts) {
  return (new Date(Date.UTC(g.y, g.m - 1, g.d)).getUTCDay() + 1) % 7;
}

/** 0 = Sunday … 6 = Saturday. */
export function gregorianWeekColumn(g: DayParts) {
  return new Date(Date.UTC(g.y, g.m - 1, g.d)).getUTCDay();
}

/** Today in the browser's own time zone, as yyyy-mm-dd. */
export function todayIso(now = new Date()) {
  return partsToIso({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}

export const jalaliMonths = {
  fa: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"],
  en: ["Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar", "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"],
} as const;

export const gregorianMonths = {
  fa: ["ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن", "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
} as const;

/** Saturday-first for the Persian calendar, Sunday-first for the Gregorian one. */
export const weekdayInitials = {
  persian: { fa: ["ش", "ی", "د", "س", "چ", "پ", "ج"], en: ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"] },
  gregorian: { fa: ["ی", "د", "س", "چ", "پ", "ج", "ش"], en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] },
} as const;

export type CalendarSystem = "persian" | "gregorian";

/** One month laid out as weeks: null cells pad the first and last rows. */
export function monthGrid(system: CalendarSystem, year: number, month: number) {
  const length = system === "persian" ? jalaliMonthLength(year, month) : gregorianMonthLength(year, month);
  const first = system === "persian" ? toGregorian({ y: year, m: month, d: 1 }) : { y: year, m: month, d: 1 };
  const offset = system === "persian" ? persianWeekColumn(first) : gregorianWeekColumn(first);
  const cells: Array<{ day: number; iso: string } | null> = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= length; day += 1) {
    const g = system === "persian" ? toGregorian({ y: year, m: month, d: day }) : { y: year, m: month, d: day };
    cells.push({ day, iso: partsToIso(g) });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** Year and month of a stored day in the chosen calendar. */
export function viewOf(system: CalendarSystem, iso: string) {
  const g = isoToParts(iso) ?? isoToParts(todayIso())!;
  const p = system === "persian" ? toJalali(g) : g;
  return { year: p.y, month: p.m };
}

export function shiftMonth(view: { year: number; month: number }, delta: number) {
  const index = view.year * 12 + (view.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}
