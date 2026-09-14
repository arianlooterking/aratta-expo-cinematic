export type StaffCalendarSystem = "gregorian" | "persian";

export type StaffCalendarDateParts = {
  year: number;
  month: number;
  day: number;
};

const persianMonthNames = {
  fa: [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ],
  en: [
    "Farvardin",
    "Ordibehesht",
    "Khordad",
    "Tir",
    "Mordad",
    "Shahrivar",
    "Mehr",
    "Aban",
    "Azar",
    "Dey",
    "Bahman",
    "Esfand",
  ],
} as const;

function isoDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new RangeError("Calendar date must use YYYY-MM-DD.");
  return date;
}

function numericPart(
  parts: Intl.DateTimeFormatPart[],
  type: "year" | "month" | "day",
) {
  const value = Number(parts.find((part) => part.type === type)?.value);
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`Calendar ${type} could not be resolved.`);
  }
  return value;
}

export function getStaffCalendarDateParts(
  value: string,
  system: StaffCalendarSystem,
): StaffCalendarDateParts {
  if (system === "gregorian") {
    const [year, month, day] = value.split("-").map(Number);
    if (![year, month, day].every((part) => Number.isInteger(part) && part > 0)) {
      throw new RangeError("Calendar date must use YYYY-MM-DD.");
    }
    return { year, month, day };
  }

  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).formatToParts(isoDate(value));
  return {
    year: numericPart(parts, "year"),
    month: numericPart(parts, "month"),
    day: numericPart(parts, "day"),
  };
}

export function getStaffCalendarYear(value: string, system: StaffCalendarSystem) {
  return getStaffCalendarDateParts(value, system).year;
}

export function getStaffCalendarMonthName(
  monthIndex: number,
  system: StaffCalendarSystem,
  locale: "fa" | "en",
) {
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new RangeError("Calendar month index must be between 0 and 11.");
  }
  if (system === "persian") return persianMonthNames[locale][monthIndex];
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-ca-gregory" : "en-GB", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, monthIndex, 15)));
}

export function formatStaffCalendarDate(
  value: string,
  system: StaffCalendarSystem,
  locale: "fa" | "en",
) {
  const formatterLocale =
    system === "persian"
      ? locale === "fa"
        ? "fa-IR-u-ca-persian"
        : "en-US-u-ca-persian"
      : locale === "fa"
        ? "fa-IR-u-ca-gregory"
        : "en-GB";
  return new Intl.DateTimeFormat(formatterLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(isoDate(value));
}

function monthSerial(parts: StaffCalendarDateParts) {
  return parts.year * 12 + parts.month - 1;
}

export function staffCalendarYearOverlaps(
  startDate: string,
  endDate: string,
  year: number,
  system: StaffCalendarSystem,
) {
  const start = getStaffCalendarDateParts(startDate, system);
  const end = getStaffCalendarDateParts(endDate, system);
  return start.year <= year && end.year >= year;
}

export function staffCalendarMonthOverlaps(
  startDate: string,
  endDate: string,
  year: number,
  monthIndex: number,
  system: StaffCalendarSystem,
) {
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return false;
  const target = year * 12 + monthIndex;
  return (
    monthSerial(getStaffCalendarDateParts(startDate, system)) <= target &&
    monthSerial(getStaffCalendarDateParts(endDate, system)) >= target
  );
}
